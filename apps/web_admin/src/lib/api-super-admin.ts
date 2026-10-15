import { api } from './api';
import type {
  ActivityLogItem,
  ActivityLogQueryParams,
  CostCenterItem,
  CostCenterQueryParams,
  CreateCostCenterPayload,
  CreateDepartmentPayload,
  CreateExpenseCategoryPayload,
  CreateProjectTypePayload,
  CreateUserPayload,
  CreateUserResponse,
  DepartmentItem,
  DepartmentQueryParams,
  ExpenseCategoryItem,
  PaginatedResponse,
  ProjectTypeItem,
  ResetPasswordResponse,
  SuperAdminUser,
  UpdateCostCenterPayload,
  UpdateDepartmentPayload,
  UpdateExpenseCategoryPayload,
  UpdateProjectTypePayload,
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
 * Super Admin Departments API
 */
export async function getDepartmentsApi(
  params?: DepartmentQueryParams,
): Promise<PaginatedResponse<DepartmentItem>> {
  const { data } = await api.get<PaginatedResponse<DepartmentItem>>('/departments', {
    params,
  });
  return data;
}

export async function getDepartmentApi(id: string): Promise<DepartmentItem> {
  const { data } = await api.get<DepartmentItem>(`/departments/${id}`);
  return data;
}

export async function createDepartmentApi(
  payload: CreateDepartmentPayload,
): Promise<DepartmentItem> {
  const { data } = await api.post<DepartmentItem>('/departments', payload);
  return data;
}

export async function updateDepartmentApi(
  id: string,
  payload: UpdateDepartmentPayload,
): Promise<DepartmentItem> {
  const { data } = await api.patch<DepartmentItem>(`/departments/${id}`, payload);
  return data;
}

export async function deleteDepartmentApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(
    `/departments/${id}`,
  );
  return data;
}

/**
 * Super Admin Cost Centers API
 */
export async function getCostCentersApi(
  params?: CostCenterQueryParams,
): Promise<PaginatedResponse<CostCenterItem>> {
  const { data } = await api.get<PaginatedResponse<CostCenterItem>>('/cost-centers', {
    params,
  });
  return data;
}

export async function getCostCenterApi(id: string): Promise<CostCenterItem> {
  const { data } = await api.get<CostCenterItem>(`/cost-centers/${id}`);
  return data;
}

export async function createCostCenterApi(
  payload: CreateCostCenterPayload,
): Promise<CostCenterItem> {
  const { data } = await api.post<CostCenterItem>('/cost-centers', payload);
  return data;
}

export async function updateCostCenterApi(
  id: string,
  payload: UpdateCostCenterPayload,
): Promise<CostCenterItem> {
  const { data } = await api.patch<CostCenterItem>(`/cost-centers/${id}`, payload);
  return data;
}

export async function deleteCostCenterApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(
    `/cost-centers/${id}`,
  );
  return data;
}

/**
 * Super Admin Expense Categories API (Master Data)
 */
export async function getExpenseCategoriesApi(
  isActive?: boolean,
): Promise<ExpenseCategoryItem[]> {
  const { data } = await api.get<ExpenseCategoryItem[]>('/expense-categories', {
    params: isActive !== undefined ? { isActive } : undefined,
  });
  return data;
}

export async function createExpenseCategoryApi(
  payload: CreateExpenseCategoryPayload,
): Promise<ExpenseCategoryItem> {
  const { data } = await api.post<ExpenseCategoryItem>(
    '/expense-categories',
    payload,
  );
  return data;
}

export async function updateExpenseCategoryApi(
  id: string,
  payload: UpdateExpenseCategoryPayload,
): Promise<ExpenseCategoryItem> {
  const { data } = await api.patch<ExpenseCategoryItem>(
    `/expense-categories/${id}`,
    payload,
  );
  return data;
}

export async function deleteExpenseCategoryApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(
    `/expense-categories/${id}`,
  );
  return data;
}

/**
 * Super Admin Project Types API (Master Data)
 */
export async function getProjectTypesApi(
  isActive?: boolean,
): Promise<ProjectTypeItem[]> {
  const { data } = await api.get<ProjectTypeItem[]>('/project-types', {
    params: isActive !== undefined ? { isActive } : undefined,
  });
  return data;
}

export async function createProjectTypeApi(
  payload: CreateProjectTypePayload,
): Promise<ProjectTypeItem> {
  const { data } = await api.post<ProjectTypeItem>('/project-types', payload);
  return data;
}

export async function updateProjectTypeApi(
  id: string,
  payload: UpdateProjectTypePayload,
): Promise<ProjectTypeItem> {
  const { data } = await api.patch<ProjectTypeItem>(`/project-types/${id}`, payload);
  return data;
}

export async function deleteProjectTypeApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(
    `/project-types/${id}`,
  );
  return data;
}

/**
 * Super Admin Activity Logs API
 */
export async function getActivityLogsApi(
  params?: ActivityLogQueryParams,
): Promise<PaginatedResponse<ActivityLogItem>> {
  const { data } = await api.get<PaginatedResponse<ActivityLogItem>>('/activity-logs', {
    params,
  });
  return data;
}

