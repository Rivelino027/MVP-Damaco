import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

// Helper to get date boundaries based on period filter
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

// 1. PROJECT PERFORMANCE REPORT
export const getProjectPerformanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const { projectId, clientId, status, period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let where: any = {};
    if (projectId) where.id = projectId as string;
    if (clientId) where.clientId = clientId as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (gte || lte) {
      where.createdAt = { ...(gte && { gte }), ...(lte && { lte }) };
    }

    if (role === 'CLIENT') {
      const client = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (client) where.clientId = client.id;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        projectManager: true,
        phases: {
          include: {
            tasks: { include: { timesheets: true } },
            expenses: true,
          }
        },
        purchaseOrders: true,
        milestones: true,
      }
    });

    const report = projects.map(proj => {
      let totalTasks = 0;
      let completedTasks = 0;
      let laborCost = 0;
      let expenseCost = 0;

      proj.phases.forEach(ph => {
        ph.tasks.forEach(t => {
          totalTasks++;
          if (t.status === 'COMPLETED' || t.status === 'DONE') completedTasks++;
          t.timesheets.forEach(ts => laborCost += ts.laborCost);
        });
        ph.expenses.forEach(e => {
          if (e.status === 'APPROVED' || e.status === 'PAID') expenseCost += e.amount;
        });
      });

      const committedCost = proj.purchaseOrders
        .filter(po => po.status === 'APPROVED')
        .reduce((sum, po) => sum + (po.totalAmount > 0 ? po.totalAmount : po.amount), 0);

      const actualCost = laborCost + expenseCost;
      const budget = proj.contractValue;
      const remaining = Math.max(0, budget - actualCost - committedCost);
      const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : proj.progressPercentage;
      const costConsumptionPct = budget > 0 ? Math.round(((actualCost + committedCost) / budget) * 100) : 0;

      let health = 'ON_TRACK';
      if (actualCost > budget) health = 'OVER_BUDGET';
      else if (costConsumptionPct > progressPct && costConsumptionPct > 80) health = 'AT_RISK';
      else if (proj.status === 'COMPLETED') health = 'COMPLETED';
      else if (proj.status === 'ON_HOLD') health = 'ON_HOLD';

      return {
        projectId: proj.id,
        projectCode: proj.projectCode,
        projectName: proj.name,
        clientName: proj.client.companyName,
        managerName: proj.projectManager?.name || 'Unassigned',
        status: proj.status,
        progressPercentage: progressPct,
        contractValue: role === 'CLIENT' ? undefined : budget,
        actualCost: role === 'CLIENT' ? undefined : actualCost,
        committedCost: role === 'CLIENT' ? undefined : committedCost,
        remainingBudget: role === 'CLIENT' ? undefined : remaining,
        costConsumptionPct: role === 'CLIENT' ? undefined : costConsumptionPct,
        health,
        milestoneCount: proj.milestones.length,
        completedMilestonesCount: proj.milestones.filter(m => m.status === 'COMPLETED').length,
      };
    });

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. BUDGET VS ACTUAL & 3. BUDGET ABSORPTION REPORT
export const getBudgetVsActualReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT' || role === 'MEMBER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const { projectId, clientId } = req.query;
    let where: any = {};
    if (projectId) where.id = projectId as string;
    if (clientId) where.clientId = clientId as string;

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        phases: {
          include: {
            tasks: { include: { timesheets: true } },
            expenses: true
          }
        },
        purchaseOrders: true
      }
    });

    const report = projects.map(proj => {
      let laborCost = 0;
      let expenseCost = 0;
      proj.phases.forEach(ph => {
        ph.tasks.forEach(t => t.timesheets.forEach(ts => laborCost += ts.laborCost));
        ph.expenses.forEach(e => {
          if (e.status === 'APPROVED' || e.status === 'PAID') expenseCost += e.amount;
        });
      });

      const committedCost = proj.purchaseOrders
        .filter(po => po.status === 'APPROVED')
        .reduce((sum, po) => sum + (po.totalAmount > 0 ? po.totalAmount : po.amount), 0);

      const actualCost = laborCost + expenseCost;
      const budget = proj.contractValue;
      const remaining = budget - actualCost - committedCost;
      const consumptionPct = budget > 0 ? Math.round(((actualCost + committedCost) / budget) * 100) : 0;

      return {
        projectId: proj.id,
        projectCode: proj.projectCode,
        projectName: proj.name,
        clientName: proj.client.companyName,
        budget,
        actualLaborCost: laborCost,
        actualExpenseCost: expenseCost,
        actualTotalCost: actualCost,
        committedCost,
        remainingBudget: remaining,
        costConsumptionPct: consumptionPct,
        isOverBudget: actualCost > budget,
      };
    });

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. TIMESHEET & LABOR COST REPORT
export const getTimesheetReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const userId = req.user?.id;
    const { projectId, employeeId, period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (employeeId) where.userId = employeeId as string;
    if (gte || lte) where.date = { ...(gte && { gte }), ...(lte && { lte }) };

    if (role === 'MEMBER' && userId) {
      where.userId = userId;
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        user: true,
        project: true,
        task: true,
      },
      orderBy: { date: 'desc' }
    });

    const report = timesheets.map(ts => ({
      id: ts.id,
      date: ts.date,
      employeeName: ts.user.name,
      employeeId: ts.user.id,
      projectName: ts.project.name,
      projectCode: ts.project.projectCode,
      taskTitle: ts.task.title,
      hours: ts.hours,
      hourlyRateSnapshot: (role === 'OWNER' || role === 'FINANCE') ? ts.hourlyRateSnapshot : undefined,
      laborCost: (role === 'OWNER' || role === 'FINANCE' || role === 'PROJECT_MANAGER') ? ts.laborCost : undefined,
      description: ts.description,
      status: ts.status,
    }));

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. EXPENSE REPORT
export const getExpenseReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    const { projectId, category, status, period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (category) where.category = category as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (gte || lte) where.expenseDate = { ...(gte && { gte }), ...(lte && { lte }) };

    if (role === 'MEMBER' && req.user?.id) {
      where.submittedById = req.user.id;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        project: true,
        phase: true,
        submittedBy: true,
        purchaseOrder: { include: { vendor: true } }
      },
      orderBy: { expenseDate: 'desc' }
    });

    const report = expenses.map(e => ({
      id: e.id,
      expenseDate: e.expenseDate,
      projectName: e.project.name,
      phaseName: e.phase?.name || '-',
      submittedByName: e.submittedBy.name,
      category: e.category,
      amount: e.amount,
      status: e.status,
      vendorName: e.purchaseOrder?.vendorName || e.purchaseOrder?.vendor?.name || '-',
      description: e.description,
    }));

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. INVOICE REPORT & 7. AGING / RECEIVABLE REPORT
export const getInvoiceAgingReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const { projectId, clientId, status } = req.query;

    let where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (clientId) where.clientId = clientId as string;
    if (status && status !== 'ALL') where.status = status as string;

    if (role === 'CLIENT') {
      const client = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (client) where.clientId = client.id;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: true,
        project: true,
        payments: true,
      },
      orderBy: { dueDate: 'asc' }
    });

    const now = new Date();

    const agingSummary = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      over90Days: 0,
      totalOutstanding: 0,
    };

    const invoiceList = invoices.map(inv => {
      const paidSum = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const total = inv.totalAmount > 0 ? inv.totalAmount : inv.amount;
      const outstanding = Math.max(0, total - (inv.status === 'PAID' ? total : paidSum));

      let agingBucket = 'CURRENT';
      let daysOverdue = 0;

      if (inv.status !== 'PAID' && outstanding > 0 && inv.dueDate < now) {
        const diffTime = Math.abs(now.getTime() - inv.dueDate.getTime());
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 30) agingBucket = '1-30 DAYS';
        else if (daysOverdue <= 60) agingBucket = '31-60 DAYS';
        else if (daysOverdue <= 90) agingBucket = '61-90 DAYS';
        else agingBucket = '> 90 DAYS';
      }

      if (inv.status !== 'PAID' && outstanding > 0) {
        agingSummary.totalOutstanding += outstanding;
        if (agingBucket === 'CURRENT') agingSummary.current += outstanding;
        else if (agingBucket === '1-30 DAYS') agingSummary.days1_30 += outstanding;
        else if (agingBucket === '31-60 DAYS') agingSummary.days31_60 += outstanding;
        else if (agingBucket === '61-90 DAYS') agingSummary.days61_90 += outstanding;
        else if (agingBucket === '> 90 DAYS') agingSummary.over90Days += outstanding;
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.companyName,
        projectName: inv.project.name,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        totalAmount: total,
        paidAmount: inv.status === 'PAID' ? total : paidSum,
        outstandingAmount: outstanding,
        status: inv.status,
        agingBucket,
        daysOverdue,
      };
    });

    return res.json({
      success: true,
      data: {
        agingSummary,
        invoices: invoiceList,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. PAYMENT REPORT
export const getPaymentReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    const { projectId, type, period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (type && type !== 'ALL') where.type = type as string;
    if (gte || lte) where.paymentDate = { ...(gte && { gte }), ...(lte && { lte }) };

    if (role === 'CLIENT') {
      where.type = 'CLIENT_PAYMENT';
      const client = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (client) where.invoice = { clientId: client.id };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        project: true,
        invoice: { include: { client: true } },
        purchaseOrder: { include: { vendor: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const report = payments.map(p => ({
      id: p.id,
      paymentNumber: p.paymentNumber || 'PAY-REF',
      type: p.type,
      paymentDate: p.paymentDate,
      projectName: p.project?.name || 'General Project',
      partyName: p.type === 'CLIENT_PAYMENT'
        ? (p.invoice?.client?.companyName || 'Client')
        : (p.purchaseOrder?.vendorName || p.purchaseOrder?.vendor?.name || 'Vendor'),
      referenceNumber: p.referenceNumber || '-',
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
    }));

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 9. PURCHASE ORDER / COMMITMENT REPORT
export const getPoReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    const { projectId, vendorId, status, period, startDate, endDate } = req.query;
    const { gte, lte } = getDateFilter(period as string, startDate as string, endDate as string);

    let where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (vendorId) where.vendorId = vendorId as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (gte || lte) where.orderDate = { ...(gte && { gte }), ...(lte && { lte }) };

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: { project: true, vendor: true },
      orderBy: { orderDate: 'desc' }
    });

    const report = pos.map(po => ({
      id: po.id,
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      projectName: po.project.name,
      vendorName: po.vendorName || po.vendor?.name || '-',
      totalAmount: po.totalAmount > 0 ? po.totalAmount : po.amount,
      status: po.status,
      isCommittedCost: po.status === 'APPROVED',
      description: po.description,
    }));

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 10. EXPORT REPORT TO CSV / FILE DATA
export const exportReportData = async (req: AuthRequest, res: Response) => {
  try {
    const { reportType } = req.params;
    let data: any[] = [];

    if (reportType === 'project-performance') {
      const result = await prisma.project.findMany({ include: { client: true } });
      data = result.map(p => ({
        ProjectCode: p.projectCode,
        ProjectName: p.name,
        Client: p.client.companyName,
        ContractValue: p.contractValue,
        ProgressPct: p.progressPercentage,
        Status: p.status,
      }));
    } else if (reportType === 'budget-vs-actual') {
      const result = await prisma.project.findMany();
      data = result.map(p => ({
        ProjectCode: p.projectCode,
        ProjectName: p.name,
        ContractValue: p.contractValue,
      }));
    }

    return res.json({
      success: true,
      reportType,
      rowCount: data.length,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
