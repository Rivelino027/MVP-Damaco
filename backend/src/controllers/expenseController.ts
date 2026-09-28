import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * GET /api/expenses
 */
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak diperbolehkan melihat rincian pengeluaran internal (expenses).',
      });
    }

    const { projectId, phaseId, category, status, search } = req.query;
    const where: any = {};

    // MEMBER can only see their own submitted expenses if no specific project is selected
    if (role === 'MEMBER' && req.user?.id && !projectId) {
      where.submittedById = req.user.id;
    }

    if (projectId) where.projectId = String(projectId);
    if (phaseId) where.phaseId = String(phaseId);
    if (category && category !== 'ALL') where.category = String(category);
    if (status && status !== 'ALL') where.status = String(status);

    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      where.OR = [
        { description: { contains: q } },
        { category: { contains: q } },
        { submittedBy: { name: { contains: q } } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        phase: {
          select: { id: true, name: true, project: { select: { id: true, name: true, projectCode: true } } },
        },
        task: {
          select: { id: true, title: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true, projectCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: expenses });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/expenses/:id
 */
export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        phase: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        approvedBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Pengeluaran (expense) tidak ditemukan.' });
    }

    return res.json({ success: true, data: expense });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/expenses
 */
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak memiliki akses untuk membuat pengeluaran.',
      });
    }

    const { projectId, phaseId, taskId, category, description, amount, expenseDate, receiptPath, status: customStatus } = req.body;
    const userId = req.user!.id;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pengeluaran (amount) harus berupa angka positif lebih dari 0.' });
    }

    let targetProjectId = projectId;
    let targetPhaseId = phaseId;

    // Auto derive phaseId and projectId from task if missing
    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) {
        targetPhaseId = targetPhaseId || task.phaseId;
        targetProjectId = targetProjectId || task.projectId;
      }
    }

    // Auto derive projectId from phase if missing
    if (targetPhaseId && !targetProjectId) {
      const phase = await prisma.wbsPhase.findUnique({ where: { id: targetPhaseId } });
      if (phase) {
        targetProjectId = phase.projectId;
      }
    }

    if (!targetProjectId) {
      return res.status(400).json({ success: false, message: 'Project wajib dipilih.' });
    }

    if (!targetPhaseId) {
      // Find or create default phase if not provided
      let defaultPhase = await prisma.wbsPhase.findFirst({ where: { projectId: targetProjectId } });
      if (!defaultPhase) {
        defaultPhase = await prisma.wbsPhase.create({
          data: {
            projectId: targetProjectId,
            name: 'General Phase',
            description: 'Fase default proyek',
            budgetAmount: 0,
            status: 'IN_PROGRESS',
          },
        });
      }
      targetPhaseId = defaultPhase.id;
    }

    // Default status: SUBMITTED for MEMBER, APPROVED for PM/FINANCE/OWNER unless customStatus provided
    let status = customStatus || ((role === 'MEMBER') ? 'SUBMITTED' : 'APPROVED');

    const expense = await prisma.expense.create({
      data: {
        projectId: targetProjectId,
        phaseId: targetPhaseId,
        taskId: taskId || null,
        submittedById: userId,
        category: category || 'OTHER',
        description: description ? description.trim() : null,
        amount: amountNum,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        receiptPath: receiptPath || null,
        status,
        approvedById: status === 'APPROVED' ? userId : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Audit trail
    await logAudit(
      userId,
      'EXPENSE_CREATED',
      'EXPENSE',
      expense.id,
      null,
      `Kategori: ${category}, Nominal: Rp${amountNum.toLocaleString('id-ID')}, Status: ${status}`
    );

    return res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/expenses/:id
 */
export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const id = req.params.id as string;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pengeluaran (expense) tidak ditemukan.' });
    }

    // MEMBER can only edit their own submitted expense if status is DRAFT or SUBMITTED
    if (role === 'MEMBER' && (existing.submittedById !== userId || (existing.status !== 'DRAFT' && existing.status !== 'SUBMITTED'))) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'MEMBER hanya dapat mengedit pengeluaran milik sendiri yang belum disetujui.',
      });
    }

    const { projectId, phaseId, taskId, category, description, amount, expenseDate, receiptPath, status } = req.body;

    let amountNum = existing.amount;
    if (amount !== undefined) {
      amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ success: false, message: 'Nominal pengeluaran (amount) harus berupa angka positif lebih dari 0.' });
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        projectId: projectId || existing.projectId,
        phaseId: phaseId || existing.phaseId,
        taskId: taskId !== undefined ? (taskId || null) : existing.taskId,
        category: category || existing.category,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        amount: amountNum,
        expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
        receiptPath: receiptPath !== undefined ? receiptPath : existing.receiptPath,
        status: status !== undefined ? status : existing.status,
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/expenses/:id/status
 */
export const updateExpenseStatus = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'MEMBER' || role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Pengsetujuan (approval) pengeluaran hanya dapat dilakukan oleh PM, FINANCE, atau OWNER.',
      });
    }

    const id = req.params.id as string;
    const { status } = req.body; // APPROVED, REJECTED, PAID, SUBMITTED

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        status,
        approvedById: (status === 'APPROVED' || status === 'PAID') ? req.user!.id : null,
        approvedAt: (status === 'APPROVED' || status === 'PAID') ? new Date() : null,
        paidAt: status === 'PAID' ? new Date() : undefined,
      },
    });

    return res.json({ success: true, data: expense });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/expenses/:id
 */
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const id = req.params.id as string;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pengeluaran (expense) tidak ditemukan.' });
    }

    if (role === 'MEMBER' && (existing.submittedById !== userId || (existing.status !== 'DRAFT' && existing.status !== 'SUBMITTED'))) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'MEMBER hanya dapat menghapus pengeluaran milik sendiri yang belum disetujui.',
      });
    }

    await prisma.expense.delete({ where: { id } });

    return res.json({ success: true, message: 'Pengeluaran berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
