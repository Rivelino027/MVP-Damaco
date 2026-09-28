import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit, notifyUser } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * Generate unique PO Number format: PO-YYYY-XXXX
 */
const generatePoNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  
  const count = await prisma.purchaseOrder.count({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
  });

  let seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  
  while (await prisma.purchaseOrder.findUnique({ where: { poNumber: candidate } })) {
    seq++;
    candidate = `${prefix}${String(seq).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * Recalculate committed budget amount for project
 */
const updateProjectCommittedBudget = async (projectId: string) => {
  const approvedPOs = await prisma.purchaseOrder.findMany({
    where: {
      projectId,
      status: 'APPROVED',
    },
  });

  const totalCommitted = approvedPOs.reduce((sum, po) => sum + po.totalAmount, 0);

  // Update budget committedAmount
  const existingBudget = await prisma.budget.findFirst({ where: { projectId } });
  if (existingBudget) {
    await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { committedAmount: totalCommitted },
    });
  }
};

/**
 * GET /api/purchase-orders
 */
export const getPurchaseOrders = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak diizinkan melihat data Purchase Order internal.',
      });
    }

    const { projectId, status, vendorId, search } = req.query;
    const where: any = {};
    if (projectId) where.projectId = String(projectId);
    if (status && status !== 'ALL') where.status = String(status);
    if (vendorId) where.vendorId = String(vendorId);

    if (search) {
      const queryStr = String(search).trim();
      where.OR = [
        { poNumber: { contains: queryStr } },
        { vendorName: { contains: queryStr } },
        { project: { name: { contains: queryStr } } },
      ];
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectCode: true, contractValue: true } },
        phase: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true, contactPerson: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        expenses: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: pos });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/purchase-orders/:id
 */
export const getPurchaseOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectCode: true, contractValue: true } },
        phase: true,
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        expenses: true,
        payments: true,
      },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
    }

    return res.json({ success: true, data: po });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/purchase-orders
 */
export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER, FINANCE, dan PM yang dapat membuat PO.' });
    }

    const {
      projectId,
      phaseId,
      vendorId,
      vendorName,
      poNumber,
      amount: rawAmount,
      taxRate: rawTaxRate,
      orderDate,
      expectedDate,
      description,
      notes,
      status,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Proyek wajib dipilih.' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    // Resolve vendor name
    let finalVendorName = (vendorName || '').trim();
    if (vendorId) {
      const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (v) finalVendorName = v.name;
    }
    if (!finalVendorName) {
      return res.status(400).json({ success: false, message: 'Nama vendor wajib diisi.' });
    }

    // Resolve unique PO Number
    let finalPoNum = (poNumber || '').trim();
    if (!finalPoNum) {
      finalPoNum = await generatePoNumber();
    } else {
      const dup = await prisma.purchaseOrder.findUnique({ where: { poNumber: finalPoNum } });
      if (dup) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_PO_NUMBER',
          message: `Nomor PO "${finalPoNum}" sudah digunakan.`,
        });
      }
    }

    const amount = parseFloat(rawAmount || req.body.totalAmount || 0);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal PO harus lebih dari 0.' });
    }

    const taxRate = parseFloat(rawTaxRate || 0);
    const taxAmount = amount * (taxRate / 100);
    const totalAmount = amount + taxAmount;

    const initialStatus = status || 'DRAFT';

    const po = await prisma.purchaseOrder.create({
      data: {
        projectId,
        phaseId: phaseId || null,
        vendorId: vendorId || null,
        vendorName: finalVendorName,
        poNumber: finalPoNum,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        description: description ? description.trim() : null,
        notes: notes ? notes.trim() : null,
        status: initialStatus,
        orderDate: new Date(orderDate || Date.now()),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        createdById: req.user!.id,
        approvedById: initialStatus === 'APPROVED' ? req.user!.id : null,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    if (initialStatus === 'APPROVED') {
      await updateProjectCommittedBudget(projectId);
    }

    await logAudit(req.user!.id, 'PO_CREATED', 'PURCHASE_ORDER', po.id, null, po.poNumber);

    return res.status(201).json({ success: true, data: po });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/purchase-orders/:id
 */
export const updatePurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const id = req.params.id as string;
    const {
      phaseId,
      vendorId,
      vendorName,
      amount: rawAmount,
      taxRate: rawTaxRate,
      orderDate,
      expectedDate,
      description,
      notes,
      status,
    } = req.body;

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
    }

    let finalVendorName = existing.vendorName;
    if (vendorId) {
      const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (v) finalVendorName = v.name;
    } else if (vendorName) {
      finalVendorName = vendorName.trim();
    }

    const amount = rawAmount !== undefined ? parseFloat(rawAmount) : existing.amount;
    const taxRate = rawTaxRate !== undefined ? parseFloat(rawTaxRate) : existing.taxRate;
    const taxAmount = amount * (taxRate / 100);
    const totalAmount = amount + taxAmount;
    const newStatus = status !== undefined ? status : existing.status;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        phaseId: phaseId !== undefined ? (phaseId || null) : existing.phaseId,
        vendorId: vendorId !== undefined ? (vendorId || null) : existing.vendorId,
        vendorName: finalVendorName,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        status: newStatus,
        orderDate: orderDate ? new Date(orderDate) : existing.orderDate,
        expectedDate: expectedDate ? new Date(expectedDate) : existing.expectedDate,
        approvedById: newStatus === 'APPROVED' ? (existing.approvedById || req.user!.id) : existing.approvedById,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    await updateProjectCommittedBudget(existing.projectId);
    await logAudit(req.user!.id, 'PO_UPDATED', 'PURCHASE_ORDER', id, existing.status, updated.status);

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/purchase-orders/:id/approve
 */
export const approvePurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER, FINANCE, dan PM yang dapat me-approve PO.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user!.id,
      },
    });

    await updateProjectCommittedBudget(existing.projectId);
    await logAudit(req.user!.id, 'PO_APPROVED', 'PURCHASE_ORDER', id, existing.status, 'APPROVED');

    // Send notification to creator
    await notifyUser(
      existing.createdById,
      'SYSTEM',
      `PO Approved #${existing.poNumber}`,
      `Purchase Order #${existing.poNumber} senilai Rp${existing.totalAmount.toLocaleString('id-ID')} telah disetujui (APPROVED).`
    );

    return res.json({ success: true, message: `PO ${existing.poNumber} berhasil disetujui!`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/purchase-orders/:id
 */
export const deletePurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER dan FINANCE yang dapat menghapus PO.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { expenses: true, payments: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
    }

    if (existing.payments && existing.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'PO ini tidak dapat dihapus karena sudah memiliki histori pembayaran vendor.',
      });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    await updateProjectCommittedBudget(existing.projectId);
    await logAudit(req.user!.id, 'PO_DELETED', 'PURCHASE_ORDER', id, existing.poNumber, null);

    return res.json({ success: true, message: 'Purchase Order berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
