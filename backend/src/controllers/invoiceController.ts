import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit, notifyUser } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * Generate unique Invoice Number format: INV-YYYY-XXXX
 */
const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  });

  let seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  
  // Verify uniqueness in case of gap or deleted items
  while (await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } })) {
    seq++;
    candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * GET /api/invoices
 */
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Member tidak memiliki izin mengakses data invoice.',
      });
    }

    const { projectId, clientId, status, search } = req.query;
    const where: any = {};
    if (projectId) where.projectId = String(projectId);
    if (clientId) where.clientId = String(clientId);
    if (status) where.status = String(status);

    if (search) {
      const queryStr = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: queryStr } },
        { project: { name: { contains: queryStr } } },
        { client: { companyName: { contains: queryStr } } },
      ];
    }

    // CLIENT: Only see invoices for client's own projects
    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile) {
        where.clientId = clientProfile.id;
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, projectCode: true, contractValue: true },
        },
        client: {
          select: { id: true, companyName: true, contactPerson: true, email: true, phone: true },
        },
        milestone: {
          select: { id: true, name: true, progressRequirement: true, amount: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Automatically evaluate overdue status for unpaid invoices past due date
    const now = new Date();
    const processedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        if (
          inv.status !== 'PAID' &&
          inv.status !== 'CANCELLED' &&
          inv.status !== 'OVERDUE' &&
          new Date(inv.dueDate) < now
        ) {
          // Auto-update to OVERDUE in database
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'OVERDUE' },
          });
          return { ...inv, status: 'OVERDUE' };
        }
        return inv;
      })
    );

    return res.json({ success: true, data: processedInvoices });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/invoices/:id
 */
export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'MEMBER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true, contractValue: true },
        },
        client: true,
        milestone: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (!clientProfile || invoice.clientId !== clientProfile.id) {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Invoice milik client lain.' });
      }
    }

    return res.json({ success: true, data: invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/invoices
 */
export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak untuk membuat invoice.',
      });
    }

    const {
      projectId,
      clientId,
      milestoneId,
      invoiceNumber,
      amount,
      subtotal: rawSubtotal,
      taxRate: rawTaxRate,
      issueDate,
      dueDate,
      status,
      notes,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Proyek wajib dipilih.' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    const targetClientId = clientId || project.clientId;
    const client = await prisma.client.findUnique({ where: { id: targetClientId } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Klien tidak ditemukan.' });
    }

    // Milestone Duplicate invoice check
    if (milestoneId) {
      const existingMilestoneInvoice = await prisma.invoice.findFirst({
        where: {
          milestoneId,
          status: { notIn: ['CANCELLED'] },
        },
      });

      if (existingMilestoneInvoice) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_MILESTONE_INVOICE',
          message: `Milestone ini sudah memiliki invoice (${existingMilestoneInvoice.invoiceNumber}) yang aktif.`,
        });
      }
    }

    // Generate or validate invoice number
    let finalInvNumber = (invoiceNumber || '').trim();
    if (!finalInvNumber) {
      finalInvNumber = await generateInvoiceNumber();
    } else {
      const dup = await prisma.invoice.findUnique({ where: { invoiceNumber: finalInvNumber } });
      if (dup) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_INVOICE_NUMBER',
          message: `Nomor invoice "${finalInvNumber}" sudah digunakan.`,
        });
      }
    }

    // Financial tax calculations
    const subtotal = parseFloat(rawSubtotal !== undefined ? rawSubtotal : (amount || 0));
    const taxRate = parseFloat(rawTaxRate || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        clientId: targetClientId,
        milestoneId: milestoneId || null,
        invoiceNumber: finalInvNumber,
        amount: subtotal,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        issueDate: new Date(issueDate || Date.now()),
        dueDate: new Date(dueDate),
        status: status || 'DRAFT',
        notes: notes ? notes.trim() : null,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        client: { select: { id: true, companyName: true, contactPerson: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    // Update milestone status if attached
    if (milestoneId) {
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: { status: 'INVOICED' },
      });
    }

    await logAudit(req.user!.id, 'INVOICE_CREATED', 'INVOICE', invoice.id, null, invoice.invoiceNumber);

    return res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/invoices/:id
 */
export const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const {
      amount,
      subtotal: rawSubtotal,
      taxRate: rawTaxRate,
      issueDate,
      dueDate,
      status,
      notes,
      milestoneId,
    } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const subtotal = parseFloat(rawSubtotal !== undefined ? rawSubtotal : (amount !== undefined ? amount : existing.subtotal));
    const taxRate = parseFloat(rawTaxRate !== undefined ? rawTaxRate : existing.taxRate);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        milestoneId: milestoneId !== undefined ? (milestoneId || null) : existing.milestoneId,
        amount: subtotal,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        status: status !== undefined ? status : existing.status,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        client: { select: { id: true, companyName: true, contactPerson: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    await logAudit(req.user!.id, 'INVOICE_UPDATED', 'INVOICE', id, existing.status, updated.status);

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/invoices/:id/send
 */
export const sendInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, project: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
      include: { client: true, project: true },
    });

    await logAudit(req.user!.id, 'INVOICE_SENT', 'INVOICE', id, existing.status, 'SENT');

    // Send notification if client user exists
    if (existing.client.email) {
      const clientUser = await prisma.user.findFirst({ where: { email: existing.client.email } });
      if (clientUser) {
        await notifyUser(
          clientUser.id,
          'INVOICE_DUE',
          `Invoice Baru #${existing.invoiceNumber}`,
          `Invoice #${existing.invoiceNumber} sebesar Rp${existing.totalAmount.toLocaleString('id-ID')} untuk proyek ${existing.project.name} telah diterbitkan dan dapat diunduh.`
        );
      }
    }

    return res.json({ success: true, message: `Invoice ${existing.invoiceNumber} berhasil dikirim.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/invoices/:id/status
 */
export const updateInvoiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya OWNER dan FINANCE yang dapat mengubah status invoice.',
      });
    }

    const id = req.params.id as string;
    const { status } = req.body;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    await logAudit(req.user!.id, 'INVOICE_STATUS_CHANGE', 'INVOICE', id, null, status);

    return res.json({ success: true, data: invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/invoices/:id
 */
export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER dan FINANCE yang dapat menghapus invoice.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    if (existing.payments && existing.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ini tidak dapat dihapus karena sudah terdapat pencatatan pembayaran.',
      });
    }

    await prisma.invoice.delete({ where: { id } });
    await logAudit(req.user!.id, 'INVOICE_DELETED', 'INVOICE', id, existing.invoiceNumber, null);

    return res.json({ success: true, message: 'Invoice berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Record Payment
 */
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Pengelolaan pembayaran hanya dapat dilakukan oleh FINANCE atau OWNER.',
      });
    }

    const { invoiceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate || Date.now()),
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        notes: notes ? notes.trim() : null,
        createdById: req.user!.id,
      },
    });

    const totalPayments = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      const paidSum = totalPayments._sum.amount || 0;
      let newStatus = invoice.status;
      const targetTotal = invoice.totalAmount > 0 ? invoice.totalAmount : invoice.amount;
      
      if (paidSum >= targetTotal) {
        newStatus = 'PAID';
      } else if (paidSum > 0) {
        newStatus = 'PARTIAL';
      }

      if (newStatus !== invoice.status) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: newStatus },
        });
      }
    }

    await logAudit(req.user!.id, 'PAYMENT_RECORDED', 'PAYMENT', payment.id, null, String(amount));

    return res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
