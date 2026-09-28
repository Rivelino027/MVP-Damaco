import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * Helper to update progress of WbsPhase and Project automatically based on tasks
 */
export const updatePhaseAndProjectProgress = async (phaseId: String, projectId: String) => {
  try {
    if (phaseId) {
      const phaseTasks = await prisma.task.findMany({
        where: { phaseId: String(phaseId) },
      });
      if (phaseTasks.length > 0) {
        const totalProgress = phaseTasks.reduce((sum, t) => sum + (t.progressPercentage || 0), 0);
        const avgProgress = Math.round(totalProgress / phaseTasks.length);
        await prisma.wbsPhase.update({
          where: { id: String(phaseId) },
          data: { progressPercentage: avgProgress },
        });
      }
    }

    if (projectId) {
      const projectTasks = await prisma.task.findMany({
        where: { projectId: String(projectId) },
      });
      if (projectTasks.length > 0) {
        const totalProgress = projectTasks.reduce((sum, t) => sum + (t.progressPercentage || 0), 0);
        const avgProgress = Math.round(totalProgress / projectTasks.length);
        await prisma.project.update({
          where: { id: String(projectId) },
          data: { progressPercentage: avgProgress },
        });
      }
    }
  } catch (err) {
    console.error('Error updating phase/project progress:', err);
  }
};

/**
 * GET /api/wbs-phases
 */
export const getPhases = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const { projectId } = req.query;

    if (role === 'CLIENT') {
      // CLIENT can only see phases if they own the project
    }

    const where: any = {};
    if (projectId) {
      where.projectId = String(projectId);
    }

    const phases = await prisma.wbsPhase.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const isClient = role === 'CLIENT';

    const formattedPhases = phases.map((phase) => {
      const taskCount = phase.tasks.length;
      const completedTaskCount = phase.tasks.filter((t) => t.status === 'COMPLETED').length;

      return {
        id: phase.id,
        projectId: phase.projectId,
        name: phase.name,
        description: phase.description,
        sortOrder: phase.sortOrder,
        budgetAmount: isClient ? undefined : phase.budgetAmount,
        progressPercentage: phase.progressPercentage,
        status: phase.status,
        project: phase.project,
        taskCount,
        completedTaskCount,
        tasks: phase.tasks,
      };
    });

    return res.json({ success: true, data: formattedPhases });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wbs-phases/:id
 */
export const getPhaseById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const phase = await prisma.wbsPhase.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!phase) {
      return res.status(404).json({ success: false, message: 'WBS Phase tidak ditemukan.' });
    }

    return res.json({ success: true, data: phase });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wbs-phases
 */
export const createPhase = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan membuat WBS Phase.',
      });
    }

    const { projectId, name, description, budgetAmount, status, sortOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama Phase / WBS wajib diisi.' });
    }

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project wajib dipilih.' });
    }

    const budget = parseFloat(budgetAmount || 0);
    if (budget < 0) {
      return res.status(400).json({ success: false, message: 'Budget Phase tidak boleh negatif.' });
    }

    const phase = await prisma.wbsPhase.create({
      data: {
        projectId,
        name: name.trim(),
        description: description ? description.trim() : null,
        budgetAmount: budget,
        status: status || 'IN_PROGRESS',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        progressPercentage: 0,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        tasks: true,
      },
    });

    return res.status(201).json({ success: true, data: phase });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/wbs-phases/:id
 */
export const updatePhase = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan mengedit WBS Phase.',
      });
    }

    const id = req.params.id as string;
    const { name, description, budgetAmount, status, progressPercentage, sortOrder } = req.body;

    const existing = await prisma.wbsPhase.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'WBS Phase tidak ditemukan.' });
    }

    const budget = budgetAmount !== undefined ? parseFloat(budgetAmount) : existing.budgetAmount;
    if (budget < 0) {
      return res.status(400).json({ success: false, message: 'Budget Phase tidak boleh negatif.' });
    }

    const progress = progressPercentage !== undefined
      ? Math.max(0, Math.min(100, parseFloat(progressPercentage)))
      : existing.progressPercentage;

    const updated = await prisma.wbsPhase.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        budgetAmount: budget,
        status: status !== undefined ? status : existing.status,
        progressPercentage: progress,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        tasks: true,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/wbs-phases/:id
 */
export const deletePhase = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan menghapus WBS Phase.',
      });
    }

    const id = req.params.id as string;

    const phase = await prisma.wbsPhase.findUnique({
      where: { id },
      include: { tasks: true, expenses: true },
    });

    if (!phase) {
      return res.status(404).json({ success: false, message: 'WBS Phase tidak ditemukan.' });
    }

    // Safety check: Restrict delete if phase has associated tasks with recorded timesheets/expenses
    const hasTimesheets = await prisma.timesheet.findFirst({
      where: { task: { phaseId: id } },
    });

    if (hasTimesheets || phase.expenses.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'HAS_DEPENDENCIES',
        message: 'Phase tidak dapat dihapus karena sudah memiliki histori timesheet atau pengeluaran terkait.',
      });
    }

    await prisma.wbsPhase.delete({ where: { id } });

    // Update project progress
    await updatePhaseAndProjectProgress('', phase.projectId);

    return res.json({ success: true, message: 'WBS Phase berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
