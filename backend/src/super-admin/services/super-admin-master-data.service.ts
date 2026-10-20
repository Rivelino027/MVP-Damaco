import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { CreateProjectTypeDto } from '../dto/create-project-type.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';
import { UpdateProjectTypeDto } from '../dto/update-project-type.dto';
import { AuditLoggerService } from './audit-logger.service';

@Injectable()
export class SuperAdminMasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  // ───────────── Expense Categories ─────────────

  async createExpenseCategory(
    dto: CreateExpenseCategoryDto,
    currentUserId: string,
    ip: string,
  ) {
    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code.trim().toUpperCase();

    const existingName = await this.prisma.expenseCategory.findUnique({
      where: { name: trimmedName },
    });
    if (existingName) {
      throw new ConflictException('Nama kategori pengeluaran sudah digunakan');
    }

    const existingCode = await this.prisma.expenseCategory.findUnique({
      where: { code: trimmedCode },
    });
    if (existingCode) {
      throw new ConflictException('Kode kategori pengeluaran sudah digunakan');
    }

    const created = await this.prisma.expenseCategory.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        color: dto.color?.trim() ?? null,
        isActive: true,
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'CREATE_EXPENSE_CATEGORY',
      module: 'MASTER_DATA',
      entityId: created.id,
      beforeData: null,
      afterData: created,
      ipAddress: ip,
    });

    return created;
  }

  async findAllExpenseCategories(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.prisma.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOneExpenseCategory(id: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Kategori pengeluaran tidak ditemukan');
    }
    return category;
  }

  async updateExpenseCategory(
    id: string,
    dto: UpdateExpenseCategoryDto,
    currentUserId: string,
    ip: string,
  ) {
    const target = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!target) {
      throw new NotFoundException('Kategori pengeluaran tidak ditemukan');
    }

    let trimmedName: string | undefined = undefined;
    if (dto.name) {
      trimmedName = dto.name.trim();
      if (trimmedName !== target.name) {
        const existing = await this.prisma.expenseCategory.findUnique({
          where: { name: trimmedName },
        });
        if (existing) {
          throw new ConflictException(
            'Nama kategori pengeluaran sudah digunakan',
          );
        }
      }
    }

    let trimmedCode: string | undefined = undefined;
    if (dto.code) {
      trimmedCode = dto.code.trim().toUpperCase();
      if (trimmedCode !== target.code) {
        const existing = await this.prisma.expenseCategory.findUnique({
          where: { code: trimmedCode },
        });
        if (existing) {
          throw new ConflictException(
            'Kode kategori pengeluaran sudah digunakan',
          );
        }
      }
    }

    const beforeData = {
      id: target.id,
      name: target.name,
      code: target.code,
      color: target.color,
      isActive: target.isActive,
    };

    const updated = await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: trimmedName,
        code: trimmedCode,
        color:
          dto.color !== undefined ? (dto.color?.trim() ?? null) : undefined,
        isActive: dto.isActive,
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'UPDATE_EXPENSE_CATEGORY',
      module: 'MASTER_DATA',
      entityId: updated.id,
      beforeData,
      afterData: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async removeExpenseCategory(id: string, currentUserId: string, ip: string) {
    const target = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!target) {
      throw new NotFoundException('Kategori pengeluaran tidak ditemukan');
    }

    // Aturan bisnis: Master data dinonaktifkan, bukan dihapus
    const beforeData = {
      id: target.id,
      name: target.name,
      code: target.code,
      isActive: target.isActive,
    };

    const updated = await this.prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'DEACTIVATE_EXPENSE_CATEGORY',
      module: 'MASTER_DATA',
      entityId: updated.id,
      beforeData,
      afterData: { id: updated.id, isActive: false },
      ipAddress: ip,
    });

    return {
      message: 'Kategori pengeluaran berhasil dinonaktifkan',
      id: updated.id,
    };
  }

  // ───────────── Project Types ─────────────

  async createProjectType(
    dto: CreateProjectTypeDto,
    currentUserId: string,
    ip: string,
  ) {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.projectType.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new ConflictException('Nama jenis proyek sudah digunakan');
    }

    const created = await this.prisma.projectType.create({
      data: {
        name: trimmedName,
        isActive: true,
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'CREATE_PROJECT_TYPE',
      module: 'MASTER_DATA',
      entityId: created.id,
      beforeData: null,
      afterData: created,
      ipAddress: ip,
    });

    return created;
  }

  async findAllProjectTypes(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.prisma.projectType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOneProjectType(id: string) {
    const projectType = await this.prisma.projectType.findUnique({
      where: { id },
    });
    if (!projectType) {
      throw new NotFoundException('Jenis proyek tidak ditemukan');
    }
    return projectType;
  }

  async updateProjectType(
    id: string,
    dto: UpdateProjectTypeDto,
    currentUserId: string,
    ip: string,
  ) {
    const target = await this.prisma.projectType.findUnique({
      where: { id },
    });
    if (!target) {
      throw new NotFoundException('Jenis proyek tidak ditemukan');
    }

    let trimmedName: string | undefined = undefined;
    if (dto.name) {
      trimmedName = dto.name.trim();
      if (trimmedName !== target.name) {
        const existing = await this.prisma.projectType.findUnique({
          where: { name: trimmedName },
        });
        if (existing) {
          throw new ConflictException('Nama jenis proyek sudah digunakan');
        }
      }
    }

    const beforeData = {
      id: target.id,
      name: target.name,
      isActive: target.isActive,
    };

    const updated = await this.prisma.projectType.update({
      where: { id },
      data: {
        name: trimmedName,
        isActive: dto.isActive,
      },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'UPDATE_PROJECT_TYPE',
      module: 'MASTER_DATA',
      entityId: updated.id,
      beforeData,
      afterData: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async removeProjectType(id: string, currentUserId: string, ip: string) {
    const target = await this.prisma.projectType.findUnique({
      where: { id },
    });
    if (!target) {
      throw new NotFoundException('Jenis proyek tidak ditemukan');
    }

    // Aturan bisnis: Master data dinonaktifkan, bukan dihapus
    const beforeData = {
      id: target.id,
      name: target.name,
      isActive: target.isActive,
    };

    const updated = await this.prisma.projectType.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'DEACTIVATE_PROJECT_TYPE',
      module: 'MASTER_DATA',
      entityId: updated.id,
      beforeData,
      afterData: { id: updated.id, isActive: false },
      ipAddress: ip,
    });

    return {
      message: 'Jenis proyek berhasil dinonaktifkan',
      id: updated.id,
    };
  }
}
