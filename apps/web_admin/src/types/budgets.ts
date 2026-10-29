// Types untuk Anggaran (Budget) - Phase 5

export type BudgetStatus = 'draft' | 'aktif' | 'digantikan';
export type BudgetRequestType = 'awal' | 'perubahan';
export type BudgetRequestStatus =
  | 'draft'
  | 'menunggu_admin'
  | 'menunggu_finance'
  | 'menunggu_super_admin'
  | 'disetujui'
  | 'ditolak';

export interface BudgetItem {
  id: string;
  budgetId: string;
  phaseId: string | null;
  categoryId: string;
  amount: string | number;
  phase?: { id: string; name: string } | null;
  category?: { id: string; name: string };
}

export interface Budget {
  id: string;
  projectId: string;
  version: number;
  status: BudgetStatus;
  totalAmount: string | number;
  isBaseline: boolean;
  lockedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  items?: BudgetItem[];
  project?: { id: string; name: string };
}

export interface BudgetRequestItem {
  id: string;
  requestId: string;
  phaseId: string | null;
  categoryId: string;
  oldAmount: string | number;
  newAmount: string | number;
  phase?: { id: string; name: string } | null;
  category?: { id: string; name: string };
}

export interface BudgetApprovalHistory {
  id: string;
  stepOrder: number;
  role: string;
  status: string;
  actedAt: string | null;
  reason: string | null;
  approver?: { id: string; name: string } | null;
}

export interface BudgetRequest {
  id: string;
  projectId: string;
  type: BudgetRequestType;
  requestedById: string;
  totalAmount: string | number;
  extraAmount: string | number | null;
  newEndDate: string | null;
  reason: string | null;
  status: BudgetRequestStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; department?: { id: string; name: string } | null };
  requestedBy?: { id: string; name: string };
  items?: BudgetRequestItem[];
  approvalHistory?: BudgetApprovalHistory[];
}

export interface BudgetRequestQuery {
  status?: string;
  projectId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface ApproveBudgetPayload {
  reason?: string;
}

export interface RejectBudgetPayload {
  reason: string;
}

// Ringkasan per kategori untuk tampilan grafik
export interface BudgetCategorySummary {
  categoryId: string;
  categoryName: string;
  budgeted: string | number;
  actual: string | number;
  absorptionPct: number;
}

export interface BudgetSummary {
  projectId: string;
  totalBudgeted: string | number;
  totalActual: string | number | null;
  laborActual?: string | number | null;
  isCostHidden?: boolean;
  hiddenReason?: string | null;
  absorptionPct: number | null;
  progressPct: number;
  isEarlyWarning: boolean; // serapan > progres
  isOverBudget: boolean;
  categories: BudgetCategorySummary[];
  budget?: Budget | null;
}

export interface CreateBudgetRequestItemPayload {
  phaseId?: string | null;
  categoryId: string;
  newAmount: number;
  oldAmount?: number;
}

export interface CreateBudgetRequestPayload {
  projectId: string;
  type: BudgetRequestType;
  reason?: string;
  newEndDate?: string;
  items: CreateBudgetRequestItemPayload[];
  submitNow?: boolean;
}
