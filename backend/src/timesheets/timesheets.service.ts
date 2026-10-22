import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  DocumentType,
  Prisma,
  ProjectStatus,
  Role,
  TimesheetStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';

export function parseDateOnly(dateInput: string | Date): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  utcDate: Date;
} {
  const dateStr =
    typeof dateInput === 'string'
      ? dateInput.includes('T')
        ? dateInput.split('T')[0]
        : dateInput
      : dateInput.toISOString().split('T')[0];

  const parts = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return {
    year: parts[0],
    month: parts[1],
    day: parts[2],
    dateStr,
    utcDate,
  };
}

export function isMonday(dateInput: string | Date): boolean {
  const { utcDate } = parseDateOnly(dateInput);
  return utcDate.getUTCDay() === 1; // 1 = Monday
}

export function isWithinWeek(
  workDateInput: string | Date,
  weekStartInput: string | Date,
): boolean {
  const work = parseDateOnly(workDateInput).utcDate.getTime();
  const start = parseDateOnly(weekStartInput).utcDate.getTime();
  const end = start + 6 * 24 * 60 * 60 * 1000; // Monday to Sunday
  return work >= start && work <= end;
}

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Helper untuk validasi daftar entry jam kerja.
   */
  private async validateEntries(
    entries: Array<{
      taskId: string;
      workDate: string;
      hours: number;
      note?: string;
    }>,
    weekStartStr: string,
    targetUserId: string,
  ): Promise<void> {
    const dailyHours: Record<string, number> = {};

    for (const entry of entries) {
      // 1. Validasi jam kerja per entry
      if (
        entry.hours <= 0 ||
        entry.hours > 24 ||
        !/^\d+(\.\d{1,2})?$/.test(entry.hours.toString())
      ) {
        throw new BadRequestException(
          'Jam kerja harus antara 0.01 sampai 24.00 dengan maksimal 2 angka desimal',
        );
      }

      // 2. Validasi tanggal kerja dalam rentang minggu (Senin - Minggu)
      if (!isWithinWeek(entry.workDate, weekStartStr)) {
        throw new BadRequestException(
          'Tanggal kerja (workDate) harus berada dalam minggu yang sama dengan weekStart (Senin - Minggu)',
        );
      }

      // 3. Akumulasi jam per hari
      const dateKey = parseDateOnly(entry.workDate).dateStr;
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + Number(entry.hours);
      if (dailyHours[dateKey] > 24) {
        throw new BadRequestException(
          `Total jam kerja harian pada tanggal ${dateKey} melebihi 24 jam`,
        );
      }

      // 4. Validasi task dan keanggotaan proyek
      const task = await this.prisma.task.findUnique({
        where: { id: entry.taskId },
        include: { project: true },
      });

      if (!task || task.deletedAt) {
        throw new NotFoundException(
          `Task dengan ID ${entry.taskId} tidak ditemukan`,
        );
      }

      if (task.project.status === ProjectStatus.ditutup) {
        throw new BadRequestException(
          'Tidak dapat mengisi timesheet pada task proyek yang sudah ditutup',
        );
      }

      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: targetUserId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException(
          'Pengguna bukan anggota dari proyek task ini',
        );
      }
    }
  }

  /**
   * Membuat draft timesheet mingguan baru.
   */
  async create(dto: CreateTimesheetDto, user: AuthenticatedUser, ip?: string) {
    if (dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException(
        'Pengguna tidak dapat mengisi timesheet orang lain',
      );
    }

    if (!isMonday(dto.weekStart)) {
      throw new BadRequestException(
        'Tanggal awal minggu (weekStart) harus hari Senin',
      );
    }

    const weekStartDate = parseDateOnly(dto.weekStart).utcDate;

    // Cek apakah timesheet minggu ini sudah pernah dibuat
    const existing = await this.prisma.timesheet.findUnique({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart: weekStartDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Timesheet untuk minggu ini sudah dibuat');
    }

    if (dto.entries && dto.entries.length > 0) {
      await this.validateEntries(dto.entries, dto.weekStart, user.id);
    }

    const created = await this.prisma.timesheet.create({
      data: {
        userId: user.id,
        weekStart: weekStartDate,
        status: TimesheetStatus.draft,
        entries:
          dto.entries && dto.entries.length > 0
            ? {
                create: dto.entries.map((e) => ({
                  taskId: e.taskId,
                  workDate: parseDateOnly(e.workDate).utcDate,
                  hours: new Prisma.Decimal(e.hours),
                  note: e.note ?? null,
                })),
              }
            : undefined,
      },
      select: this.getTimesheetSelect(false),
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_timesheet',
      module: 'timesheets',
      entityId: created.id,
      afterData: {
        weekStart: dto.weekStart,
        entriesCount: dto.entries?.length || 0,
      },
      ipAddress: ip,
    });

    return created;
  }

  /**
   * Mengubah entry timesheet (hanya status draft atau ditolak).
   */
  async update(
    id: string,
    dto: UpdateTimesheetDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet tidak ditemukan');
    }

    if (timesheet.userId !== user.id) {
      throw new ForbiddenException(
        'Hanya pemilik timesheet yang dapat mengubahnya',
      );
    }

    if (
      timesheet.status !== TimesheetStatus.draft &&
      timesheet.status !== TimesheetStatus.ditolak
    ) {
      throw new BadRequestException(
        'Timesheet yang sudah diajukan atau disetujui tidak dapat diubah',
      );
    }

    const weekStartStr = parseDateOnly(timesheet.weekStart).dateStr;
    await this.validateEntries(dto.entries, weekStartStr, user.id);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Hapus entry lama
      await tx.timesheetEntry.deleteMany({
        where: { timesheetId: id },
      });

      // Buat entry baru
      if (dto.entries && dto.entries.length > 0) {
        await tx.timesheetEntry.createMany({
          data: dto.entries.map((e) => ({
            timesheetId: id,
            taskId: e.taskId,
            workDate: parseDateOnly(e.workDate).utcDate,
            hours: new Prisma.Decimal(e.hours),
            note: e.note ?? null,
          })),
        });
      }

      return tx.timesheet.update({
        where: { id },
        data: { updatedAt: new Date() },
        select: this.getTimesheetSelect(false),
      });
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_timesheet',
      module: 'timesheets',
      entityId: id,
      afterData: { entriesCount: dto.entries?.length || 0 },
      ipAddress: ip,
    });

    return updated;
  }

  /**
   * Mengajukan timesheet (draft/ditolak -> menunggu_admin).
   */
  async submit(id: string, user: AuthenticatedUser, ip?: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { entries: true },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet tidak ditemukan');
    }

    if (timesheet.userId !== user.id) {
      throw new ForbiddenException(
        'Hanya pemilik timesheet yang dapat mengajukannya',
      );
    }

    if (
      timesheet.status !== TimesheetStatus.draft &&
      timesheet.status !== TimesheetStatus.ditolak
    ) {
      throw new BadRequestException(
        'Hanya timesheet dengan status draft atau ditolak yang dapat diajukan',
      );
    }

    if (!timesheet.entries || timesheet.entries.length === 0) {
      throw new BadRequestException('Timesheet kosong tidak dapat diajukan');
    }

    const totalHours = timesheet.entries.reduce(
      (sum, e) => sum + Number(e.hours),
      0,
    );
    if (totalHours <= 0) {
      throw new BadRequestException('Timesheet kosong tidak dapat diajukan');
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      const res = await tx.timesheet.update({
        where: { id },
        data: {
          status: TimesheetStatus.menunggu_admin,
          submittedAt: new Date(),
          rejectReason: null,
        },
        select: this.getTimesheetSelect(false),
      });

      // Buat atau perbarui catatan di tabel approvals
      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.timesheet,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.timesheet,
          documentId: id,
          stepOrder: 1,
          role: Role.admin,
          status: ApprovalStatus.menunggu,
        },
        update: {
          status: ApprovalStatus.menunggu,
          approverId: null,
          actedAt: null,
          reason: null,
        },
      });

      return res;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'submit_timesheet',
      module: 'timesheets',
      entityId: id,
      ipAddress: ip,
    });

    return submitted;
  }

  /**
   * Menyetujui timesheet (Admin / Super Admin).
   * Dalam 1 transaksi: cari tarif per jam dan hitung costAmount = jam x tarif.
   */
  async approve(id: string, user: AuthenticatedUser, ip?: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, departmentId: true } },
        entries: true,
      },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet tidak ditemukan');
    }

    // Admin hanya dapat menyetujui user di departemennya (return 404 jika beda departemen)
    if (user.role === Role.admin) {
      if (timesheet.user.departmentId !== user.departmentId) {
        throw new NotFoundException('Timesheet tidak ditemukan');
      }
    }

    // Admin dan Super Admin tidak boleh menyetujui timesheet miliknya sendiri
    if (timesheet.userId === user.id) {
      throw new BadRequestException(
        'Tidak dapat menyetujui timesheet milik sendiri',
      );
    }

    if (timesheet.status !== TimesheetStatus.menunggu_admin) {
      throw new BadRequestException(
        'Hanya timesheet dengan status menunggu_admin yang dapat disetujui',
      );
    }

    const isSuperAdmin = user.role === Role.super_admin;

    const approved = await this.prisma.$transaction(async (tx) => {
      // 1. Hitung snapshot tarif untuk setiap entry
      for (const entry of timesheet.entries) {
        const hourlyCost = await tx.hourlyCost.findFirst({
          where: {
            userId: timesheet.userId,
            effectiveFrom: { lte: entry.workDate },
          },
          orderBy: { effectiveFrom: 'desc' },
        });

        if (!hourlyCost) {
          throw new BadRequestException(
            'Persetujuan ditolak: tarif per jam belum diatur untuk tanggal pengerjaan task.',
          );
        }

        const costAmount = new Prisma.Decimal(entry.hours).mul(
          new Prisma.Decimal(hourlyCost.ratePerHour),
        );

        await tx.timesheetEntry.update({
          where: { id: entry.id },
          data: { costAmount },
        });
      }

      // 2. Perbarui status timesheet
      const res = await tx.timesheet.update({
        where: { id },
        data: {
          status: TimesheetStatus.disetujui,
          approvedBy: user.id,
          approvedAt: new Date(),
          rejectReason: null,
        },
        select: this.getTimesheetSelect(isSuperAdmin),
      });

      // 3. Perbarui catatan approval
      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.timesheet,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.timesheet,
          documentId: id,
          stepOrder: 1,
          role: Role.admin,
          status: ApprovalStatus.disetujui,
          approverId: user.id,
          actedAt: new Date(),
        },
        update: {
          status: ApprovalStatus.disetujui,
          approverId: user.id,
          actedAt: new Date(),
        },
      });

      return res;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'approve_timesheet',
      module: 'timesheets',
      entityId: id,
      ipAddress: ip,
    });

    return approved;
  }

  /**
   * Menolak timesheet (alasan penolakan wajib).
   */
  async reject(
    id: string,
    dto: RejectTimesheetDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, departmentId: true } },
      },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet tidak ditemukan');
    }

    if (user.role === Role.admin) {
      if (timesheet.user.departmentId !== user.departmentId) {
        throw new NotFoundException('Timesheet tidak ditemukan');
      }
    }

    if (timesheet.userId === user.id) {
      throw new BadRequestException(
        'Tidak dapat menolak timesheet milik sendiri',
      );
    }

    if (timesheet.status !== TimesheetStatus.menunggu_admin) {
      throw new BadRequestException(
        'Hanya timesheet dengan status menunggu_admin yang dapat ditolak',
      );
    }

    const rejected = await this.prisma.$transaction(async (tx) => {
      const res = await tx.timesheet.update({
        where: { id },
        data: {
          status: TimesheetStatus.ditolak,
          rejectReason: dto.reason.trim(),
        },
        select: this.getTimesheetSelect(false),
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.timesheet,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.timesheet,
          documentId: id,
          stepOrder: 1,
          role: Role.admin,
          status: ApprovalStatus.ditolak,
          approverId: user.id,
          actedAt: new Date(),
          reason: dto.reason.trim(),
        },
        update: {
          status: ApprovalStatus.ditolak,
          approverId: user.id,
          actedAt: new Date(),
          reason: dto.reason.trim(),
        },
      });

      return res;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'reject_timesheet',
      module: 'timesheets',
      entityId: id,
      afterData: { reason: dto.reason.trim() },
      ipAddress: ip,
    });

    return rejected;
  }

  /**
   * Mengambil daftar timesheet milik pengguna yang sedang login.
   */
  async findMy(query: TimesheetQueryDto, user: AuthenticatedUser) {
    const where: Prisma.TimesheetWhereInput = {
      userId: user.id,
    };

    if (query.weekStart) {
      where.weekStart = parseDateOnly(query.weekStart).utcDate;
    }

    if (query.status) {
      where.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.timesheet.findMany({
        where,
        select: this.getTimesheetSelect(false),
        orderBy: { weekStart: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timesheet.count({ where }),
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
   * Mengambil daftar timesheet tim (Admin departemennya, Super Admin semua).
   */
  async findTeam(query: TimesheetQueryDto, user: AuthenticatedUser) {
    const where: Prisma.TimesheetWhereInput = {};

    if (user.role === Role.admin) {
      where.user = {
        departmentId: user.departmentId,
      };
    } else if (user.role === Role.super_admin) {
      if (query.departmentId) {
        where.user = {
          departmentId: query.departmentId,
        };
      }
    }

    if (query.weekStart) {
      where.weekStart = parseDateOnly(query.weekStart).utcDate;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.projectId) {
      where.entries = {
        some: {
          task: {
            projectId: query.projectId,
          },
        },
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.timesheet.findMany({
        where,
        select: this.getTimesheetSelect(false), // Admin & siapapun di daftar tim TIDAK menerima costAmount
        orderBy: { weekStart: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timesheet.count({ where }),
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
   * Mengambil detail satu timesheet.
   * Hanya super_admin yang melihat costAmount per orang (dicatat di log aktivitas).
   */
  async findOne(id: string, user: AuthenticatedUser, ip?: string) {
    const timesheetCheck = await this.prisma.timesheet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, departmentId: true } },
      },
    });

    if (!timesheetCheck) {
      throw new NotFoundException('Timesheet tidak ditemukan');
    }

    if (user.role === Role.pengguna) {
      if (timesheetCheck.userId !== user.id) {
        throw new NotFoundException('Timesheet tidak ditemukan');
      }
    } else if (user.role === Role.admin) {
      if (
        timesheetCheck.user.departmentId !== user.departmentId &&
        timesheetCheck.userId !== user.id
      ) {
        throw new NotFoundException('Timesheet tidak ditemukan');
      }
    } else if (user.role === Role.finance) {
      throw new ForbiddenException(
        'Finance tidak memiliki akses ke detail timesheet',
      );
    }

    const isSuperAdmin = user.role === Role.super_admin;

    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      select: this.getTimesheetSelect(isSuperAdmin),
    });

    if (isSuperAdmin) {
      await this.auditLogger.log({
        userId: user.id,
        action: 'akses_biaya_per_orang',
        module: 'timesheets',
        entityId: id,
        afterData: { timesheetId: id, targetUserId: timesheetCheck.userId },
        ipAddress: ip,
      });
    }

    return timesheet;
  }

  /**
   * Struktur select eksplisit untuk memastikan costAmount tidak pernah terbocor.
   */
  private getTimesheetSelect(
    includeCostAmount: boolean,
  ): Prisma.TimesheetSelect {
    return {
      id: true,
      userId: true,
      weekStart: true,
      status: true,
      submittedAt: true,
      approvedBy: true,
      approvedAt: true,
      rejectReason: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
        },
      },
      entries: {
        select: {
          id: true,
          timesheetId: true,
          taskId: true,
          workDate: true,
          hours: true,
          note: true,
          ...(includeCostAmount ? { costAmount: true } : {}),
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    };
  }
}
