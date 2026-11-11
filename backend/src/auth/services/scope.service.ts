import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface UserScopeContext {
  id: string;
  role: Role;
  departmentId?: string | null;
}

export type ScopeFilter =
  | { type: 'self'; userId: string }
  | { type: 'department'; departmentId: string | null }
  | { type: 'all' };

@Injectable()
export class ScopeService {
  /**
   * Mengembalikan filter data per peran:
   * - pengguna -> userId sendiri
   * - admin -> departmentId
   * - finance dan super_admin -> tanpa filter
   */
  getScope(user: UserScopeContext): ScopeFilter {
    switch (user.role) {
      case Role.pengguna:
        return { type: 'self', userId: user.id };
      case Role.admin:
        return {
          type: 'department',
          departmentId: user.departmentId ?? null,
        };
      case Role.finance:
      case Role.super_admin:
        return { type: 'all' };
      default:
        return { type: 'self', userId: user.id };
    }
  }

  /**
   * Menghasilkan klausul WHERE untuk query database Prisma sesuai peran:
   * - pengguna: { [userField]: user.id }
   * - admin: { [departmentField]: user.departmentId }
   * - finance & super_admin: {} (tanpa filter)
   */
  getPrismaWhereClause(
    user: UserScopeContext,
    fieldMapping: { userField?: string; departmentField?: string } = {},
  ): Record<string, any> {
    const userField = fieldMapping.userField ?? 'createdById';
    const departmentField = fieldMapping.departmentField ?? 'departmentId';

    switch (user.role) {
      case Role.pengguna:
        return { [userField]: user.id };
      case Role.admin:
        return { [departmentField]: user.departmentId ?? undefined };
      case Role.finance:
      case Role.super_admin:
        return {};
      default:
        return { [userField]: user.id };
    }
  }
}
