import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { updatePhaseAndProjectProgress } from './wbsController';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const { projectId, phaseId, assignedToId, status, priority, search } = req.query;

    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak diperbolehkan melihat detail tugas internal.',
      });
    }

    const where: any = {};
    if (projectId) where.projectId = String(projectId);
    if (phaseId) where.phaseId = String(phaseId);
    if (assignedToId) where.assignedToId = String(assignedToId);
    if (status && status !== 'ALL') where.status = String(status);
    if (priority && priority !== 'ALL') where.priority = String(priority);

    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { assignedTo: { name: { contains: q } } },
      ];
    }

    // MEMBER only sees tasks assigned to them if no specific project filter is passed
    if (role === 'MEMBER' && !projectId && userId && !assignedToId) {
      where.assignedToId = userId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        phase: {
          select: { id: true, name: true, project: { select: { id: true, name: true, projectCode: true } } },
        },
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        timesheets: role === 'OWNER' || role === 'PROJECT_MANAGER',
      },
      orderBy: { createdAt: 'desc' },
    });

    const isOwner = role === 'OWNER';

    const tasksWithStats = tasks.map((task: any) => {
      const actualHours = task.actualHours || 0;
      const actualCost = isOwner ? task.actualCost : undefined;

      return {
        id: task.id,
        projectId: task.projectId,
        phaseId: task.phaseId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours,
        progressPercentage: task.progressPercentage,
        assignedTo: task.assignedTo,
        phase: task.phase,
        project: task.project,
        actualCost,
      };
    });

    return res.json({ success: true, data: tasksWithStats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    return res.json({ success: true, data: task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya OWNER dan PROJECT MANAGER yang dapat membuat tugas baru.',
      });
    }

    const { projectId, phaseId, title, description, assignedToId, estimatedHours, priority, status, startDate, dueDate, progressPercentage } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Judul / Nama Task wajib diisi.' });
    }

    let targetProjectId = projectId;
    let targetPhaseId = phaseId;

    // If phaseId is provided but no projectId, find projectId from phase
    if (targetPhaseId && !targetProjectId) {
      const phase = await prisma.wbsPhase.findUnique({ where: { id: targetPhaseId } });
      if (phase) targetProjectId = phase.projectId;
    }

    // If projectId is provided but no phaseId, grab or create default phase
    if (targetProjectId && !targetPhaseId) {
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

    if (!targetProjectId || !targetPhaseId) {
      return res.status(400).json({ success: false, message: 'Project dan Phase wajib dipilih.' });
    }

    const estHours = parseFloat(estimatedHours || 0);
    if (estHours < 0) {
      return res.status(400).json({ success: false, message: 'Estimasi jam kerja tidak boleh negatif.' });
    }

    const start = startDate ? new Date(startDate) : null;
    const due = dueDate ? new Date(dueDate) : null;

    if (start && due && due < start) {
      return res.status(400).json({ success: false, message: 'Due Date tidak boleh sebelum Start Date.' });
    }

    let progress = progressPercentage !== undefined ? parseFloat(progressPercentage) : 0;
    const taskStatus = status || 'TODO';
    if (taskStatus === 'COMPLETED') {
      progress = 100;
    } else {
      progress = Math.max(0, Math.min(100, progress));
    }

    const task = await prisma.task.create({
      data: {
        projectId: targetProjectId,
        phaseId: targetPhaseId,
        title: title.trim(),
        description: description ? description.trim() : null,
        assignedToId: assignedToId || null,
        estimatedHours: estHours,
        priority: priority || 'MEDIUM',
        status: taskStatus,
        startDate: start,
        dueDate: due,
        progressPercentage: progress,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Update parent phase & project progress
    await updatePhaseAndProjectProgress(targetPhaseId, targetProjectId);

    return res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya OWNER dan PROJECT MANAGER yang dapat memperbarui detail tugas.',
      });
    }

    const id = req.params.id as string;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    const { projectId, phaseId, title, description, assignedToId, estimatedHours, priority, status, startDate, dueDate, progressPercentage } = req.body;

    const estHours = estimatedHours !== undefined ? parseFloat(estimatedHours) : existing.estimatedHours;
    if (estHours < 0) {
      return res.status(400).json({ success: false, message: 'Estimasi jam kerja tidak boleh negatif.' });
    }

    const start = startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate;
    const due = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate;

    if (start && due && due < start) {
      return res.status(400).json({ success: false, message: 'Due Date tidak boleh sebelum Start Date.' });
    }

    const taskStatus = status !== undefined ? status : existing.status;
    let progress = existing.progressPercentage;
    if (progressPercentage !== undefined) {
      progress = parseFloat(progressPercentage);
    }
    if (taskStatus === 'COMPLETED') {
      progress = 100;
    } else {
      progress = Math.max(0, Math.min(100, progress));
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        projectId: projectId !== undefined ? projectId : existing.projectId,
        phaseId: phaseId !== undefined ? phaseId : existing.phaseId,
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        assignedToId: assignedToId !== undefined ? (assignedToId || null) : existing.assignedToId,
        estimatedHours: estHours,
        priority: priority !== undefined ? priority : existing.priority,
        status: taskStatus,
        startDate: start,
        dueDate: due,
        progressPercentage: progress,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        phase: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Update parent phase & project progress
    await updatePhaseAndProjectProgress(updatedTask.phaseId, updatedTask.projectId);

    return res.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;

    if (role === 'FINANCE' || role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Role ${role} tidak diperbolehkan mengubah progress atau status tugas proyek.`,
      });
    }

    const id = req.params.id as string;
    const { status, progressPercentage } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    if (role === 'MEMBER' && existingTask.assignedToId !== userId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'MEMBER hanya dapat mengubah status tugas yang ditugaskan kepada dirinya sendiri.',
      });
    }

    const nextStatus = status || existingTask.status;
    let nextProgress = existingTask.progressPercentage;

    if (progressPercentage !== undefined) {
      nextProgress = parseFloat(progressPercentage);
    }

    if (nextStatus === 'COMPLETED') {
      nextProgress = 100;
    } else {
      nextProgress = Math.max(0, Math.min(100, nextProgress));
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: nextStatus,
        progressPercentage: nextProgress,
      },
    });

    // Update parent phase & project progress
    await updatePhaseAndProjectProgress(task.phaseId, task.projectId);

    return res.json({ success: true, data: task });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya OWNER dan PROJECT MANAGER yang diizinkan menghapus tugas.',
      });
    }

    const id = req.params.id as string;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { timesheets: true, expenses: true },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
    }

    if (task.timesheets.length > 0 || task.expenses.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'HAS_DEPENDENCIES',
        message: 'Task tidak dapat dihapus karena sudah memiliki catatan timesheet atau pengeluaran terkait.',
      });
    }

    await prisma.task.delete({ where: { id } });

    // Update parent phase & project progress
    await updatePhaseAndProjectProgress(task.phaseId, task.projectId);

    return res.json({ success: true, message: 'Task berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
