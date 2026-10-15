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
