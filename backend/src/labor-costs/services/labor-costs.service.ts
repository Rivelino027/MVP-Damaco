import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TimesheetStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDateOnly } from '../../timesheets/timesheets.service';
import { LaborCostQueryDto } from '../dto/labor-cost-query.dto';

export interface LaborCostAggregateResult {
  projectId?: string;
  projectName?: string;
  departmentId?: string;
  departmentName?: string;
  totalHours: number;
  costAmount: string | null;
  totalCost: string | null;
  totalLaborCost: string | null;
  isCostHidden: boolean;
  hiddenReason: string | null;
  workerCount: number;
}

@Injectable()
export class LaborCostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menghitung agregat biaya tenaga kerja per proyek.
   */
  async getProjectAggregate(
    projectId: string,
    user: AuthenticatedUser,
    query?: LaborCostQueryDto,
  ): Promise<LaborCostAggregateResult> {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Pengguna tidak memiliki izin untuk melihat agregat biaya tenaga kerja',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        departmentId: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      project.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'Admin hanya dapat melihat proyek di departemennya sendiri',
      );
    }

    // Filter entry: task pada proyek, timesheet disetujui, dan filter tanggal jika ada
    const where: Prisma.TimesheetEntryWhereInput = {
      task: {
        projectId,
      },
      timesheet: {
        status: TimesheetStatus.disetujui,
      },
    };

    if (query?.startDate) {
      const start = parseDateOnly(query.startDate).utcDate;
      where.workDate = {
        ...(where.workDate as Prisma.DateTimeFilter),
        gte: start,
      };
    }

    if (query?.endDate) {
      const end = parseDateOnly(query.endDate).utcDate;
      where.workDate = {
        ...(where.workDate as Prisma.DateTimeFilter),
        lte: end,
      };
    }

    const entries = await this.prisma.timesheetEntry.findMany({
      where,
      select: {
        hours: true,
        costAmount: true,
        timesheet: {
          select: {
            userId: true,
          },
        },
      },
    });

    const distinctWorkerIds = new Set<string>();
    let totalHours = new Prisma.Decimal(0);
    let totalCost = new Prisma.Decimal(0);

    for (const entry of entries) {
      distinctWorkerIds.add(entry.timesheet.userId);
      totalHours = totalHours.add(new Prisma.Decimal(entry.hours));
      if (entry.costAmount) {
        totalCost = totalCost.add(new Prisma.Decimal(entry.costAmount));
      }
    }

    const workerCount = distinctWorkerIds.size;
    // Aturan minimum: jika pekerja < 2, sembunyikan nilai biaya untuk admin dan finance
    const isCostHidden = user.role !== Role.super_admin && workerCount < 2;

    const formattedCost = isCostHidden ? null : totalCost.toFixed(2);

    return {
      projectId: project.id,
      projectName: project.name,
      totalHours: totalHours.toNumber(),
      costAmount: formattedCost,
      totalCost: formattedCost,
      totalLaborCost: formattedCost,
      isCostHidden,
      hiddenReason: isCostHidden ? 'jumlah pekerja terlalu sedikit' : null,
      workerCount,
    };
  }

  /**
   * Menghitung agregat biaya tenaga kerja per departemen.
   */
  async getDepartmentAggregate(
    departmentId: string,
    user: AuthenticatedUser,
    query?: LaborCostQueryDto,
  ): Promise<LaborCostAggregateResult> {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Pengguna tidak memiliki izin untuk melihat agregat biaya tenaga kerja',
      );
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!dept) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    if (user.role === Role.admin && dept.id !== user.departmentId) {
      throw new ForbiddenException(
        'Admin hanya dapat melihat departemennya sendiri',
      );
    }

    // Filter entry: task pada proyek milik departemen, timesheet disetujui, dan filter tanggal jika ada
    const where: Prisma.TimesheetEntryWhereInput = {
      task: {
        project: {
          departmentId,
        },
      },
      timesheet: {
        status: TimesheetStatus.disetujui,
      },
    };

    if (query?.startDate) {
      const start = parseDateOnly(query.startDate).utcDate;
      where.workDate = {
        ...(where.workDate as Prisma.DateTimeFilter),
        gte: start,
      };
    }

    if (query?.endDate) {
      const end = parseDateOnly(query.endDate).utcDate;
      where.workDate = {
        ...(where.workDate as Prisma.DateTimeFilter),
        lte: end,
      };
    }

    const entries = await this.prisma.timesheetEntry.findMany({
      where,
      select: {
        hours: true,
        costAmount: true,
        timesheet: {
          select: {
            userId: true,
          },
        },
      },
    });

    const distinctWorkerIds = new Set<string>();
    let totalHours = new Prisma.Decimal(0);
    let totalCost = new Prisma.Decimal(0);

    for (const entry of entries) {
      distinctWorkerIds.add(entry.timesheet.userId);
      totalHours = totalHours.add(new Prisma.Decimal(entry.hours));
      if (entry.costAmount) {
        totalCost = totalCost.add(new Prisma.Decimal(entry.costAmount));
      }
    }

    const workerCount = distinctWorkerIds.size;
    const isCostHidden = user.role !== Role.super_admin && workerCount < 2;

    const formattedCost = isCostHidden ? null : totalCost.toFixed(2);

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      totalHours: totalHours.toNumber(),
      costAmount: formattedCost,
      totalCost: formattedCost,
      totalLaborCost: formattedCost,
      isCostHidden,
      hiddenReason: isCostHidden ? 'jumlah pekerja terlalu sedikit' : null,
      workerCount,
    };
  }
}
