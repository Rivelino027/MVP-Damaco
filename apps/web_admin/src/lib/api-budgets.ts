import { api } from './api';
import type {
  Budget,
  BudgetRequest,
  BudgetRequestQuery,
  ApproveBudgetPayload,
  RejectBudgetPayload,
  BudgetSummary,
  CreateBudgetRequestPayload,
} from '@/types/budgets';

export interface PaginatedBudgetRequests {
  data: BudgetRequest[];
  total: number;
  page: number;
  limit: number;
}

/** Ambil daftar pengajuan anggaran */
export async function getBudgetRequests(params?: BudgetRequestQuery): Promise<PaginatedBudgetRequests> {
  const { data } = await api.get<PaginatedBudgetRequests>('/budget-requests', { params });
  return data;
}

/** Ambil detail pengajuan anggaran */
export async function getBudgetRequestById(id: string): Promise<BudgetRequest> {
  const { data } = await api.get<BudgetRequest>(`/budget-requests/${id}`);
  return data;
}

/** Ambil anggaran aktif suatu proyek */
export async function getActiveBudget(projectId: string): Promise<Budget | null> {
  const { data } = await api.get<Budget | null>(`/projects/${projectId}/budget/active`);
  return data;
}

/** Ambil ringkasan anggaran proyek (Budget vs Aktual) */
export async function getBudgetSummary(projectId: string): Promise<BudgetSummary> {
  const { data } = await api.get<BudgetSummary>(`/projects/${projectId}/budget/summary`);
  return data;
}

/** Finance: cek kelayakan anggaran (langkah 2) */
export async function approveBudgetFinance(id: string, payload?: ApproveBudgetPayload): Promise<BudgetRequest> {
  const { data } = await api.post<BudgetRequest>(`/budget-requests/${id}/approve`, payload ?? {});
  return data;
}

/** Super Admin: putuskan anggaran (langkah 3) */
export async function approveBudgetSuperAdmin(id: string, payload?: ApproveBudgetPayload): Promise<BudgetRequest> {
  const { data } = await api.post<BudgetRequest>(`/budget-requests/${id}/approve`, payload ?? {});
  return data;
}

/** Tolak pengajuan anggaran */
export async function rejectBudgetRequest(id: string, payload: RejectBudgetPayload): Promise<BudgetRequest> {
  const { data } = await api.post<BudgetRequest>(`/budget-requests/${id}/reject`, payload);
  return data;
}

/** Admin/Super Admin: buat pengajuan anggaran baru */
export async function createBudgetRequestApi(payload: CreateBudgetRequestPayload): Promise<BudgetRequest> {
  const { data } = await api.post<BudgetRequest>('/budget-requests', payload);
  return data;
}

/** Admin: ajukan draft anggaran ke rantai persetujuan */
export async function submitBudgetRequestApi(id: string): Promise<BudgetRequest> {
  const { data } = await api.post<BudgetRequest>(`/budget-requests/${id}/submit`);
  return data;
}
