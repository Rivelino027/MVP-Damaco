import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit, notifyUser } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

export const getMilestones = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const { projectId, status } = req.query;
    const where: any = {};
    if (projectId) where.projectId = String(projectId);
    if (status) where.status = String(status);

    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile) {
        where.project = { clientId: clientProfile.id };
      }
    }

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectCode: true, contractValue: true, clientId: true } },
        invoices: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json({ success: true, data: milestones });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMilestoneById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectCode: true, contractValue: true } },
        invoices: true,
      },
    });

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone tidak ditemukan.' });
    }

    return res.json({ success: true, data: milestone });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, name, description, dueDate, progressRequirement, amount, billingType, status } = req.body;
    const userId = req.user!.id;

    if (!projectId || !name || !dueDate) {
      return res.status(400).json({ success: false, message: 'Proyek, Nama Milestone, dan Due Date wajib diisi.' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    const parsedProgress = parseFloat(progressRequirement || 100);
    const parsedAmount = amount !== undefined && amount !== null && amount !== '' 
      ? parseFloat(amount) 
      : (project.contractValue * (parsedProgress / 100));

    // Calculate sum of percentage of existing milestones for validation warning if PERCENTAGE
    const existingMilestones = await prisma.milestone.findMany({ where: { projectId } });
    const totalExistingPct = existingMilestones.reduce((sum, m) => sum + m.progressRequirement, 0);

    if (billingType === 'PERCENTAGE' && (totalExistingPct + parsedProgress > 100)) {
      return res.status(400).json({
        success: false,
        message: `Total persentase termin (${totalExistingPct + parsedProgress}%) melebihi 100% nilai proyek.`
      });
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name: name.trim(),
        description: description ? description.trim() : null,
        dueDate: new Date(dueDate),
        progressRequirement: parsedProgress,
        amount: parsedAmount,
        billingType: billingType || 'PERCENTAGE',
        status: status || 'UPCOMING',
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    await logAudit(userId, 'MILESTONE_CREATED', 'MILESTONE', milestone.id, null, name);

    return res.status(201).json({ success: true, data: milestone });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, dueDate, progressRequirement, amount, billingType, status } = req.body;
    const userId = req.user!.id;

    const existing = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Milestone tidak ditemukan.' });
    }

    const newStatus = status !== undefined ? status : existing.status;
    const newProgress = progressRequirement !== undefined ? parseFloat(progressRequirement) : existing.progressRequirement;
    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;

    if (billingType === 'PERCENTAGE' && progressRequirement !== undefined) {
      const existingMilestones = await prisma.milestone.findMany({
        where: { projectId: existing.projectId, id: { not: id } }
      });
      const totalOtherPct = existingMilestones.reduce((sum, m) => sum + m.progressRequirement, 0);
      if (totalOtherPct + newProgress > 100) {
        return res.status(400).json({
          success: false,
          message: `Total persentase termin (${totalOtherPct + newProgress}%) melebihi 100% nilai proyek.`
        });
      }
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        progressRequirement: newProgress,
        amount: newAmount,
        billingType: billingType !== undefined ? billingType : existing.billingType,
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? (existing.completedAt || new Date()) : null,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    await logAudit(userId, 'MILESTONE_UPDATED', 'MILESTONE', id, existing.status, newStatus);

    if (newStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
      const financeUsers = await prisma.user.findMany({
        where: { role: { name: 'FINANCE' } },
      });

      for (const finUser of financeUsers) {
        await notifyUser(
          finUser.id,
          'MILESTONE_COMPLETED',
          'Milestone Selesai - Invoice Siap Diterbitkan',
          `Milestone "${existing.name}" pada proyek ${existing.project.name} telah COMPLETED. Invoice penagihan dapat segera diterbitkan.`
        );
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMilestoneStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const userId = req.user!.id;

    const existing = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Milestone tidak ditemukan.' });
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    await logAudit(userId, 'MILESTONE_STATUS_CHANGE', 'MILESTONE', id, existing.status, status);

    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      const financeUsers = await prisma.user.findMany({
        where: { role: { name: 'FINANCE' } },
      });

      for (const finUser of financeUsers) {
        await notifyUser(
          finUser.id,
          'MILESTONE_COMPLETED',
          'Milestone Selesai - Invoice Siap Diterbitkan',
          `Milestone "${existing.name}" pada proyek ${existing.project.name} telah COMPLETED. Invoice penagihan dapat segera diterbitkan.`
        );
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const existing = await prisma.milestone.findUnique({
      where: { id },
      include: { invoices: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Milestone tidak ditemukan.' });
    }

    if (existing.invoices && existing.invoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Milestone ini tidak dapat dihapus karena sudah memiliki Invoice terkait.',
      });
    }

    await prisma.milestone.delete({ where: { id } });
    await logAudit(userId, 'MILESTONE_DELETED', 'MILESTONE', id, existing.name, null);

    return res.json({ success: true, message: 'Milestone berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
