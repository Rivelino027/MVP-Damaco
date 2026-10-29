import type { Role } from './auth';

export type TimesheetStatus = 'draft' | 'menunggu_admin' | 'disetujui' | 'ditolak';

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  taskId: string;
  workDate: string;
  hours: number;
  description: string | null;
  costAmount?: string | number | null;
  task?: {
    id: string;
    title: string;
    projectId?: string;
    project?: {
      id: string;
      name: string;
    };
  };
}

export interface TimesheetApprovalHistory {
  id: string;
  stepOrder: number;
  role: string;
  status: string;
  actedAt: string | null;
  reason: string | null;
  approver?: {
    id: string;
    name: string;
  } | null;
}

export interface Timesheet {
  id: string;
  userId: string;
  weekStart: string;
  status: TimesheetStatus;
  totalHours: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: {
      id: string;
      name: string;
    } | null;
  };
  entries?: TimesheetEntry[];
  approvalHistory?: TimesheetApprovalHistory[];
}

export interface TimesheetQuery {
  weekStart?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface HourlyCost {
  id: string;
  userId: string;
  ratePerHour: string | number;
  effectiveFrom: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: Role;
    departmentId?: string | null;
    department?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface CreateHourlyCostPayload {
  userId: string;
  ratePerHour: number;
  effectiveFrom: string;
}

export interface LaborCostAggregate {
  workerCount: number;
  totalHours: number;
  costAmount: string | number | null;
  totalCost?: string | number | null;
  totalLaborCost?: string | number | null;
  isCostHidden: boolean;
  hiddenReason?: string | null;
}
