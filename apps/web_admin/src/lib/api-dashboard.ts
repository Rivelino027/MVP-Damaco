import { api } from './api';

// ─── Types dashboard ────────────────────────────────────────

export interface ProjectHealthItem {
  id: string;
  name: string;
  status: string;
  progressPercent: number | string;
  absorptionPct: number;
  isEarlyWarning: boolean;
  isOverBudget: boolean;
  department?: { id: string; name: string } | null;
  isCostHidden?: boolean;
  hiddenReason?: string | null;
}

export interface PendingApprovalSummary {
  timesheets: number;
  expenses: number;
  budgetRequests: number;
}

export interface AdminDashboard {
  activeProjects: number;
  departmentBudget: string | number;
  usedBudget: string | number | null;
  remainingBudget: string | number | null;
  absorptionPct: number;
  isCostHidden?: boolean;
  hiddenReason?: string | null;
  pendingApprovals: PendingApprovalSummary;
  earlyWarningProjects: ProjectHealthItem[];
  projectHealth: ProjectHealthItem[];
  currentLimit: string | number | null;
  pendingLimitChange: boolean;
}

export interface DepartmentAbsorption {
  departmentId: string;
  departmentName: string;
  budgeted: string | number;
  actual: string | number | null;
  laborActual?: string | number | null;
  isCostHidden?: boolean;
  hiddenReason?: string | null;
  absorptionPct: number;
}

export interface MonthlyCashflow {
  month: string; // "2026-01"
  label: string; // "Jan 2026"
  totalExpenses: string | number;
  paidExpenses: string | number;
}

export interface FinanceDashboard {
  totalBudgetCompany: string | number;
  totalUsedCompany: string | number | null;
  isTotalUsedHidden?: boolean;
  absorptionPctCompany: number;
  pendingVerification: number;
  largeAmountPending: number;
  readyToPay: string | number; // total jumlah siap dibayar
  readyToPayCount: number;
  currentLimit: string | number | null;
  departmentAbsorption: DepartmentAbsorption[];
  monthlyCashflow: MonthlyCashflow[];
  laborCostByDept: {
    departmentId: string;
    departmentName: string;
    totalCost: string | number | null;
    isCostHidden?: boolean;
    hiddenReason?: string | null;
  }[];
}

export interface RecentActivity {
  id: string;
  action: string;
  module: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface SuperAdminDashboard {
  totalBudgetCompany: string | number;
  totalUsedCompany: string | number | null;
  isTotalUsedHidden?: boolean;
  absorptionPctCompany: number;
  activeProjects: number;
  totalUsers: number;
  pendingBudgetDecisions: number;
  currentLimit: string | number | null;
  pendingLimitChange: boolean;
  departmentAbsorption: DepartmentAbsorption[];
  projectHealth: ProjectHealthItem[];
  recentActivities: RecentActivity[];
}

// ─── API calls ─────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<AdminDashboard>('/dashboard/admin');
  return data;
}

export async function getFinanceDashboard(): Promise<FinanceDashboard> {
  const { data } = await api.get<FinanceDashboard>('/dashboard/finance');
  return data;
}

export async function getSuperAdminDashboard(): Promise<SuperAdminDashboard> {
  const { data } = await api.get<SuperAdminDashboard>('/dashboard/super-admin');
  return data;
}
