export type Role = 'pengguna' | 'admin' | 'finance' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  message: string;
  statusCode: number;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  mustChangePassword: boolean;
}
