import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CostCenterQueryDto } from '../dto/cost-center-query.dto';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';
import { AuditLoggerService } from './audit-logger.service';

@Injectable()
export class SuperAdminCostCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async create(dto: CreateCostCenterDto, currentUserId: string, ip: string) {
    const trimmedCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.costCenter.findUnique({
      where: { code: trimmedCode },
    });
    if (existing) {
      throw new ConflictException('Kode cost center sudah digunakan');
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept || dept.deletedAt !== null) {
      throw new BadRequestException(
        'Departemen tidak valid atau tidak ditemukan',
      );
    }

    const created = await this.prisma.costCenter.create({
      data: {
        code: trimmedCode,
        name: dto.name.trim(),
        departmentId: dto.departmentId,
        isActive: true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'CREATE_COST_CENTER',
      module: 'COST_CENTER_MANAGEMENT',
      entityId: created.id,
      beforeData: null,
      afterData: created,
      ipAddress: ip,
    });

    return created;
  }

  async findAll(query: CostCenterQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [total, costCenters] = await Promise.all([
      this.prisma.costCenter.count({ where }),
      this.prisma.costCenter.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
          _count: {
            select: { projects: true, expenses: true },
          },
        },
        skip,
        take: limit,
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      data: costCenters,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const costCenter = await this.prisma.costCenter.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: { projects: true, expenses: true },
        },
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Cost center tidak ditemukan');
    }

    return costCenter;
  }

  async update(
    id: string,
    dto: UpdateCostCenterDto,
    currentUserId: string,
    ip: string,
  ) {
    const target = await this.prisma.costCenter.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Cost center tidak ditemukan');
    }

    let trimmedCode: string | undefined = undefined;
    if (dto.code) {
      trimmedCode = dto.code.trim().toUpperCase();
      if (trimmedCode !== target.code) {
        const existing = await this.prisma.costCenter.findUnique({
          where: { code: trimmedCode },
        });
        if (existing) {
          throw new ConflictException('Kode cost center sudah digunakan');
        }
      }
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept || dept.deletedAt !== null) {
        throw new BadRequestException(
          'Departemen tidak valid atau tidak ditemukan',
        );
      }
    }

    const beforeData = {
      id: target.id,
      code: target.code,
      name: target.name,
      departmentId: target.departmentId,
      isActive: target.isActive,
    };

    const updated = await this.prisma.costCenter.update({
      where: { id },
      data: {
        code: trimmedCode,
        name: dto.name ? dto.name.trim() : undefined,
        departmentId: dto.departmentId,
        isActive: dto.isActive,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'UPDATE_COST_CENTER',
      module: 'COST_CENTER_MANAGEMENT',
      entityId: updated.id,
      beforeData,
      afterData: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async remove(id: string, currentUserId: string, ip: string) {
    const target = await this.prisma.costCenter.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Cost center tidak ditemukan');
    }

    // Aturan bisnis: Cost center yang sudah dipakai proyek atau pengeluaran tidak boleh dihapus, hanya dinonaktifkan
    const [projectCount, expenseCount] = await Promise.all([
      this.prisma.project.count({ where: { costCenterId: id } }),
      this.prisma.expense.count({ where: { costCenterId: id } }),
    ]);

    if (projectCount > 0 || expenseCount > 0) {
      throw new BadRequestException(
        'Cost center yang sudah digunakan oleh proyek atau pengeluaran tidak boleh dihapus, hanya dapat dinonaktifkan',
      );
    }

    const beforeData = {
      id: target.id,
      code: target.code,
      name: target.name,
      isActive: target.isActive,
    };

    await this.prisma.costCenter.delete({
      where: { id },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'DELETE_COST_CENTER',
      module: 'COST_CENTER_MANAGEMENT',
      entityId: id,
      beforeData,
      afterData: null,
      ipAddress: ip,
    });

    return {
      message: 'Cost center berhasil dihapus',
      id,
    };
  }
}
