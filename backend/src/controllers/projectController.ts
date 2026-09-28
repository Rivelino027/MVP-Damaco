import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

/**
 * Helper to normalize role
 */
const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

/**
 * GET /api/projects
 */
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;

    // Filter projects based on role
    let whereClause: any = {};
    if (role === 'CLIENT') {
      // Find client profile connected to user email or ID
      const clientProfile = await prisma.client.findFirst({
        where: { email: req.user?.email },
      });
      if (clientProfile) {
        whereClause.clientId = clientProfile.id;
      }
    } else if (role === 'MEMBER' && userId) {
      // Members only see projects where they are a member or assigned a task
      whereClause.OR = [
        { members: { some: { userId } } },
        { tasks: { some: { assignedToId: userId } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        client: true,
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        phases: {
          include: {
            tasks: {
              include: {
                timesheets: true,
              },
            },
            expenses: true,
          },
        },
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedProjects = projects.map((project) => {
      let totalTasks = 0;
      let completedTasks = 0;
      let totalActualLaborCost = 0;
      let totalActualExpenseCost = 0;

      const phasesWithMetrics = project.phases.map((phase) => {
        let phaseLaborCost = 0;
        let phaseExpenseCost = 0;
        let phaseTaskCount = phase.tasks.length;
        let phaseCompletedTaskCount = 0;

        phase.tasks.forEach((task: any) => {
          totalTasks++;
          if (task.status === 'COMPLETED' || task.status === 'DONE') {
            completedTasks++;
            phaseCompletedTaskCount++;
          }

          task.timesheets.forEach((ts: any) => {
            phaseLaborCost += ts.laborCost;
          });
        });

        phase.expenses.forEach((exp: any) => {
          if (exp.status === 'APPROVED' || exp.status === 'PAID') {
            phaseExpenseCost += exp.amount;
          }
        });

        totalActualLaborCost += phaseLaborCost;
        totalActualExpenseCost += phaseExpenseCost;

        const phaseActualCost = phaseLaborCost + phaseExpenseCost;
        const phaseProgressPct = phaseTaskCount > 0 ? (phaseCompletedTaskCount / phaseTaskCount) * 100 : 0;
        const phaseBurnPct = phase.budgetAmount > 0 ? (phaseActualCost / phase.budgetAmount) * 100 : 0;

        return {
          id: phase.id,
          name: phase.name,
          sortOrder: phase.sortOrder,
          budgetAmount: role === 'CLIENT' ? undefined : phase.budgetAmount,
          actualLaborCost: role === 'OWNER' || role === 'PROJECT_MANAGER' || role === 'FINANCE' ? phaseLaborCost : undefined,
          actualExpenseCost: role === 'CLIENT' ? undefined : phaseExpenseCost,
          actualTotalCost: role === 'CLIENT' ? undefined : phaseActualCost,
          progressPercentage: Math.round(phaseProgressPct),
          burnPercentage: role === 'CLIENT' ? undefined : Math.round(phaseBurnPct),
          isOverburn: role === 'CLIENT' ? false : (phaseBurnPct > phaseProgressPct && phaseBurnPct > 10),
          taskCount: phaseTaskCount,
          completedTaskCount: phaseCompletedTaskCount,
        };
      });

      const overallProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progressPercentage;
      const actualTotalCost = totalActualLaborCost + totalActualExpenseCost;
      const overallBurnPct = project.contractValue > 0 ? Math.round((actualTotalCost / project.contractValue) * 100) : 0;
      const isOverburn = overallBurnPct > overallProgressPct && overallBurnPct > 10;

      const profit = project.contractValue - actualTotalCost;
      const marginPct = project.contractValue > 0 ? (profit / project.contractValue) * 100 : 0;

      const totalInvoiced = project.invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const totalPaidInvoice = project.invoices
        .filter((inv: any) => inv.status === 'PAID')
        .reduce((sum: number, inv: any) => sum + inv.amount, 0);

      // SECURITY RBAC FIELD SANITIZATION
      const isOwner = role === 'OWNER';
      const isClient = role === 'CLIENT';
      const isMember = role === 'MEMBER';

      return {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        client: project.client,
        projectManager: isClient ? undefined : project.projectManager,
        contractValue: isClient ? undefined : project.contractValue,
        budgetTotal: isClient ? undefined : project.contractValue,
        actualLaborCost: isOwner ? totalActualLaborCost : undefined,
        actualExpenseCost: isClient ? undefined : totalActualExpenseCost,
        actualTotalCost: isClient ? undefined : actualTotalCost,
        remainingBudget: isClient ? undefined : (project.contractValue - actualTotalCost),
        progressPercentage: overallProgressPct,
        burnPercentage: isClient ? undefined : overallBurnPct,
        isOverburn: isClient ? false : isOverburn,
        // Sensitive Financials (OWNER only)
        profit: isOwner ? profit : undefined,
        marginPercentage: isOwner ? Math.round(marginPct) : undefined,
        totalInvoiced: isMember ? undefined : totalInvoiced,
        totalPaidInvoice: isMember ? undefined : totalPaidInvoice,
        phases: phasesWithMetrics,
      };
    });

    return res.json({ success: true, data: sanitizedProjects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/projects/:id
 */
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const role = getNormalizedRole(req);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        phases: {
          include: {
            tasks: {
              include: {
                assignedTo: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            },
            expenses: role === 'CLIENT' ? false : true,
          },
        },
        invoices: true,
        milestones: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    // IDOR Protection: Client, PM, & Member Access Validation
    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile && project.clientId !== clientProfile.id) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Anda hanya dapat melihat proyek milik perusahaan Anda.',
        });
      }
    } else if (role === 'PROJECT_MANAGER' || role === 'MEMBER') {
      const userId = req.user?.id;
      if (userId && project.projectManagerId !== userId) {
        const isMember = await prisma.projectMember.findFirst({
          where: { projectId: id, userId },
        });
        const isAssignedTask = await prisma.task.findFirst({
          where: { projectId: id, assignedToId: userId },
        });
        if (!isMember && !isAssignedTask) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN',
            message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses proyek ini.',
          });
        }
      }
    }

    const isOwner = role === 'OWNER';
    const isClient = role === 'CLIENT';

    return res.json({
      success: true,
      data: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        client: project.client,
        projectManager: isClient ? undefined : project.projectManager,
        contractValue: isClient ? undefined : project.contractValue,
        progressPercentage: project.progressPercentage,
        phases: project.phases,
        milestones: project.milestones,
        invoices: project.invoices,
        // Sensitive Financials (OWNER only)
        profitability: isOwner ? {
          contractValue: project.contractValue,
          status: 'SECURE_OWNER_ACCESS',
        } : undefined,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/projects/:id/profitability (OWNER strictly required)
 */
export const getProjectProfitability = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Informasi profitabilitas dan margin proyek ini bersifat sangat rahasia dan hanya dapat diakses oleh OWNER.',
      });
    }

    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        timesheets: true,
        expenses: { where: { status: 'APPROVED' } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    const totalLaborCost = project.timesheets.reduce((sum, ts) => sum + ts.laborCost, 0);
    const totalExpenses = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const actualCost = totalLaborCost + totalExpenses;
    const profit = project.contractValue - actualCost;
    const marginPercentage = project.contractValue > 0 ? (profit / project.contractValue) * 100 : 0;

    return res.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        contractValue: project.contractValue,
        totalLaborCost,
        totalExpenses,
        actualCost,
        profit,
        marginPercentage: Math.round(marginPercentage * 100) / 100,
        costConsumptionPct: Math.round((actualCost / project.contractValue) * 10000) / 100,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects (OWNER & PROJECT_MANAGER only)
 */
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan membuat proyek baru.',
      });
    }

    const { name, projectCode, clientId, projectManagerId, description, contractValue, startDate, endDate, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    if (!projectCode || !projectCode.trim()) {
      return res.status(400).json({ success: false, message: 'Project code is required.' });
    }

    if (!clientId || String(clientId).trim() === '' || clientId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Client is required.' });
    }

    // Verify client exists in DB
    const clientObj = await prisma.client.findUnique({
      where: { id: String(clientId).trim() },
    });

    if (!clientObj) {
      return res.status(400).json({
        success: false,
        message: 'Selected client does not exist.',
      });
    }

    // Duplicate projectCode validation
    const existingCode = await prisma.project.findUnique({
      where: { projectCode: projectCode.trim() },
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_PROJECT_CODE',
        message: 'Project code already exists.',
      });
    }

    const parsedContractValue = parseFloat(contractValue || 0);
    if (parsedContractValue < 0) {
      return res.status(400).json({ success: false, message: 'Contract Value cannot be negative.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        projectCode: projectCode.trim(),
        clientId: clientObj.id,
        projectManagerId: projectManagerId || req.user?.id,
        description: description ? description.trim() : null,
        contractValue: parsedContractValue,
        startDate: start,
        endDate: end,
        status: status || 'ACTIVE',
        progressPercentage: 0,
      },
      include: {
        client: true,
        projectManager: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/projects/:id (OWNER & PROJECT_MANAGER only)
 */
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan memperbarui proyek.',
      });
    }

    const { id } = req.params;
    const { name, projectCode, clientId, projectManagerId, description, contractValue, startDate, endDate, status, progressPercentage } = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    if (role === 'PROJECT_MANAGER' && req.user?.id && existing.projectManagerId !== req.user.id) {
      const isMember = await prisma.projectMember.findFirst({ where: { projectId: id, userId: req.user.id } });
      if (!isMember) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Anda hanya diizinkan memperbarui proyek yang dikelola atau di mana Anda ditugaskan.',
        });
      }
    }

    // If projectCode is being changed, verify uniqueness
    if (projectCode && projectCode.trim() !== existing.projectCode) {
      const codeCheck = await prisma.project.findUnique({
        where: { projectCode: projectCode.trim() },
      });
      if (codeCheck) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_PROJECT_CODE',
          message: 'Project code already exists.',
        });
      }
    }

    const parsedContractValue = contractValue !== undefined ? parseFloat(contractValue) : existing.contractValue;
    if (parsedContractValue < 0) {
      return res.status(400).json({ success: false, message: 'Contract Value cannot be negative.' });
    }

    const start = startDate ? new Date(startDate) : existing.startDate;
    const end = endDate ? new Date(endDate) : existing.endDate;
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        projectCode: projectCode !== undefined ? projectCode.trim() : existing.projectCode,
        clientId: clientId !== undefined ? clientId : existing.clientId,
        projectManagerId: projectManagerId !== undefined ? projectManagerId : existing.projectManagerId,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        contractValue: parsedContractValue,
        startDate: start,
        endDate: end,
        status: status !== undefined ? status : existing.status,
        progressPercentage: progressPercentage !== undefined ? Math.max(0, Math.min(100, parseFloat(progressPercentage))) : existing.progressPercentage,
      },
      include: {
        client: true,
        projectManager: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/projects/:id (OWNER & PROJECT_MANAGER only)
 */
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Hanya Owner dan Project Manager yang diizinkan menghapus proyek.',
      });
    }

    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        invoices: true,
        expenses: true,
        tasks: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan.' });
    }

    if (role === 'PROJECT_MANAGER' && req.user?.id && project.projectManagerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Anda hanya diizinkan menghapus proyek yang Anda kelola.',
      });
    }

    // Delete project safely (Cascade handles related records)
    await prisma.project.delete({ where: { id } });

    return res.json({ success: true, message: 'Proyek berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

