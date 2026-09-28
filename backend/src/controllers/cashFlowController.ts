import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

export const getCashFlow = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Member tidak diizinkan mengakses laporan Cash Flow.',
      });
    }

    const { projectId, period, startDate: rawStart, endDate: rawEnd } = req.query;

    let dateFilter: { gte?: Date; lte?: Date } = {};
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (period === 'this_week') {
      const day = now.getDay() || 7; // Get current day of week (Monday = 1)
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      dateFilter = { gte: startOfWeek, lte: now };
    } else if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { gte: startOfMonth, lte: now };
    } else if (period === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { gte: startOfYear, lte: now };
    } else if (rawStart || rawEnd) {
      if (rawStart) dateFilter.gte = new Date(String(rawStart));
      if (rawEnd) dateFilter.lte = new Date(String(rawEnd));
    }

    const paymentWhere: any = {};
    if (projectId) paymentWhere.projectId = String(projectId);
    if (Object.keys(dateFilter).length > 0) paymentWhere.paymentDate = dateFilter;

    // CLIENT: Only see CLIENT_PAYMENT for their own projects
    if (role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({ where: { email: req.user?.email } });
      if (clientProfile) {
        paymentWhere.type = 'CLIENT_PAYMENT';
        paymentWhere.invoice = { clientId: clientProfile.id };
      } else {
        return res.json({
          success: true,
          data: {
            totalCashIn: 0,
            totalCashOut: 0,
            netCashFlow: 0,
            transactions: [],
          },
        });
      }
    }

    // Fetch payments
    const payments = await prisma.payment.findMany({
      where: paymentWhere,
      include: {
        invoice: { select: { invoiceNumber: true, client: { select: { companyName: true } } } },
        purchaseOrder: { select: { poNumber: true, vendorName: true } },
        expense: { select: { description: true, category: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // Also fetch direct approved/paid expenses if role is NOT CLIENT
    let directExpenses: any[] = [];
    if (role !== 'CLIENT') {
      const expenseWhere: any = {
        status: { in: ['APPROVED', 'PAID'] },
        purchaseOrderId: null, // Avoid double counting expenses that came from PO
      };
      if (projectId) expenseWhere.projectId = String(projectId);
      if (Object.keys(dateFilter).length > 0) expenseWhere.expenseDate = dateFilter;

      directExpenses = await prisma.expense.findMany({
        where: expenseWhere,
        include: {
          project: { select: { id: true, name: true, projectCode: true } },
        },
      });
    }

    let totalCashIn = 0;
    let totalCashOut = 0;

    const transactions: any[] = [];

    // Process Payments
    payments.forEach((p) => {
      const isCashIn = p.type === 'CLIENT_PAYMENT';
      if (isCashIn) {
        totalCashIn += p.amount;
      } else {
        totalCashOut += p.amount;
      }

      transactions.push({
        id: p.id,
        date: p.paymentDate,
        type: isCashIn ? 'Cash In' : 'Cash Out',
        flowType: p.type,
        description: isCashIn
          ? `Pembayaran Invoice #${p.invoice?.invoiceNumber || '-'} (${p.invoice?.client?.companyName || '-'})`
          : `Pembayaran Vendor/PO #${p.purchaseOrder?.poNumber || '-'} (${p.purchaseOrder?.vendorName || '-'})`,
        projectName: p.project?.name || '-',
        projectCode: p.project?.projectCode || '-',
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
      });
    });

    // Process Direct Expenses as Cash Out if not already paid by payment
    directExpenses.forEach((exp) => {
      totalCashOut += exp.amount;
      transactions.push({
        id: exp.id,
        date: exp.expenseDate,
        type: 'Cash Out',
        flowType: 'DIRECT_EXPENSE',
        description: `Pengeluaran Proyek: ${exp.description || exp.category}`,
        projectName: exp.project?.name || '-',
        projectCode: exp.project?.projectCode || '-',
        amount: exp.amount,
        paymentMethod: 'REIMBURSEMENT / CASH',
        referenceNumber: null,
      });
    });

    // Sort all transactions chronologically descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const netCashFlow = totalCashIn - (role === 'CLIENT' ? 0 : totalCashOut);

    return res.json({
      success: true,
      data: {
        summary: {
          totalCashIn,
          totalCashOut: role === 'CLIENT' ? undefined : totalCashOut,
          netCashFlow: role === 'CLIENT' ? totalCashIn : netCashFlow,
        },
        transactions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
