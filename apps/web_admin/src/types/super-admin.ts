import type { Role } from './auth';

export interface DepartmentSummary {
  id: string;
  name: string;
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  department?: DepartmentSummary | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
  includeDeleted?: boolean;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  departmentId?: string | null;
  jobTitle?: string | null;
  password?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  departmentId?: string | null;
  jobTitle?: string | null;
  isActive?: boolean;
  password?: string;
}

export interface ResetPasswordResponse {
  message: string;
  userId: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export interface CreateUserResponse extends SuperAdminUser {
  initialPassword?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  headUserId: string | null;
  annualBudget: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  headUser?: { id: string; name: string; email: string } | null;
  _count?: { users: number; costCenters: number; projects: number };
}

export interface DepartmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateDepartmentPayload {
  name: string;
  headUserId?: string | null;
  annualBudget?: number;
}

export interface UpdateDepartmentPayload {
  name?: string;
  headUserId?: string | null;
  annualBudget?: number;
  isActive?: boolean;
}

export interface CostCenterItem {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string };
  _count?: { projects: number; expenses: number };
}

export interface CostCenterQueryParams {
  page?: number;
  limit?: number;
  departmentId?: string;
  search?: string;
  isActive?: boolean;
}

export interface CreateCostCenterPayload {
  code: string;
  name: string;
  departmentId: string;
}

export interface UpdateCostCenterPayload {
  code?: string;
  name?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  code: string;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number };
}

export interface CreateExpenseCategoryPayload {
  name: string;
  code: string;
  color?: string;
}

export interface UpdateExpenseCategoryPayload {
  name?: string;
  code?: string;
  color?: string;
  isActive?: boolean;
}

export interface ProjectTypeItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
}

export interface CreateProjectTypePayload {
  name: string;
}

export interface UpdateProjectTypePayload {
  name?: string;
  isActive?: boolean;
}

export interface ActivityLogUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  entityId: string | null;
  beforeData: Record<string, any> | null;
  afterData: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: ActivityLogUser | null;
}

export interface ActivityLogQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

