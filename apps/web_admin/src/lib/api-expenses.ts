import { api } from './api';
import type {
  Expense,
  ExpenseQuery,
  RejectExpensePayload,
  RecordPaymentPayload,
  ExpenseAttachment,
} from '@/types/expenses';

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

/** Ambil daftar pengeluaran (admin: dept saja; finance: semua; super_admin: semua) */
export async function getExpenses(params?: ExpenseQuery): Promise<PaginatedExpenses> {
  const { data } = await api.get<PaginatedExpenses>('/expenses', { params });
  return data;
}

/** Ambil detail satu pengeluaran */
export async function getExpenseById(id: string): Promise<Expense> {
  const { data } = await api.get<Expense>(`/expenses/${id}`);
  return data;
}

/** Admin menyetujui pengeluaran (langkah 1) */
export async function approveExpenseAdmin(id: string): Promise<Expense> {
  const { data } = await api.post<Expense>(`/expenses/${id}/approve`);
  return data;
}

/** Admin menolak pengeluaran */
export async function rejectExpenseAdmin(id: string, payload: RejectExpensePayload): Promise<Expense> {
  const { data } = await api.post<Expense>(`/expenses/${id}/reject`, payload);
  return data;
}

/** Finance memverifikasi pengeluaran (langkah 2) */
export async function verifyExpenseFinance(id: string): Promise<Expense> {
  const { data } = await api.post<Expense>(`/expenses/${id}/verify`);
  return data;
}

/** Finance menolak pengeluaran (langkah 2) */
export async function rejectExpenseFinance(id: string, payload: RejectExpensePayload): Promise<Expense> {
  const { data } = await api.post<Expense>(`/expenses/${id}/reject`, payload);
  return data;
}

/** Finance mencatat pembayaran */
export async function recordPayment(id: string, payload: RecordPaymentPayload): Promise<Expense> {
  const { data } = await api.post<Expense>(`/expenses/${id}/payment`, payload);
  return data;
}

/** Ambil daftar lampiran/nota pengeluaran */
export async function getExpenseAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
  const { data } = await api.get<ExpenseAttachment[]>(`/expenses/${expenseId}/attachments`);
  return data;
}

/**
 * Unduh nota sebagai blob (terautentikasi via axios).
 * Mengembalikan object URL sementara — panggil URL.revokeObjectURL() setelah digunakan.
 */
export async function downloadExpenseAttachment(
  expenseId: string,
  attachmentId: string,
): Promise<string> {
  const response = await api.get(
    `/expenses/${expenseId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  );
  return URL.createObjectURL(response.data as Blob);
}

/** Hapus nota (pengaju saja, status draft/ditolak) */
export async function deleteExpenseAttachment(
  expenseId: string,
  attachmentId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/expenses/${expenseId}/attachments/${attachmentId}`,
  );
  return data;
}

/** Upload nota baru (multipart/form-data) */
export async function uploadExpenseAttachment(
  expenseId: string,
  file: File,
): Promise<ExpenseAttachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ExpenseAttachment>(
    `/expenses/${expenseId}/attachments`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
