import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit, notifyUser, calculateProjectHealth } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * Helper to update task actual hours and cost accurately from timesheets
 */
const recalculateTaskLabor = async (taskId: string) => {
  if (!taskId) return;
  const tsList = await prisma.timesheet.findMany({ where: { taskId } });
  const totalHours = tsList.reduce((sum, ts) => sum + ts.hours, 0);
  const totalCost = tsList.reduce((sum, ts) => sum + ts.laborCost, 0);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      actualHours: Math.round(totalHours * 100) / 100,
      actualCost: Math.round(totalCost * 100) / 100,
    },
  });
};

/**
 * GET /api/timesheets
 */
export const getTimesheets = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak diperbolehkan melihat timesheet internal tim.',
      });
    }

    const { taskId, userId, projectId } = req.query;
    const where: any = {};

    if (role === 'MEMBER' && req.user?.id) {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = String(userId);
    }

    if (taskId) where.taskId = String(taskId);
    if (projectId) where.projectId = String(projectId);

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        task: { select: { id: true, title: true, phaseId: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: { date: 'desc' },
    });

    const sanitizedTimesheets = timesheets.map((ts) => {
      const isSelf = ts.userId === req.user?.id;
      const isOwnerOrPMOrFinance = role === 'OWNER' || role === 'PROJECT_MANAGER' || role === 'FINANCE';

      return {
        id: ts.id,
        userId: ts.userId,
        projectId: ts.projectId,
        taskId: ts.taskId,
        date: ts.date,
        hours: ts.hours,
        description: ts.description,
        status: ts.status,
        user: ts.user,
        task: ts.task,
        project: ts.project,
        hourlyRateSnapshot: (isSelf || isOwnerOrPMOrFinance) ? ts.hourlyRateSnapshot : undefined,
        laborCost: (isSelf || isOwnerOrPMOrFinance) ? ts.laborCost : undefined,
      };
    });

    return res.json({ success: true, data: sanitizedTimesheets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/timesheets/:id
 */
export const getTimesheetById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        task: { select: { id: true, title: true, phaseId: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet tidak ditemukan.' });
    }

    return res.json({ success: true, data: timesheet });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/timesheets
 */
export const createTimesheet = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);

    if (role === 'CLIENT') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Client tidak memiliki akses meng-input timesheet.',
      });
    }

    const { projectId, taskId, date, hours, description, status } = req.body;
    const userId = req.user!.id;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      return res.status(400).json({ success: false, message: 'Jam kerja (hours) harus berupa angka positif lebih besar dari 0.' });
    }

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'Task wajib dipilih.' });
    }

    const taskObj = await prisma.task.findUnique({ where: { id: taskId } });
    if (!taskObj) {
      return res.status(404).json({ success: false, message: 'Task tidak ditemukan.' });
    }

    const targetProjectId = projectId || taskObj.projectId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const hourlyRateSnapshot = user.hourlyRate || 100000;
    const laborCost = Math.round(hoursNum * hourlyRateSnapshot * 100) / 100;

    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        projectId: targetProjectId,
        taskId,
        date: date ? new Date(date) : new Date(),
        hours: hoursNum,
        hourlyRateSnapshot,
        laborCost,
        description: description ? description.trim() : null,
        status: status || 'APPROVED',
      },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Recalculate Task labor and actual hours
    await recalculateTaskLabor(taskId);

    // Audit Log
    await logAudit(
      userId,
      'TIMESHEET_SUBMITTED',
      'TIMESHEET',
      timesheet.id,
      null,
      `Jam Kerja: ${hoursNum} Jam, Rate Snapshot: Rp${hourlyRateSnapshot.toLocaleString('id-ID')}, Labor Cost: Rp${laborCost.toLocaleString('id-ID')}`
    );

    return res.status(201).json({ success: true, data: timesheet });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/timesheets/:id
 */
export const updateTimesheet = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const id = req.params.id as string;

    const existing = await prisma.timesheet.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timesheet tidak ditemukan.' });
    }

    // Permission check: MEMBER can only edit their own timesheet
    if (role === 'MEMBER' && existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Anda hanya dapat mengubah timesheet milik Anda sendiri.',
      });
    }

    const { date, hours, description, status, taskId, projectId } = req.body;

    let hoursNum = existing.hours;
    if (hours !== undefined) {
      hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        return res.status(400).json({ success: false, message: 'Jam kerja (hours) harus berupa angka positif lebih besar dari 0.' });
      }
    }

    const newTaskId = taskId || existing.taskId;
    const newProjectId = projectId || existing.projectId;

    // Preserve hourlyRateSnapshot and calculate new labor cost
    const rateSnapshot = existing.hourlyRateSnapshot;
    const newLaborCost = Math.round(hoursNum * rateSnapshot * 100) / 100;

    const updated = await prisma.timesheet.update({
      where: { id },
      data: {
        projectId: newProjectId,
        taskId: newTaskId,
        date: date ? new Date(date) : existing.date,
        hours: hoursNum,
        laborCost: newLaborCost,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        status: status !== undefined ? status : existing.status,
      },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Recalculate Task labor for old & new tasks
    await recalculateTaskLabor(existing.taskId);
    if (newTaskId !== existing.taskId) {
      await recalculateTaskLabor(newTaskId);
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/timesheets/:id
 */
export const deleteTimesheet = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const id = req.params.id as string;

    const existing = await prisma.timesheet.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timesheet tidak ditemukan.' });
    }

    // Permission check
    if (role === 'MEMBER' && existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Anda hanya dapat menghapus timesheet milik Anda sendiri.',
      });
    }

    const taskId = existing.taskId;

    await prisma.timesheet.delete({ where: { id } });

    // Recalculate Task labor after deletion
    await recalculateTaskLabor(taskId);

    return res.json({ success: true, message: 'Timesheet berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
