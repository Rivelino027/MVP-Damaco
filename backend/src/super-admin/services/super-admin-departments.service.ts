import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { DepartmentQueryDto } from '../dto/department-query.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { AuditLoggerService } from './audit-logger.service';

@Injectable()
export class SuperAdminDepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async create(dto: CreateDepartmentDto, currentUserId: string, ip: string) {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.department.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictException('Nama departemen sudah digunakan');
    }

    if (dto.headUserId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: dto.headUserId },
      });
      if (!headUser || headUser.deletedAt !== null) {
        throw new BadRequestException('Pengguna kepala departemen tidak valid');
      }
    }

    const created = await this.prisma.department.create({
      data: {
        name: trimmedName,
        headUserId: dto.headUserId ?? null,
        annualBudget: dto.annualBudget ?? 0,
        isActive: true,
      },
      include: {
        headUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'CREATE_DEPARTMENT',
      module: 'DEPARTMENT_MANAGEMENT',
      entityId: created.id,
      beforeData: null,
      afterData: created,
      ipAddress: ip,
    });

    return created;
  }

  async findAll(query: DepartmentQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim() !== '') {
      where.name = { contains: query.search.trim() };
    }

    const [total, departments] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        include: {
          headUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { users: true, costCenters: true, projects: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: departments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        headUser: {
          select: { id: true, name: true, email: true },
        },
        costCenters: {
          where: { isActive: true },
        },
        _count: {
          select: { users: true, costCenters: true, projects: true },
        },
      },
    });

    if (!department || department.deletedAt !== null) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    currentUserId: string,
    ip: string,
  ) {
    const targetDept = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!targetDept || targetDept.deletedAt !== null) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    let trimmedName: string | undefined = undefined;
    if (dto.name) {
      trimmedName = dto.name.trim();
      if (trimmedName !== targetDept.name) {
        const existing = await this.prisma.department.findUnique({
          where: { name: trimmedName },
        });
        if (existing) {
          throw new ConflictException('Nama departemen sudah digunakan');
        }
      }
    }

    if (dto.headUserId) {
      const headUser = await this.prisma.user.findUnique({
        where: { id: dto.headUserId },
      });
      if (!headUser || headUser.deletedAt !== null) {
        throw new BadRequestException('Pengguna kepala departemen tidak valid');
      }
    }

    const beforeData = {
      id: targetDept.id,
      name: targetDept.name,
      headUserId: targetDept.headUserId,
      annualBudget: targetDept.annualBudget,
      isActive: targetDept.isActive,
    };

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: trimmedName,
        headUserId: dto.headUserId !== undefined ? dto.headUserId : undefined,
        annualBudget: dto.annualBudget !== undefined ? dto.annualBudget : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      include: {
        headUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'UPDATE_DEPARTMENT',
      module: 'DEPARTMENT_MANAGEMENT',
      entityId: updated.id,
      beforeData,
      afterData: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async remove(id: string, currentUserId: string, ip: string) {
    const targetDept = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!targetDept || targetDept.deletedAt !== null) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    // Aturan bisnis: Departemen yang sudah dipakai proyek atau pengguna tidak boleh dihapus, hanya dinonaktifkan
    const [userCount, projectCount] = await Promise.all([
      this.prisma.user.count({
        where: { departmentId: id, deletedAt: null },
      }),
      this.prisma.project.count({
        where: { departmentId: id },
      }),
    ]);

    if (userCount > 0 || projectCount > 0) {
      throw new BadRequestException(
        'Departemen yang sudah digunakan oleh pengguna atau proyek tidak boleh dihapus, hanya dapat dinonaktifkan',
      );
    }

    const beforeData = {
      id: targetDept.id,
      name: targetDept.name,
      deletedAt: targetDept.deletedAt,
      isActive: targetDept.isActive,
    };

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'DELETE_DEPARTMENT',
      module: 'DEPARTMENT_MANAGEMENT',
      entityId: updated.id,
      beforeData,
      afterData: { id: updated.id, deletedAt: updated.deletedAt, isActive: updated.isActive },
      ipAddress: ip,
    });

    return {
      message: 'Departemen berhasil dihapus secara aman (soft delete)',
      id: updated.id,
    };
  }
}
