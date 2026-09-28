import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit, notifyUser } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * Generate unique Payment Number format: PAY-YYYY-XXXX
 */
const generatePaymentNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  
  const count = await prisma.payment.count({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
  });

  let seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  
  while (await prisma.payment.findFirst({ where: { paymentNumber: candidate } })) {
    seq++;
    candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * GET /api/payments
 */
export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Member tidak memiliki izin mengakses data pembayaran.',
      });
    }

    const { projectId, type, invoiceId, purchaseOrderId, search } = req.query;
    const where: any = {};

    if (projectId) where.projectId = String(projectId);
    if (type && type !== 'ALL') where.type = String(type);
    if (invoiceId) where.invoiceId = String(invoiceId);
    if (purchaseOrderId) where.purchaseOrderId = String(purchaseOrderId);

    if (search) {
      const queryStr = String(search).trim();
      where.OR = [
        { paymentNumber: { contains: queryStr } },
        { referenceNumber: { contains: queryStr } },
        { invoice: { invoiceNumber: { contains: queryStr } } },
        { purchaseOrder: { poNumber: { contains: queryStr } } },
      ];
    }

    // CLIENT: Only view CLIENT_PAYMENT for their own projects/invoices
    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile) {
        where.type = 'CLIENT_PAYMENT';
        where.invoice = { clientId: clientProfile.id };
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amount: true,
            client: { select: { companyName: true } },
            project: { select: { id: true, name: true, projectCode: true } },
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            vendorName: true,
            project: { select: { id: true, name: true } },
          },
        },
        expense: {
          select: { id: true, description: true, amount: true, category: true },
        },
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return res.json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payments/:id
 */
export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'MEMBER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: { include: { client: true, project: true } },
        purchaseOrder: { include: { project: true } },
        expense: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaksi pembayaran tidak ditemukan.' });
    }

    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (!clientProfile || !payment.invoice || payment.invoice.clientId !== clientProfile.id) {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Transaksi milik client lain.' });
      }
    }

    return res.json({ success: true, data: payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/payments
 */
export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Pengelolaan pembayaran hanya dapat dilakukan oleh OWNER atau FINANCE.',
      });
    }

    const {
      type: rawType,
      invoiceId,
      purchaseOrderId,
      expenseId,
      projectId: rawProjectId,
      amount: rawAmount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
    } = req.body;

    const amount = parseFloat(rawAmount || 0);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pembayaran harus lebih besar dari 0.' });
    }

    const type = rawType || (invoiceId ? 'CLIENT_PAYMENT' : 'VENDOR_PAYMENT');
    let targetProjectId = rawProjectId;

    // VALIDATION FOR CLIENT PAYMENT (Requirement #14)
    if (type === 'CLIENT_PAYMENT' && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice tidak ditemukan.' });
      }

      targetProjectId = invoice.projectId;

      const currentTotalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const invoiceTotal = invoice.totalAmount > 0 ? invoice.totalAmount : invoice.amount;
      const outstanding = Math.max(0, invoiceTotal - currentTotalPaid);

      // REQUIREMENT #14: Refuse payment exceeding outstanding amount!
      if (amount > outstanding + 0.01) {
        return res.status(400).json({
          success: false,
          code: 'PAYMENT_EXCEEDS_OUTSTANDING',
          message: `Nominal pembayaran (Rp ${amount.toLocaleString('id-ID')}) melebihi sisa tagihan invoice (Rp ${outstanding.toLocaleString('id-ID')}).`,
        });
      }
    } else if (type === 'VENDOR_PAYMENT') {
      if (purchaseOrderId) {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (po) targetProjectId = po.projectId;
      } else if (expenseId) {
        const exp = await prisma.expense.findUnique({ where: { id: expenseId } });
        if (exp) targetProjectId = exp.projectId;
      }
    }

    if (!targetProjectId) {
      return res.status(400).json({ success: false, message: 'Proyek terkait wajib ditentukan.' });
    }

    const paymentNumber = await generatePaymentNumber();

    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        type,
        invoiceId: invoiceId || null,
        purchaseOrderId: purchaseOrderId || null,
        expenseId: expenseId || null,
        projectId: targetProjectId,
        amount,
        paymentDate: new Date(paymentDate || Date.now()),
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        notes: notes ? notes.trim() : null,
        createdById: req.user!.id,
      },
    });

    // REQUIREMENT #15: INVOICE STATUS AUTOMATION
    if (type === 'CLIENT_PAYMENT' && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const targetTotal = invoice.totalAmount > 0 ? invoice.totalAmount : invoice.amount;

        let newStatus = invoice.status;
        if (totalPaid >= targetTotal) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL';
        }

        if (newStatus !== invoice.status) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: newStatus },
          });
        }
      }
    }

    // UPDATE PO / EXPENSE PAID STATUS
    if (type === 'VENDOR_PAYMENT') {
      if (purchaseOrderId) {
        await prisma.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: 'COMPLETED' },
        });
      }
      if (expenseId) {
        await prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
    }

    await logAudit(req.user!.id, 'PAYMENT_RECORDED', 'PAYMENT', payment.id, null, `${type}: ${amount}`);

    return res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/payments/:id
 */
export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER dan FINANCE yang dapat menghapus transaksi pembayaran.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.payment.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaksi pembayaran tidak ditemukan.' });
    }

    const { invoiceId, type } = existing;

    await prisma.payment.delete({ where: { id } });

    // Recalculate Invoice Status
    if (type === 'CLIENT_PAYMENT' && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const targetTotal = invoice.totalAmount > 0 ? invoice.totalAmount : invoice.amount;

        let newStatus = 'SENT';
        if (totalPaid >= targetTotal) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL';
        } else if (new Date(invoice.dueDate) < new Date()) {
          newStatus = 'OVERDUE';
        }

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: newStatus },
        });
      }
    }

    await logAudit(req.user!.id, 'PAYMENT_DELETED', 'PAYMENT', id, existing.paymentNumber || '', null);

    return res.json({ success: true, message: 'Transaksi pembayaran berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
