// Types untuk Pengeluaran (Expenses) - Phase 4

export type ExpenseStatus =
  | 'draft'
  | 'menunggu_admin'
  | 'menunggu_finance'
  | 'disetujui'
  | 'ditolak'
  | 'siap_dibayar'
  | 'dibayar';

export type PaymentMethod = 'transfer' | 'tunai';
export type LimitChangeStatus = 'diusulkan' | 'menunggu_konfirmasi' | 'berlaku' | 'ditolak';
export type FlagType = 'terindikasi_dipecah' | 'vendor_baru';

export interface ExpenseFlag {
  id: string;
  expenseId: string;
  flagType: FlagType;
  relatedExpenseIds: string[] | null;
  detectedAt: string;
  reviewedBy: string | null;
}

export interface ExpenseApprovalHistory {
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

export interface Payment {
  id: string;
  expenseId: string;
  paidBy: string;
  paidAt: string;
  method: PaymentMethod;
  referenceNo: string | null;
  amount: string | number;
  createdAt: string;
}

export interface ExpenseAttachment {
  id: string;
  ownerId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  requesterId: string;
  projectId: string;
  taskId: string | null;
  costCenterId: string;
  categoryId: string;
  amount: string | number;
  expenseDate: string;
  vendor: string | null;
  note: string | null;
  status: ExpenseStatus;
  isLargeAmount: boolean;
  limitAtSubmission: string | number | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    name: string;
    email: string;
    department?: { id: string; name: string } | null;
  };
  project?: { id: string; name: string };
  task?: { id: string; title: string } | null;
  costCenter?: { id: string; code: string; name: string };
  category?: { id: string; name: string };
  payment?: Payment | null;
  flags?: ExpenseFlag[];
  approvalHistory?: ExpenseApprovalHistory[];
  attachments?: ExpenseAttachment[];
}

export interface ExpenseQuery {
  status?: string;
  projectId?: string;
  isLargeAmount?: boolean;
  page?: number;
  limit?: number;
}

export interface ApproveExpensePayload {
  reason?: string;
}

export interface RejectExpensePayload {
  reason: string;
}

export interface RecordPaymentPayload {
  method: PaymentMethod;
  referenceNo?: string;
  paidAt: string;
}

// Batas Nominal Besar

export interface ApprovalLimit {
  id: string;
  amount: string | number;
  effectiveFrom: string;
  status: 'berlaku' | 'digantikan';
  confirmedAt: string | null;
}

export interface LimitChangeRequest {
  id: string;
  oldAmount: string | number;
  newAmount: string | number;
  reason: string | null;
  proposedBy: string;
  proposerRole: string;
  confirmedBy: string | null;
  confirmerRole: string | null;
  status: LimitChangeStatus;
  createdAt: string;
  decidedAt: string | null;
  proposer?: { id: string; name: string };
  confirmer?: { id: string; name: string } | null;
}

export interface ProposeLimitPayload {
  newAmount: number;
  reason?: string;
}

export interface ConfirmLimitPayload {
  decision: 'berlaku' | 'ditolak';
  reason?: string;
}
