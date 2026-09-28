import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

const getDateFilter = (period?: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let gte: Date | undefined;
  let lte: Date | undefined;

  if (customStart) gte = new Date(customStart);
  if (customEnd) lte = new Date(customEnd);

  if (!gte && !lte && period && period !== 'ALL' && period !== 'all') {
    if (period === 'today') {
      gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === 'this_week') {
      const day = now.getDay() || 7;
      gte = new Date(now);
      gte.setDate(now.getDate() - day + 1);
      gte.setHours(0, 0, 0, 0);
      lte = new Date();
    } else if (period === 'this_month') {
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
      lte = new Date();
    } else if (period === 'last_month') {
      gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'this_quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      gte = new Date(now.getFullYear(), quarterMonth, 1);
      lte = new Date();
    } else if (period === 'this_year') {
      gte = new Date(now.getFullYear(), 0, 1);
      lte = new Date();
    }
  }

  return { gte, lte };
};

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const now = new Date();
    const { period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let projectWhere: any = {};
    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile) {
        projectWhere.clientId = clientProfile.id;
      }
    } else if (role === 'PROJECT_MANAGER' && userId) {
      projectWhere.OR = [
        { projectManagerId: userId },
        { members: { some: { userId } } }
      ];
    } else if (role === 'MEMBER' && userId) {
      projectWhere.OR = [
        { members: { some: { userId } } },
        { tasks: { some: { assignedToId: userId } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      include: {
        client: true,
        projectManager: true,
        phases: {
          include: {
            tasks: {
              include: { timesheets: true },
            },
            expenses: true,
          },
        },
        invoices: {
          include: { payments: true },
        },
        purchaseOrders: true,
        milestones: true,
        payments: true,
      },
    });

    let portfolioTotalBudget = 0;
    let portfolioTotalLaborCost = 0;
    let portfolioTotalExpenseCost = 0;
    let portfolioTotalCommittedCost = 0;
    let portfolioTotalInvoiced = 0;
    let portfolioTotalPaidInvoices = 0;
    let portfolioOverdueInvoicesCount = 0;

    let totalTasksCount = 0;
    let totalCompletedTasksCount = 0;
    let totalOverdueTasksCount = 0;

    let activeProjectsCount = 0;
    let completedProjectsCount = 0;
    let atRiskProjectsCount = 0;

    const overburnProjects: any[] = [];
    const projectSummaries: any[] = [];

    projects.forEach((proj) => {
      if (proj.status === 'COMPLETED') completedProjectsCount++;
      else if (proj.status === 'IN_PROGRESS' || proj.status === 'ACTIVE') activeProjectsCount++;

      portfolioTotalBudget += proj.contractValue;

      let projTasks = 0;
      let projCompletedTasks = 0;
      let projLaborCost = 0;
      let projExpenseCost = 0;

      proj.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          projTasks++;
          totalTasksCount++;
          if (task.status === 'COMPLETED' || task.status === 'DONE') {
            projCompletedTasks++;
            totalCompletedTasksCount++;
          }
          if (task.dueDate && task.dueDate < now && task.status !== 'COMPLETED' && task.status !== 'DONE') {
            totalOverdueTasksCount++;
          }

          task.timesheets.forEach((ts) => {
            projLaborCost += ts.laborCost;
          });
        });

        phase.expenses.forEach((exp) => {
          if (exp.status === 'APPROVED' || exp.status === 'PAID') {
            projExpenseCost += exp.amount;
          }
        });
      });

      // Approved PO = Committed Cost
      const projCommittedPOs = proj.purchaseOrders
        .filter((po) => po.status === 'APPROVED')
        .reduce((sum, po) => sum + (po.totalAmount > 0 ? po.totalAmount : po.amount), 0);

      portfolioTotalLaborCost += projLaborCost;
      portfolioTotalExpenseCost += projExpenseCost;
      portfolioTotalCommittedCost += projCommittedPOs;

      proj.invoices.forEach((inv) => {
        const invTot = inv.totalAmount > 0 ? inv.totalAmount : inv.amount;
        portfolioTotalInvoiced += invTot;
        const paidForInv = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
        portfolioTotalPaidInvoices += (inv.status === 'PAID' ? invTot : paidForInv);
        if (inv.dueDate < now && inv.status !== 'PAID') {
          portfolioOverdueInvoicesCount++;
        }
      });

      const projTotalActual = projLaborCost + projExpenseCost;
      const projRemainingBudget = Math.max(0, proj.contractValue - projTotalActual - projCommittedPOs);
      const progressPct = projTasks > 0 ? Math.round((projCompletedTasks / projTasks) * 100) : proj.progressPercentage;
      const burnPct = proj.contractValue > 0 ? Math.round(((projTotalActual + projCommittedPOs) / proj.contractValue) * 100) : 0;
      const isOverburn = (burnPct > progressPct && burnPct > 80) || (projTotalActual > proj.contractValue);

      if (isOverburn) atRiskProjectsCount++;

      const summary = {
        id: proj.id,
        projectCode: proj.projectCode,
        name: proj.name,
        clientName: proj.client.companyName,
        status: proj.status,
        contractValue: role === 'CLIENT' ? undefined : proj.contractValue,
        actualTotalCost: role === 'CLIENT' ? undefined : projTotalActual,
        committedCost: role === 'CLIENT' ? undefined : projCommittedPOs,
        remainingBudget: role === 'CLIENT' ? undefined : projRemainingBudget,
        progressPercentage: progressPct,
        burnPercentage: role === 'CLIENT' ? undefined : burnPct,
        isOverburn: role === 'CLIENT' ? false : isOverburn,
        milestonesCount: proj.milestones.length,
        completedMilestonesCount: proj.milestones.filter(m => m.status === 'COMPLETED').length,
      };

      projectSummaries.push(summary);
      if (isOverburn && role !== 'CLIENT') overburnProjects.push(summary);
    });

    const portfolioActualTotal = portfolioTotalLaborCost + portfolioTotalExpenseCost;
    const portfolioRemainingBudget = Math.max(0, portfolioTotalBudget - portfolioActualTotal - portfolioTotalCommittedCost);
    const portfolioProgressPct = totalTasksCount > 0 ? Math.round((totalCompletedTasksCount / totalTasksCount) * 100) : 0;
    const portfolioBurnPct = portfolioTotalBudget > 0 ? Math.round(((portfolioActualTotal + portfolioTotalCommittedCost) / portfolioTotalBudget) * 100) : 0;
    const outstandingInvoices = Math.max(0, portfolioTotalInvoiced - portfolioTotalPaidInvoices);

    // CASH FLOW CALCULATIONS WITH PERIOD FILTER
    let paymentDateFilter: any = {};
    if (gte || lte) {
      paymentDateFilter = { ...(gte && { gte }), ...(lte && { lte }) };
    }

    const allClientPayments = await prisma.payment.findMany({
      where: {
        type: 'CLIENT_PAYMENT',
        ...(Object.keys(paymentDateFilter).length > 0 && { paymentDate: paymentDateFilter }),
        ...(role === 'CLIENT' && { invoice: { client: { email: req.user?.email } } })
      }
    });

    const allVendorPayments = role === 'CLIENT' ? [] : await prisma.payment.findMany({
      where: {
        type: 'VENDOR_PAYMENT',
        ...(Object.keys(paymentDateFilter).length > 0 && { paymentDate: paymentDateFilter })
      }
    });

    const totalCashIn = allClientPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCashOut = role === 'CLIENT' ? 0 : (allVendorPayments.reduce((sum, p) => sum + p.amount, 0) + portfolioTotalExpenseCost);
    const netCashFlow = totalCashIn - totalCashOut;

    // MEMBER SPECIFIC STATS
    let myTasksActive = 0;
    let myTasksOverdue = 0;
    let myTasksDueSoon = 0;
    let myHoursThisWeek = 0;
    let myHoursThisMonth = 0;

    if (userId) {
      const myTasks = await prisma.task.findMany({ where: { assignedToId: userId } });
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      myTasks.forEach(t => {
        if (t.status !== 'COMPLETED' && t.status !== 'DONE') {
          myTasksActive++;
          if (t.dueDate && t.dueDate < now) myTasksOverdue++;
          else if (t.dueDate && t.dueDate <= threeDaysFromNow) myTasksDueSoon++;
        }
      });

      const day = now.getDay() || 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const myTimesheetsWeek = await prisma.timesheet.findMany({
        where: { userId, date: { gte: startOfWeek } }
      });
      myHoursThisWeek = myTimesheetsWeek.reduce((sum, ts) => sum + ts.hours, 0);

      const myTimesheetsMonth = await prisma.timesheet.findMany({
        where: { userId, date: { gte: startOfMonth } }
      });
      myHoursThisMonth = myTimesheetsMonth.reduce((sum, ts) => sum + ts.hours, 0);
    }

    // ACTION REQUIRED COUNTERS (For Finance & PM)
    const pendingPOsCount = role === 'CLIENT' || role === 'MEMBER' ? 0 : await prisma.purchaseOrder.count({ where: { status: 'DRAFT' } });
    const pendingExpensesCount = role === 'CLIENT' || role === 'MEMBER' ? 0 : await prisma.expense.count({ where: { status: 'SUBMITTED' } });

    const isClient = role === 'CLIENT';

    return res.json({
      success: true,
      data: {
        role,
        period: period || 'all',
        portfolio: {
          totalProjects: projects.length,
          activeProjects: activeProjectsCount,
          completedProjects: completedProjectsCount,
          atRiskProjects: atRiskProjectsCount,

          totalContractValue: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioTotalBudget,
          totalBudget: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioTotalBudget,
          actualLaborCost: (role === 'OWNER' || role === 'FINANCE') ? portfolioTotalLaborCost : undefined,
          actualExpenseCost: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioTotalExpenseCost,
          actualTotalCost: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioActualTotal,
          committedCost: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioTotalCommittedCost,
          remainingBudget: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioRemainingBudget,

          overallProgressPercentage: portfolioProgressPct,
          overallBurnPercentage: (role === 'CLIENT' || role === 'MEMBER') ? undefined : portfolioBurnPct,

          totalInvoiced: (role === 'MEMBER') ? undefined : portfolioTotalInvoiced,
          totalPaidInvoices: (role === 'MEMBER') ? undefined : portfolioTotalPaidInvoices,
          outstandingInvoices: (role === 'MEMBER') ? undefined : outstandingInvoices,
          overdueInvoices: (role === 'MEMBER') ? undefined : portfolioOverdueInvoicesCount,

          cashIn: totalCashIn,
          cashOut: role === 'CLIENT' ? undefined : totalCashOut,
          netCashFlow: isClient ? totalCashIn : netCashFlow,
          overburnCount: isClient ? 0 : overburnProjects.length,
        },
        actionRequired: {
          overdueInvoicesCount: portfolioOverdueInvoicesCount,
          pendingPOsCount,
          pendingExpensesCount,
          overdueTasksCount: totalOverdueTasksCount,
        },
        memberStats: {
          myTasksActive,
          myTasksOverdue,
          myTasksDueSoon,
          myHoursThisWeek,
          myHoursThisMonth,
        },
        overburnProjects: isClient ? [] : overburnProjects,
        projectSummaries,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
