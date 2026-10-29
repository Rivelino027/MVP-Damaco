import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetRequestStatus,
  BudgetStatus,
  ExpenseStatus,
  LimitChangeStatus,
  LimitStatus,
  ProjectStatus,
  Role,
  TimesheetStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { LaborCostsService } from '../labor-costs/services/labor-costs.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly laborCostsService: LaborCostsService,
  ) {}

  /**
   * Dashboard Admin: Ringkasan khusus untuk departemen Admin yang login.
   */
  async getAdminDashboard(user: AuthenticatedUser) {
    const deptId = user.departmentId;
    if (!deptId) {
      throw new NotFoundException('Admin tidak terhubung dengan departemen');
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: deptId },
    });

    const departmentBudget = dept ? Number(dept.annualBudget.toString()) : 0;

    // Ambil proyek di departemen ini
    const projects = await this.prisma.project.findMany({
      where: { departmentId: deptId, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null } },
        budgets: {
          where: { status: BudgetStatus.aktif },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const activeProjects = projects.filter(
      (p) => p.status === ProjectStatus.berjalan,
    ).length;

    // Hitung kesehatan proyek
    const projectHealthList = await Promise.all(
      projects.map(async (p) => {
        const activeBudget = p.budgets[0];
        const budgeted = activeBudget
          ? Number(activeBudget.totalAmount.toString())
          : 0;

        // Hitung pengeluaran riil
        const expenses = await this.prisma.expense.findMany({
          where: {
            projectId: p.id,
            status: {
              in: [
                ExpenseStatus.siap_dibayar,
                ExpenseStatus.dibayar,
                ExpenseStatus.disetujui,
              ],
            },
          },
          select: { amount: true },
        });

        // Hitung biaya tenaga kerja dari service agregat LaborCostsService
        const laborAgg = await this.laborCostsService.getProjectAggregate(
          p.id,
          user,
        );

        const isSuperAdmin = user.role === Role.super_admin;
        const isLaborHidden =
          laborAgg.workerCount > 0 && laborAgg.isCostHidden && !isSuperAdmin;
        const laborCost = isLaborHidden
          ? null
          : laborAgg.workerCount === 0
            ? 0
            : laborAgg.costAmount
              ? Number(laborAgg.costAmount)
              : 0;

        const expenseCost = expenses.reduce(
          (sum, e) => sum + Number(e.amount.toString()),
          0,
        );

        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter(
          (t) => t.status === 'selesai',
        ).length;
        const progressPercent =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100
            : 0;

        // Jika biaya tenaga kerja disembunyikan, totalActual juga disembunyikan (null)
        // agar tidak terjadi pembocoran aritmatika (totalActual - expenseCost)
        const totalActual = isLaborHidden
          ? null
          : expenseCost + (laborCost ?? 0);

        const absorptionPct =
          totalActual !== null && budgeted > 0
            ? Math.round((totalActual / budgeted) * 100 * 100) / 100
            : null;

        const isEarlyWarning =
          absorptionPct !== null &&
          absorptionPct > progressPercent &&
          progressPercent < 100;
        const isOverBudget =
          totalActual !== null && totalActual > budgeted && budgeted > 0;

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          progressPercent,
          absorptionPct: absorptionPct ?? 0,
          isEarlyWarning,
          isOverBudget,
          totalActual,
          laborCost,
          isCostHidden: isLaborHidden,
          hiddenReason: isLaborHidden ? laborAgg.hiddenReason : null,
          department: dept ? { id: dept.id, name: dept.name } : null,
        };
      }),
    );

    // Hitung serapan anggaran departemen menggunakan agregat departemen LaborCostsService
    const deptLaborAgg = await this.laborCostsService.getDepartmentAggregate(
      deptId,
      user,
    );

    const deptExpenses = await this.prisma.expense.findMany({
      where: {
        project: { departmentId: deptId },
        status: {
          in: [
            ExpenseStatus.siap_dibayar,
            ExpenseStatus.dibayar,
            ExpenseStatus.disetujui,
          ],
        },
      },
      select: { amount: true },
    });

    const deptExpenseCost = deptExpenses.reduce(
      (sum, e) => sum + Number(e.amount.toString()),
      0,
    );

    const isSuperAdmin = user.role === Role.super_admin;
    const isDeptLaborHidden =
      deptLaborAgg.workerCount > 0 &&
      deptLaborAgg.isCostHidden &&
      !isSuperAdmin;
    const deptLaborCost = isDeptLaborHidden
      ? null
      : deptLaborAgg.workerCount === 0
        ? 0
        : deptLaborAgg.costAmount
          ? Number(deptLaborAgg.costAmount)
          : 0;

    const usedBudget = isDeptLaborHidden
      ? null
      : deptExpenseCost + (deptLaborCost ?? 0);
    const remainingBudget =
      usedBudget !== null ? Math.max(0, departmentBudget - usedBudget) : null;
    const absorptionPct =
      usedBudget !== null && departmentBudget > 0
        ? Math.round((usedBudget / departmentBudget) * 100 * 100) / 100
        : null;

    // Pending approvals
    const [pendingTimesheets, pendingExpenses, pendingBudgets] =
      await Promise.all([
        this.prisma.timesheet.count({
          where: {
            status: TimesheetStatus.menunggu_admin,
            user: { departmentId: deptId },
          },
        }),
        this.prisma.expense.count({
          where: {
            status: ExpenseStatus.menunggu_admin,
            OR: [
              { project: { departmentId: deptId } },
              { requester: { departmentId: deptId } },
            ],
          },
        }),
        this.prisma.budgetRequest.count({
          where: {
            status: BudgetRequestStatus.menunggu_finance,
            project: { departmentId: deptId },
          },
        }),
      ]);

    // Batas nominal besar
    const currentLimitRecord = await this.prisma.approvalLimit.findFirst({
      where: { status: LimitStatus.berlaku },
      orderBy: { effectiveFrom: 'desc' },
    });
    const currentLimit = currentLimitRecord
      ? Number(currentLimitRecord.amount.toString())
      : 5000000;

    const pendingLimitChange =
      (await this.prisma.limitChangeRequest.count({
        where: { status: LimitChangeStatus.menunggu_konfirmasi },
      })) > 0;

    const earlyWarningProjects = projectHealthList.filter(
      (p) => p.isEarlyWarning,
    );

    return {
      activeProjects,
      departmentBudget,
      usedBudget,
      remainingBudget,
      absorptionPct,
      isCostHidden: isDeptLaborHidden,
      hiddenReason: isDeptLaborHidden ? deptLaborAgg.hiddenReason : null,
      pendingApprovals: {
        timesheets: pendingTimesheets,
        expenses: pendingExpenses,
        budgetRequests: pendingBudgets,
      },
      earlyWarningProjects,
      projectHealth: projectHealthList,
      currentLimit,
      pendingLimitChange,
    };
  }

  /**
   * Dashboard Finance: Ringkasan serapan anggaran seluruh perusahaan & verifikasi.
   */
  async getFinanceDashboard(user?: AuthenticatedUser) {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        projects: {
          where: { deletedAt: null },
          include: {
            budgets: {
              where: { status: BudgetStatus.aktif },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const isSuperAdmin = user?.role === Role.super_admin;
    const authUser: AuthenticatedUser = user ?? {
      id: 'finance-system',
      email: 'finance@system.local',
      role: Role.finance,
      departmentId: null,
    };

    let totalBudgetCompany = 0;
    let totalExpenseCompany = 0;

    const departmentAbsorption = await Promise.all(
      departments.map(async (dept) => {
        const budgeted = Number(dept.annualBudget.toString());
        totalBudgetCompany += budgeted;

        const projectIds = dept.projects.map((p) => p.id);

        let expenseTotal = 0;
        if (projectIds.length > 0) {
          const expenses = await this.prisma.expense.findMany({
            where: {
              projectId: { in: projectIds },
              status: {
                in: [
                  ExpenseStatus.siap_dibayar,
                  ExpenseStatus.dibayar,
                  ExpenseStatus.disetujui,
                ],
              },
            },
            select: { amount: true },
          });

          expenseTotal = expenses.reduce(
            (sum, e) => sum + Number(e.amount.toString()),
            0,
          );
        }
        totalExpenseCompany += expenseTotal;

        // Ambil agregat biaya tenaga kerja departemen dari LaborCostsService
        const deptLaborAgg =
          await this.laborCostsService.getDepartmentAggregate(
            dept.id,
            authUser,
          );

        const isDeptLaborHidden =
          deptLaborAgg.workerCount > 0 &&
          deptLaborAgg.isCostHidden &&
          !isSuperAdmin;
        const laborActual = isDeptLaborHidden
          ? null
          : deptLaborAgg.workerCount === 0
            ? 0
            : deptLaborAgg.costAmount
              ? Number(deptLaborAgg.costAmount)
              : 0;

        // Sembunyikan total aktual gabungan jika biaya tenaga kerja disembunyikan
        // agar Finance/Admin tidak dapat melakukan pengurangan (actual - expenseTotal = laborActual)
        const actual = isDeptLaborHidden
          ? null
          : expenseTotal + (laborActual ?? 0);

        const absorptionPct =
          actual !== null && budgeted > 0
            ? Math.round((actual / budgeted) * 100 * 100) / 100
            : null;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          budgeted,
          actual,
          laborActual,
          isCostHidden: isDeptLaborHidden,
          hiddenReason: isDeptLaborHidden ? deptLaborAgg.hiddenReason : null,
          absorptionPct: absorptionPct ?? 0,
        };
      }),
    );

    let hasHiddenDept = false;
    let totalUsedCompany = 0;
    for (const da of departmentAbsorption) {
      if (da.actual === null) {
        hasHiddenDept = true;
      } else {
        totalUsedCompany += da.actual;
      }
    }

    const absorptionPctCompany =
      totalBudgetCompany > 0
        ? Math.round((totalUsedCompany / totalBudgetCompany) * 100 * 100) / 100
        : 0;

    // Verifikasi Finance & Pembayaran
    const [
      pendingVerification,
      largeAmountPending,
      readyToPayExpenses,
      currentLimitRecord,
    ] = await Promise.all([
      this.prisma.expense.count({
        where: { status: ExpenseStatus.menunggu_finance },
      }),
      this.prisma.expense.count({
        where: {
          status: ExpenseStatus.menunggu_finance,
          isLargeAmount: true,
        },
      }),
      this.prisma.expense.findMany({
        where: { status: ExpenseStatus.siap_dibayar },
        select: { amount: true },
      }),
      this.prisma.approvalLimit.findFirst({
        where: { status: LimitStatus.berlaku },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    const readyToPay = readyToPayExpenses.reduce(
      (sum, e) => sum + Number(e.amount.toString()),
      0,
    );
    const readyToPayCount = readyToPayExpenses.length;
    const currentLimit = currentLimitRecord
      ? Number(currentLimitRecord.amount.toString())
      : 5000000;

    // Monthly cashflow 6 bulan terakhir
    const monthlyCashflow = await this.getMonthlyCashflow();

    // Biaya tenaga kerja teragregasi per departemen dari LaborCostsService (aman dari kebocoran)
    const laborCostByDept = await Promise.all(
      departments.map(async (dept) => {
        const agg = await this.laborCostsService.getDepartmentAggregate(
          dept.id,
          authUser,
        );

        const isHidden =
          agg.workerCount > 0 && agg.isCostHidden && !isSuperAdmin;
        const totalCost = isHidden
          ? null
          : agg.workerCount === 0
            ? 0
            : agg.costAmount
              ? Number(agg.costAmount)
              : 0;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalCost,
          isCostHidden: isHidden,
          hiddenReason: isHidden ? agg.hiddenReason : null,
        };
      }),
    );

    return {
      totalBudgetCompany,
      totalUsedCompany: hasHiddenDept ? null : totalUsedCompany,
      isTotalUsedHidden: hasHiddenDept,
      absorptionPctCompany,
      pendingVerification,
      largeAmountPending,
      readyToPay,
      readyToPayCount,
      currentLimit,
      departmentAbsorption,
      monthlyCashflow,
      laborCostByDept,
    };
  }

  /**
   * Dashboard Super Admin: Akses menyeluruh sistem, audit log, dan status proyek.
   */
  async getSuperAdminDashboard(user?: AuthenticatedUser) {
    const authUser: AuthenticatedUser = user ?? {
      id: 'super-admin-system',
      email: 'superadmin@system.local',
      role: Role.super_admin,
      departmentId: null,
    };

    const [financeData, activeProjects, totalUsers, pendingBudgetDecisions] =
      await Promise.all([
        this.getFinanceDashboard(authUser),
        this.prisma.project.count({
          where: { status: ProjectStatus.berjalan, deletedAt: null },
        }),
        this.prisma.user.count({
          where: { isActive: true, deletedAt: null },
        }),
        this.prisma.budgetRequest.count({
          where: { status: BudgetRequestStatus.menunggu_super_admin },
        }),
      ]);

    const pendingLimitChange =
      (await this.prisma.limitChangeRequest.count({
        where: { status: LimitChangeStatus.menunggu_konfirmasi },
      })) > 0;

    // Ambil kesehatan seluruh proyek (Super Admin menerima angka eksak tanpa disembunyikan)
    const allProjects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        department: { select: { id: true, name: true } },
        tasks: { where: { deletedAt: null } },
        budgets: {
          where: { status: BudgetStatus.aktif },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const projectHealth = await Promise.all(
      allProjects.map(async (p) => {
        const activeBudget = p.budgets[0];
        const budgeted = activeBudget
          ? Number(activeBudget.totalAmount.toString())
          : 0;

        const expenses = await this.prisma.expense.findMany({
          where: {
            projectId: p.id,
            status: {
              in: [
                ExpenseStatus.siap_dibayar,
                ExpenseStatus.dibayar,
                ExpenseStatus.disetujui,
              ],
            },
          },
          select: { amount: true },
        });

        // Agregat proyek via LaborCostsService
        const laborAgg = await this.laborCostsService.getProjectAggregate(
          p.id,
          authUser,
        );

        const laborCost = laborAgg.costAmount
          ? Number(laborAgg.costAmount)
          : 0;

        const expenseCost = expenses.reduce(
          (sum, e) => sum + Number(e.amount.toString()),
          0,
        );

        const actual = expenseCost + laborCost;

        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter(
          (t) => t.status === 'selesai',
        ).length;
        const progressPercent =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100
            : 0;

        const absorptionPct =
          budgeted > 0 ? Math.round((actual / budgeted) * 100 * 100) / 100 : 0;

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          progressPercent,
          absorptionPct,
          isEarlyWarning:
            absorptionPct > progressPercent && progressPercent < 100,
          isOverBudget: actual > budgeted && budgeted > 0,
          totalActual: actual,
          laborCost,
          isCostHidden: false,
          hiddenReason: null,
          department: p.department,
        };
      }),
    );

    // 10 Aktivitas terbaru
    const recentActivities = await this.prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalBudgetCompany: financeData.totalBudgetCompany,
      totalUsedCompany: financeData.totalUsedCompany,
      absorptionPctCompany: financeData.absorptionPctCompany,
      activeProjects,
      totalUsers,
      pendingBudgetDecisions,
      currentLimit: financeData.currentLimit,
      pendingLimitChange,
      departmentAbsorption: financeData.departmentAbsorption,
      projectHealth,
      recentActivities,
    };
  }

  private async getMonthlyCashflow() {
    const months: { month: string; label: string; start: Date; end: Date }[] =
      [];
    const now = new Date();

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = `${monthNames[monthIndex]} ${year}`;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0, 23, 59, 59);

      months.push({ month: monthStr, label, start, end });
    }

    return Promise.all(
      months.map(async (m) => {
        const [allExp, paidExp] = await Promise.all([
          this.prisma.expense.findMany({
            where: {
              expenseDate: { gte: m.start, lte: m.end },
              status: { not: ExpenseStatus.ditolak },
            },
            select: { amount: true },
          }),
          this.prisma.expense.findMany({
            where: {
              expenseDate: { gte: m.start, lte: m.end },
              status: ExpenseStatus.dibayar,
            },
            select: { amount: true },
          }),
        ]);

        const totalExpenses = allExp.reduce(
          (sum, e) => sum + Number(e.amount.toString()),
          0,
        );
        const paidExpenses = paidExp.reduce(
          (sum, e) => sum + Number(e.amount.toString()),
          0,
        );

        return {
          month: m.month,
          label: m.label,
          totalExpenses,
          paidExpenses,
        };
      }),
    );
  }
}
