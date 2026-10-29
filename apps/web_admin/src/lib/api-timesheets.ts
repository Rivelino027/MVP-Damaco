import { api } from './api';
import type { Timesheet, TimesheetQuery } from '@/types';

export interface PaginatedTimesheetsResponse {
  data: Timesheet[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getTeamTimesheetsApi(
  params?: TimesheetQuery,
): Promise<PaginatedTimesheetsResponse> {
  const { data } = await api.get<PaginatedTimesheetsResponse>('/timesheets/team', { params });
  return data;
}

export async function getMyTimesheetsApi(
  params?: TimesheetQuery,
): Promise<PaginatedTimesheetsResponse> {
  const { data } = await api.get<PaginatedTimesheetsResponse>('/timesheets/my', { params });
  return data;
}

export async function getTimesheetDetailApi(id: string): Promise<Timesheet> {
  const { data } = await api.get<Timesheet>(`/timesheets/${id}`);
  return data;
}

export async function approveTimesheetApi(id: string): Promise<Timesheet> {
  const { data } = await api.post<Timesheet>(`/timesheets/${id}/approve`);
  return data;
}

export async function rejectTimesheetApi(
  id: string,
  reason: string,
): Promise<Timesheet> {
  const { data } = await api.post<Timesheet>(`/timesheets/${id}/reject`, { reason });
  return data;
}
