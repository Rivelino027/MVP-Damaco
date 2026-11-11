import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membersihkan data secara rekursif agar password_hash, token,
   * dan informasi rahasia lainnya TIDAK PERNAH masuk ke activity_logs,
   * serta memastikan objek Decimal/Date diserialisasi dengan aman.
   */
  sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    // Tangani objek Prisma Decimal atau number-like objects
    if (
      typeof data === 'object' &&
      (typeof data.toFixed === 'function' ||
        typeof data.toNumber === 'function' ||
        data.constructor?.name === 'Decimal')
    ) {
      return data.toString();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data !== 'object') {
      return data;
    }

    const sensitiveKeyPatterns = [
      'password',
      'passwordhash',
      'password_hash',
      'token',
      'tokenhash',
      'token_hash',
      'refreshtoken',
      'refresh_token',
      'rawtoken',
      'initialpassword',
      'initial_password',
      'secret',
    ];

    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Jangan pernah serialisasi properti constructor, prototype, atau function
      if (key === 'constructor' || typeof value === 'function') {
        continue;
      }

      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isSensitive = sensitiveKeyPatterns.some(
        (pattern) =>
          normalizedKey === pattern.replace(/[^a-z0-9]/g, '') ||
          normalizedKey.includes('password') ||
          normalizedKey.includes('token') ||
          normalizedKey.includes('secret'),
      );

      if (isSensitive) {
        continue;
      }

      clean[key] = this.sanitizeData(value);
    }

    return clean;
  }

  async log(params: AuditLogParams): Promise<void> {
    const cleanBefore = params.beforeData
      ? this.sanitizeData(params.beforeData)
      : null;
    const cleanAfter = params.afterData
      ? this.sanitizeData(params.afterData)
      : null;

    await this.prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        module: params.module,
        entityId: params.entityId ?? null,
        beforeData: cleanBefore,
        afterData: cleanAfter,
        ipAddress: params.ipAddress ?? null,
      },
    });
  }
}
