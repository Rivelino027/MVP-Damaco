import { api } from './api';
import type {
  ApprovalLimit,
  LimitChangeRequest,
  ProposeLimitPayload,
  ConfirmLimitPayload,
} from '@/types/expenses';

/** Ambil batas Nominal Besar yang sedang berlaku */
export async function getCurrentLimit(): Promise<ApprovalLimit | null> {
  const { data } = await api.get<ApprovalLimit | null>('/expenses/limit/current');
  return data;
}

/** Ambil riwayat perubahan batas */
export async function getLimitHistory(): Promise<LimitChangeRequest[]> {
  const { data } = await api.get<LimitChangeRequest[]>('/expenses/limit/history');
  return data;
}

/** Admin atau Finance mengusulkan perubahan batas */
export async function proposeLimit(payload: ProposeLimitPayload): Promise<LimitChangeRequest> {
  const { data } = await api.post<LimitChangeRequest>('/expenses/limit/propose', payload);
  return data;
}

/** Admin atau Finance mengonfirmasi / menolak usulan batas */
export async function confirmLimit(id: string, payload: ConfirmLimitPayload): Promise<LimitChangeRequest> {
  const { data } = await api.post<LimitChangeRequest>(`/expenses/limit/${id}/confirm`, payload);
  return data;
}
