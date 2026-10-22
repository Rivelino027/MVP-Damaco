import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TimesheetStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../super-admin/services/audit-logger.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Validasi filter tanggal:
   * - Super Admin: bebas (bisa tanpa filter, filter tanggal sebagian, atau rentang sembarang).
   * - Admin & Finance: hanya boleh berupa bulan kalender penuh (tanggal 1 awal bulan s/d tanggal terakhir akhir bulan).
   *   Tanpa filter berarti seluruh periode.
   */
  private validateDateFilter(
    user: AuthenticatedUser,
    query?: LaborCostQueryDto,
  ): void {
    if (!query) return;

    if (user.role === Role.super_admin) {
      if (query.startDate && query.endDate) {
        const start = parseDateOnly(query.startDate).utcDate;
        const end = parseDateOnly(query.endDate).utcDate;
        if (start > end) {
          throw new BadRequestException(
            'Tanggal mulai tidak boleh lebih besar dari tanggal akhir',
          );
        }
      }
      return;
    }

    // Untuk Admin dan Finance:
    // Tanpa filter tanggal berarti seluruh periode (diperbolehkan)
    if (!query.startDate && !query.endDate) {
      return;
    }

    // Jika salah satu diisi, keduanya wajib diisi
    if (!query.startDate || !query.endDate) {
      throw new BadRequestException(
        'Filter tanggal untuk Admin dan Finance harus menyertakan tanggal mulai dan tanggal akhir berupa bulan kalender penuh.',
      );
    }

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(query.startDate) || !regex.test(query.endDate)) {
      throw new BadRequestException('Format tanggal harus YYYY-MM-DD.');
    }

    const [sYear, sMonth, sDay] = query.startDate.split('-').map(Number);
    const [eYear, eMonth, eDay] = query.endDate.split('-').map(Number);

    if (sMonth < 1 || sMonth > 12 || eMonth < 1 || eMonth > 12) {
      throw new BadRequestException('Bulan tidak valid.');
    }

    // Tanggal mulai harus tanggal 1 awal bulan
    if (sDay !== 1) {
      throw new BadRequestException(
        'Filter tanggal untuk Admin dan Finance harus berupa bulan kalender penuh (tanggal mulai harus tanggal 1).',
      );
    }

    // Tanggal akhir harus tanggal terakhir akhir bulan
    const lastDayOfEndMonth = new Date(Date.UTC(eYear, eMonth, 0)).getUTCDate();
    if (eDay !== lastDayOfEndMonth) {
      throw new BadRequestException(
        `Filter tanggal untuk Admin dan Finance harus berupa bulan kalender penuh (tanggal akhir harus tanggal ${lastDayOfEndMonth}).`,
      );
    }

    const startUtc = new Date(Date.UTC(sYear, sMonth - 1, sDay));
    const endUtc = new Date(Date.UTC(eYear, eMonth - 1, eDay));

    if (startUtc > endUtc) {
      throw new BadRequestException(
        'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.',
      );
    }
  }

  /**
   * Membaca batas minimum pekerja dari app_settings dengan kunci labor_cost_min_workers.
   * Default 3 jika tidak ada atau tidak valid. Nilai di bawah 2 dipaksa menjadi 2.
   */
  private async getMinWorkersThreshold(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: 'labor_cost_min_workers' },
    });

    let minWorkers = 3;

    if (setting && setting.value !== null && setting.value !== undefined) {
      const val = setting.value;
      let parsed: number | null = null;

      if (typeof val === 'number') {
        parsed = val;
      } else if (typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num) && Number.isFinite(num)) {
          parsed = num;
        }
      } else if (typeof val === 'object') {
        const obj = val as Record<string, any>;
        const candidate =
          obj.value ??
          obj.minWorkers ??
          obj.min_workers ??
          obj.min ??
          obj.count ??
          obj.threshold;
        if (typeof candidate === 'number') {
          parsed = candidate;
        } else if (typeof candidate === 'string') {
          const num = Number(candidate);
          if (!isNaN(num) && Number.isFinite(num)) {
            parsed = num;
          }
        }
      }

      if (parsed !== null && !isNaN(parsed) && Number.isFinite(parsed)) {
        minWorkers = Math.floor(parsed);
      }
    }

    // Nilai di bawah 2 diabaikan (dipaksa 2 sebagai batas bawah)
    if (minWorkers < 2) {
      minWorkers = 2;
    }

    return minWorkers;
  }

  /**
   * Pembulatan biaya:
   * - Super Admin: nilai tepat tanpa pembulatan.
   * - Admin & Finance: dibulatkan ke kelipatan Rp 100.000 terdekat (pembulatan setengah ke atas).
   */
  private formatLaborCost(
    totalCost: Prisma.Decimal,
    isSuperAdmin: boolean,
  ): string {
    if (isSuperAdmin) {
      return totalCost.toFixed(2);
    }

    const rounded = totalCost
      .div(100000)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .mul(100000);

    return rounded.toFixed(2);
  }

  /**
   * Menghitung agregat biaya tenaga kerja per proyek.
   */
  async getProjectAggregate(
    projectId: string,
    user: AuthenticatedUser,
    query?: LaborCostQueryDto,
    ip?: string,
  ): Promise<LaborCostAggregateResult> {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Pengguna tidak memiliki izin untuk melihat agregat biaya tenaga kerja',
      );
    }

    this.validateDateFilter(user, query);

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
    const isSuperAdmin = user.role === Role.super_admin;
    let isCostHidden = false;
    let hiddenReason: string | null = null;
    let formattedCost: string | null = null;

    if (!isSuperAdmin) {
      const minWorkers = await this.getMinWorkersThreshold();
      if (workerCount < minWorkers) {
        isCostHidden = true;
        hiddenReason = 'jumlah pekerja terlalu sedikit';
      }
    }

    if (!isCostHidden) {
      formattedCost = this.formatLaborCost(totalCost, isSuperAdmin);
    }

    // Catat aktivitas di activity_logs untuk Admin dan Finance (TANPA nilai biaya)
    if (user.role === Role.admin || user.role === Role.finance) {
      await this.auditLogger.log({
        userId: user.id,
        action: 'akses_agregat_biaya',
        module: 'labor-costs',
        entityId: projectId,
        afterData: {
          jenis: 'proyek',
          targetType: 'proyek',
          targetId: projectId,
          startDate: query?.startDate ?? null,
          endDate: query?.endDate ?? null,
        },
        ipAddress: ip,
      });
    }

    return {
      projectId: project.id,
      projectName: project.name,
      totalHours: totalHours.toNumber(),
      costAmount: formattedCost,
      totalCost: formattedCost,
      totalLaborCost: formattedCost,
      isCostHidden,
      hiddenReason,
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
    ip?: string,
  ): Promise<LaborCostAggregateResult> {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Pengguna tidak memiliki izin untuk melihat agregat biaya tenaga kerja',
      );
    }

    this.validateDateFilter(user, query);

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
    const isSuperAdmin = user.role === Role.super_admin;
    let isCostHidden = false;
    let hiddenReason: string | null = null;
    let formattedCost: string | null = null;

    if (!isSuperAdmin) {
      const minWorkers = await this.getMinWorkersThreshold();
      if (workerCount < minWorkers) {
        isCostHidden = true;
        hiddenReason = 'jumlah pekerja terlalu sedikit';
      }
    }

    if (!isCostHidden) {
      formattedCost = this.formatLaborCost(totalCost, isSuperAdmin);
    }

    // Catat aktivitas di activity_logs untuk Admin dan Finance (TANPA nilai biaya)
    if (user.role === Role.admin || user.role === Role.finance) {
      await this.auditLogger.log({
        userId: user.id,
        action: 'akses_agregat_biaya',
        module: 'labor-costs',
        entityId: departmentId,
        afterData: {
          jenis: 'departemen',
          targetType: 'departemen',
          targetId: departmentId,
          startDate: query?.startDate ?? null,
          endDate: query?.endDate ?? null,
        },
        ipAddress: ip,
      });
    }

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      totalHours: totalHours.toNumber(),
      costAmount: formattedCost,
      totalCost: formattedCost,
      totalLaborCost: formattedCost,
      isCostHidden,
      hiddenReason,
      workerCount,
    };
  }
}
