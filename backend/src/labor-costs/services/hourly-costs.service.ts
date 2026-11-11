import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../super-admin/services/audit-logger.service';
import { parseDateOnly } from '../../timesheets/timesheets.service';
import { CreateHourlyCostDto } from '../dto/create-hourly-cost.dto';
import { HourlyCostQueryDto } from '../dto/hourly-cost-query.dto';

@Injectable()
export class HourlyCostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Menambahkan tarif per jam baru untuk pengguna (Super Admin only).
   */
  async create(dto: CreateHourlyCostDto, user: AuthenticatedUser, ip?: string) {
    if (dto.ratePerHour <= 0) {
      throw new BadRequestException('Tarif per jam harus lebih besar dari 0');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!targetUser || targetUser.deletedAt) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const effectiveDate = parseDateOnly(dto.effectiveFrom).utcDate;

    // Cek duplikasi tarif pada user dan effectiveFrom yang sama
    const existing = await this.prisma.hourlyCost.findFirst({
      where: {
        userId: dto.userId,
        effectiveFrom: effectiveDate,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Tarif per jam untuk pengguna dan tanggal berlaku ini sudah ada',
      );
    }

    const created = await this.prisma.hourlyCost.create({
      data: {
        userId: dto.userId,
        ratePerHour: new Prisma.Decimal(dto.ratePerHour),
        effectiveFrom: effectiveDate,
        setBy: user.id,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_hourly_cost',
      module: 'hourly_costs',
      entityId: created.id,
      afterData: {
        userId: dto.userId,
        effectiveFrom: dto.effectiveFrom,
      },
      ipAddress: ip,
    });

    return created;
  }

  /**
   * Mengambil daftar tarif per jam (Super Admin only).
   */
  async findAll(
    query: HourlyCostQueryDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    await this.auditLogger.log({
      userId: user.id,
      action: 'read_hourly_costs',
      module: 'hourly_costs',
      ipAddress: ip,
    });

    const where: Prisma.HourlyCostWhereInput = {};
    if (query.userId) {
      where.userId = query.userId;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.hourlyCost.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              departmentId: true,
            },
          },
        },
        orderBy: [{ userId: 'asc' }, { effectiveFrom: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.hourlyCost.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mengambil riwayat tarif per jam untuk pengguna tertentu (Super Admin only).
   */
  async findByUser(targetUserId: string, user: AuthenticatedUser, ip?: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    await this.auditLogger.log({
      userId: user.id,
      action: 'read_hourly_costs',
      module: 'hourly_costs',
      entityId: targetUserId,
      ipAddress: ip,
    });

    return this.prisma.hourlyCost.findMany({
      where: { userId: targetUserId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Mengambil satu data tarif per jam berdasarkan ID (Super Admin only).
   */
  async findOne(id: string, user: AuthenticatedUser, ip?: string) {
    const item = await this.prisma.hourlyCost.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Tarif per jam tidak ditemukan');
    }

    await this.auditLogger.log({
      userId: user.id,
      action: 'read_hourly_costs',
      module: 'hourly_costs',
      entityId: id,
      ipAddress: ip,
    });

    return item;
  }
}
