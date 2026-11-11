import { api } from './api';
import type { CreateHourlyCostPayload, HourlyCost } from '@/types';

export interface PaginatedHourlyCostsResponse {
  data: HourlyCost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getHourlyCostsApi(params?: {
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedHourlyCostsResponse> {
  const { data } = await api.get<PaginatedHourlyCostsResponse>('/hourly-costs', { params });
  return data;
}

export async function getUserHourlyCostHistoryApi(
  userId: string,
): Promise<HourlyCost[]> {
  const { data } = await api.get<HourlyCost[]>(`/hourly-costs/users/${userId}`);
  return data;
}

export async function createHourlyCostApi(
  payload: CreateHourlyCostPayload,
): Promise<HourlyCost> {
  const { data } = await api.post<HourlyCost>('/hourly-costs', payload);
  return data;
}
