import { api } from './api';
import type { LaborCostAggregate } from '@/types';

export interface LaborCostQueryParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  departmentId?: string;
}

export async function getProjectLaborCostApi(
  projectId: string,
  params?: LaborCostQueryParams,
): Promise<LaborCostAggregate> {
  const { data } = await api.get<LaborCostAggregate>(`/labor-costs/projects/${projectId}`, {
    params,
  });
  return data;
}

export async function getDepartmentLaborCostApi(
  departmentId: string,
  params?: LaborCostQueryParams,
): Promise<LaborCostAggregate> {
  const { data } = await api.get<LaborCostAggregate>(
    `/labor-costs/departments/${departmentId}`,
    { params },
  );
  return data;
}

/** Ambil agregat biaya tenaga kerja fleksibel (berdasarkan projectId atau departmentId) */
export async function getAggregateLaborCostApi(
  params: LaborCostQueryParams,
): Promise<LaborCostAggregate> {
  const { data } = await api.get<LaborCostAggregate>('/labor-costs/aggregate', { params });
  return data;
}
