import { api } from './api';
import type {
  CreateUserPayload,
  CreateUserResponse,
  DepartmentItem,
  DepartmentQueryParams,
  PaginatedResponse,
  ResetPasswordResponse,
  SuperAdminUser,
  UpdateUserPayload,
  UserQueryParams,
} from '@/types';

/**
 * Super Admin Users API
 */
export async function getUsersApi(
  params?: UserQueryParams,
): Promise<PaginatedResponse<SuperAdminUser>> {
  const { data } = await api.get<PaginatedResponse<SuperAdminUser>>('/users', {
    params,
  });
  return data;
}

export async function getUserApi(id: string): Promise<SuperAdminUser> {
  const { data } = await api.get<SuperAdminUser>(`/users/${id}`);
  return data;
}

export async function createUserApi(
  payload: CreateUserPayload,
): Promise<CreateUserResponse> {
  const { data } = await api.post<CreateUserResponse>('/users', payload);
  return data;
}

export async function updateUserApi(
  id: string,
  payload: UpdateUserPayload,
): Promise<SuperAdminUser> {
  const { data } = await api.patch<SuperAdminUser>(`/users/${id}`, payload);
  return data;
}

export async function updateUserStatusApi(
  id: string,
  isActive: boolean,
): Promise<SuperAdminUser> {
  const { data } = await api.patch<SuperAdminUser>(`/users/${id}/status`, {
    isActive,
  });
  return data;
}

export async function deleteUserApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(`/users/${id}`);
  return data;
}

export async function resetUserPasswordApi(
  id: string,
): Promise<ResetPasswordResponse> {
  const { data } = await api.post<ResetPasswordResponse>(
    `/users/${id}/reset-password`,
  );
  return data;
}

/**
 * Super Admin Departments API (untuk dropdown departemen dan master data)
 */
export async function getDepartmentsApi(
  params?: DepartmentQueryParams,
): Promise<PaginatedResponse<DepartmentItem>> {
  const { data } = await api.get<PaginatedResponse<DepartmentItem>>('/departments', {
    params,
  });
  return data;
}
