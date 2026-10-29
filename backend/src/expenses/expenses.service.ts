import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  AttachmentOwner,
  DocumentType,
  ExpenseStatus,
  FlagType,
  LimitChangeStatus,
  LimitStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { LocalStorageService } from '../tasks/storage/local-storage.service';
import { STORAGE_SERVICE } from '../tasks/storage/storage.interface';
import { validateFileSignatureAndSize } from '../tasks/utils/file-validator.util';
import { ConfirmLimitDto } from './dto/confirm-limit.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ProposeLimitDto } from './dto/propose-limit.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    @Inject(STORAGE_SERVICE) private readonly storageService: LocalStorageService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // BATAS NOMINAL BESAR
  // ─────────────────────────────────────────────────────────────

  /**
   * Mengambil batas Nominal Besar yang saat ini berlaku.
   */
  async getCurrentLimit() {
    let limit = await this.prisma.approvalLimit.findFirst({
      where: { status: LimitStatus.berlaku },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!limit) {
      // Nilai default awal jika belum ada di database
      limit = await this.prisma.approvalLimit.create({
        data: {
          amount: new Prisma.Decimal(5000000),
          status: LimitStatus.berlaku,
          effectiveFrom: new Date(),
          confirmedAt: new Date(),
        },
      });
    }

    return limit;
  }

  /**
   * Mengambil riwayat permintaan perubahan batas Nominal Besar.
   */
  async getLimitHistory() {
    return this.prisma.limitChangeRequest.findMany({
      include: {
        proposer: { select: { id: true, name: true } },
        confirmer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin atau Finance mengusulkan perubahan batas Nominal Besar.
   * Super Admin DITOLAK (403).
   */
  async proposeLimit(
    dto: ProposeLimitDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (user.role === Role.super_admin) {
      throw new ForbiddenException(
        'Super Admin hanya memiliki hak baca pada batas Nominal Besar',
      );
    }

    if (user.role !== Role.admin && user.role !== Role.finance) {
      throw new ForbiddenException(
        'Hanya Admin dan Finance yang dapat mengusulkan perubahan batas',
      );
    }

    const currentLimit = await this.getCurrentLimit();

    const request = await this.prisma.limitChangeRequest.create({
      data: {
        oldAmount: currentLimit.amount,
        newAmount: new Prisma.Decimal(dto.newAmount),
        reason: dto.reason?.trim() ?? null,
        proposedBy: user.id,
        proposerRole: user.role,
        status: LimitChangeStatus.menunggu_konfirmasi,
      },
      include: {
        proposer: { select: { id: true, name: true } },
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'usulkan_batas_nominal_besar',
      module: 'expenses',
      entityId: request.id,
      afterData: {
        oldAmount: request.oldAmount.toString(),
        newAmount: request.newAmount.toString(),
        reason: request.reason,
      },
      ipAddress: ip,
    });

    return request;
  }

  /**
   * Konfirmasi / penolakan usulan batas Nominal Besar.
   * Wajib dua pihak: pengonfirmasi berbeda orang dan berbeda peran dari pengusul.
   */
  async confirmLimit(
    id: string,
    dto: ConfirmLimitDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (user.role === Role.super_admin) {
      throw new ForbiddenException(
        'Super Admin hanya memiliki hak baca pada batas Nominal Besar',
      );
    }

    if (user.role !== Role.admin && user.role !== Role.finance) {
      throw new ForbiddenException(
        'Hanya Admin dan Finance yang dapat mengonfirmasi perubahan batas',
      );
    }

    const request = await this.prisma.limitChangeRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Usulan perubahan batas tidak ditemukan');
    }

    if (request.status !== LimitChangeStatus.menunggu_konfirmasi) {
      throw new BadRequestException(
        'Usulan perubahan batas sudah diproses sebelumnya',
      );
    }

    // Validasi dua pihak
    if (request.proposedBy === user.id) {
      throw new BadRequestException(
        'Pengonfirmasi harus orang yang berbeda dari pengusul',
      );
    }

    if (request.proposerRole === user.role) {
      throw new BadRequestException(
        'Pengonfirmasi harus memiliki peran yang berbeda dari pengusul (satu Admin, satu Finance)',
      );
    }

    const isApproved =
      dto.decision === 'berlaku' || dto.decision === 'disetujui';

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReq = await tx.limitChangeRequest.update({
        where: { id },
        data: {
          status: isApproved
            ? LimitChangeStatus.berlaku
            : LimitChangeStatus.ditolak,
          confirmedBy: user.id,
          confirmerRole: user.role,
          decidedAt: new Date(),
        },
        include: {
          proposer: { select: { id: true, name: true } },
          confirmer: { select: { id: true, name: true } },
        },
      });

      if (isApproved) {
        // Gantikan limit aktif sebelumnya
        await tx.approvalLimit.updateMany({
          where: { status: LimitStatus.berlaku },
          data: { status: LimitStatus.digantikan },
        });

        // Buat batas baru yang berlaku
        await tx.approvalLimit.create({
          data: {
            amount: request.newAmount,
            status: LimitStatus.berlaku,
            effectiveFrom: new Date(),
            confirmedAt: new Date(),
          },
        });
      }

      return updatedReq;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: isApproved
        ? 'konfirmasi_batas_nominal_besar'
        : 'tolak_batas_nominal_besar',
      module: 'expenses',
      entityId: id,
      afterData: {
        decision: dto.decision,
        newAmount: request.newAmount.toString(),
      },
      ipAddress: ip,
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // PENGELUARAN (EXPENSES)
  // ─────────────────────────────────────────────────────────────

  /**
   * Membuat pengeluaran baru (draft atau diajukan langsung).
   */
  async create(dto: CreateExpenseDto, user: AuthenticatedUser, ip?: string) {
    // 1. Validasi proyek
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (project.status === 'ditutup') {
      throw new BadRequestException(
        'Tidak dapat membuat pengeluaran untuk proyek yang sudah ditutup',
      );
    }

    // 2. Validasi akses proyek berdasarkan peran:
    // pengguna: proyek yang ia ikuti; admin: proyek departemennya; finance: proyek mana pun
    if (user.role === Role.pengguna) {
      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: dto.projectId,
            userId: user.id,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException(
          'Pengguna harus terdaftar sebagai anggota proyek untuk mengajukan pengeluaran',
        );
      }
    } else if (user.role === Role.admin) {
      if (project.departmentId !== user.departmentId) {
        throw new BadRequestException(
          'Admin hanya dapat membuat pengeluaran untuk proyek dalam departemennya sendiri',
        );
      }
    } else if (user.role === Role.super_admin) {
      throw new ForbiddenException(
        'Super Admin tidak diizinkan membuat pengeluaran',
      );
    }

    // 3. Validasi task jika diisi
    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: dto.taskId },
      });
      if (!task || task.deletedAt || task.projectId !== dto.projectId) {
        throw new NotFoundException(
          'Task tidak ditemukan atau tidak berada dalam proyek ini',
        );
      }
    }

    // 4. Validasi cost center & category
    const [costCenter, category] = await Promise.all([
      this.prisma.costCenter.findUnique({ where: { id: dto.costCenterId } }),
      this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      }),
    ]);

    if (!costCenter || !costCenter.isActive) {
      throw new BadRequestException('Cost center tidak valid atau tidak aktif');
    }

    if (!category || !category.isActive) {
      throw new BadRequestException(
        'Kategori pengeluaran tidak valid atau tidak aktif',
      );
    }

    // 5. Cek batas Nominal Besar
    const currentLimit = await this.getCurrentLimit();
    const isLargeAmount =
      Number(dto.amount) >= Number(currentLimit.amount.toString());

    // 6. Validasi jika diajukan langsung
    const isSubmitting = Boolean(dto.submitNow);
    if (isSubmitting && isLargeAmount) {
      const hasReceipt = Boolean(dto.attachmentId || dto.receiptUrl);
      const hasNote = Boolean(dto.note && dto.note.trim().length > 0);

      if (!hasReceipt || !hasNote) {
        throw new BadRequestException(
          'Pengeluaran Nominal Besar wajib menyertakan bukti nota dan catatan alasan',
        );
      }
    }

    // 7. Tentukan status awal jika diajukan: selalu menunggu_admin
    let initialStatus: ExpenseStatus = ExpenseStatus.draft;
    if (isSubmitting) {
      initialStatus = ExpenseStatus.menunggu_admin;
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          requesterId: user.id,
          projectId: dto.projectId,
          taskId: dto.taskId ?? null,
          costCenterId: dto.costCenterId,
          categoryId: dto.categoryId,
          amount: new Prisma.Decimal(dto.amount),
          expenseDate: new Date(dto.expenseDate),
          vendor: dto.vendor?.trim() ?? null,
          note: dto.note?.trim() ?? null,
          status: initialStatus,
          isLargeAmount,
          limitAtSubmission: isSubmitting ? currentLimit.amount : null,
          submittedAt: isSubmitting ? new Date() : null,
        },
      });

      // Simpan bukti nota jika ada
      if (dto.receiptUrl) {
        await tx.attachment.create({
          data: {
            ownerType: AttachmentOwner.expense,
            ownerId: created.id,
            fileUrl: dto.receiptUrl,
            fileName: 'nota_pembelian',
            mimeType: 'image/jpeg',
            size: 1024,
            uploadedBy: user.id,
          },
        });
      }

      // Buat approval entries jika diajukan
      if (isSubmitting) {
        // Langkah 1 admin
        await tx.approval.create({
          data: {
            documentType: DocumentType.expense,
            documentId: created.id,
            stepOrder: 1,
            role: Role.admin,
            status: ApprovalStatus.menunggu,
          },
        });
      }

      return created;
    });

    if (isSubmitting) {
      await this.detectSplitExpenses(expense.id);
    }

    await this.auditLogger.log({
      userId: user.id,
      action: isSubmitting ? 'submit_expense' : 'create_expense',
      module: 'expenses',
      entityId: expense.id,
      afterData: {
        amount: dto.amount,
        isLargeAmount,
        status: initialStatus,
      },
      ipAddress: ip,
    });

    return this.findOne(expense.id, user);
  }

  /**
   * Mengajukan pengeluaran yang berstatus draft atau ditolak.
   */
  async submit(id: string, user: AuthenticatedUser, ip?: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { requester: true },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (expense.requesterId !== user.id) {
      throw new ForbiddenException(
        'Hanya pemilik yang dapat mengajukan pengeluaran',
      );
    }

    if (
      expense.status !== ExpenseStatus.draft &&
      expense.status !== ExpenseStatus.ditolak
    ) {
      throw new BadRequestException(
        'Hanya pengeluaran draft atau ditolak yang dapat diajukan',
      );
    }

    const currentLimit = await this.getCurrentLimit();
    const isLargeAmount =
      Number(expense.amount.toString()) >=
      Number(currentLimit.amount.toString());

    if (isLargeAmount) {
      const attachmentsCount = await this.prisma.attachment.count({
        where: {
          ownerType: AttachmentOwner.expense,
          ownerId: id,
        },
      });

      const hasNote = Boolean(expense.note && expense.note.trim().length > 0);
      if (attachmentsCount === 0 || !hasNote) {
        throw new BadRequestException(
          'Pengeluaran Nominal Besar wajib menyertakan bukti nota dan catatan alasan',
        );
      }
    }

    const nextStatus: ExpenseStatus = ExpenseStatus.menunggu_admin;

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: {
          status: nextStatus,
          isLargeAmount,
          limitAtSubmission: currentLimit.amount,
          submittedAt: new Date(),
        },
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.expense,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.expense,
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
    });

    await this.detectSplitExpenses(id);

    await this.auditLogger.log({
      userId: user.id,
      action: 'submit_expense',
      module: 'expenses',
      entityId: id,
      afterData: { status: nextStatus, isLargeAmount },
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Admin menyetujui pengeluaran (langkah 1).
   */
  async approveAdmin(id: string, user: AuthenticatedUser, ip?: string) {
    if (user.role !== Role.admin) {
      throw new ForbiddenException(
        'Hanya Admin yang dapat menyetujui pengeluaran di langkah 1',
      );
    }

    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, departmentId: true } },
        project: { select: { id: true, departmentId: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    // Cek departemen jika Admin
    if (user.role === Role.admin) {
      const isSameDept =
        expense.project.departmentId === user.departmentId ||
        expense.requester.departmentId === user.departmentId;

      if (!isSameDept) {
        throw new NotFoundException('Pengeluaran tidak ditemukan');
      }
    }

    // Tidak boleh menyetujui milik sendiri
    if (expense.requesterId === user.id) {
      const otherAdmin = await this.prisma.user.findFirst({
        where: {
          departmentId: expense.requester.departmentId,
          role: Role.admin,
          isActive: true,
          deletedAt: null,
          id: { not: user.id },
        },
      });

      if (!otherAdmin) {
        throw new BadRequestException(
          'Pengeluaran tertahan: tidak ada admin lain di departemen yang sama untuk menyetujui. Pengaju tidak dapat menyetujui pengeluarannya sendiri.',
        );
      }

      throw new BadRequestException(
        'Tidak dapat menyetujui pengeluaran milik sendiri. Langkah Admin harus disetujui oleh admin lain di departemen yang sama.',
      );
    }

    if (expense.status !== ExpenseStatus.menunggu_admin) {
      throw new BadRequestException(
        'Hanya pengeluaran dengan status menunggu_admin yang dapat disetujui Admin',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { status: ExpenseStatus.menunggu_finance },
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.expense,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.expense,
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

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.expense,
            documentId: id,
            stepOrder: 2,
          },
        },
        create: {
          documentType: DocumentType.expense,
          documentId: id,
          stepOrder: 2,
          role: Role.finance,
          status: ApprovalStatus.menunggu,
        },
        update: {
          status: ApprovalStatus.menunggu,
          approverId: null,
          actedAt: null,
          reason: null,
        },
      });
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'approve_expense_admin',
      module: 'expenses',
      entityId: id,
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Finance memverifikasi pengeluaran (langkah 2).
   * Pengeluaran yang diverifikasi Finance langsung menjadi siap_dibayar.
   */
  async verifyFinance(id: string, user: AuthenticatedUser, ip?: string) {
    if (user.role !== Role.finance) {
      throw new ForbiddenException(
        'Hanya Finance yang dapat memverifikasi pengeluaran',
      );
    }

    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    // Tidak boleh memverifikasi milik sendiri
    if (expense.requesterId === user.id) {
      const otherFinance = await this.prisma.user.findFirst({
        where: {
          role: Role.finance,
          isActive: true,
          deletedAt: null,
          id: { not: user.id },
        },
      });

      if (!otherFinance) {
        throw new BadRequestException(
          'Pengeluaran tertahan: tidak ada finance lain untuk memverifikasi. Pengaju tidak dapat memverifikasi pengeluarannya sendiri.',
        );
      }

      throw new BadRequestException(
        'Tidak dapat memverifikasi pengeluaran milik sendiri. Langkah Finance harus diverifikasi oleh finance lain.',
      );
    }

    if (expense.status !== ExpenseStatus.menunggu_finance) {
      throw new BadRequestException(
        'Hanya pengeluaran dengan status menunggu_finance yang dapat diverifikasi Finance',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { status: ExpenseStatus.siap_dibayar },
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.expense,
            documentId: id,
            stepOrder: 2,
          },
        },
        create: {
          documentType: DocumentType.expense,
          documentId: id,
          stepOrder: 2,
          role: Role.finance,
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
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'verify_expense_finance',
      module: 'expenses',
      entityId: id,
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Menolak pengeluaran (baik langkah Admin maupun Finance).
   */
  async reject(
    id: string,
    dto: RejectExpenseDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, departmentId: true } },
        project: { select: { id: true, departmentId: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (expense.requesterId === user.id) {
      throw new BadRequestException(
        'Tidak dapat menolak pengeluaran milik sendiri',
      );
    }

    let stepOrder = 1;
    let requiredRole: Role = Role.admin;

    if (expense.status === ExpenseStatus.menunggu_admin) {
      stepOrder = 1;
      requiredRole = Role.admin;
      if (user.role !== Role.admin) {
        throw new ForbiddenException(
          'Hanya Admin yang dapat menolak pada tahap ini',
        );
      }
      const isSameDept =
        expense.project.departmentId === user.departmentId ||
        expense.requester.departmentId === user.departmentId;
      if (!isSameDept) {
        throw new NotFoundException('Pengeluaran tidak ditemukan');
      }
    } else if (expense.status === ExpenseStatus.menunggu_finance) {
      stepOrder = 2;
      requiredRole = Role.finance;
      if (user.role !== Role.finance) {
        throw new ForbiddenException(
          'Hanya Finance yang dapat menolak pada tahap ini',
        );
      }
    } else {
      throw new BadRequestException(
        'Pengeluaran dengan status saat ini tidak dapat ditolak',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { status: ExpenseStatus.ditolak },
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.expense,
            documentId: id,
            stepOrder,
          },
        },
        create: {
          documentType: DocumentType.expense,
          documentId: id,
          stepOrder,
          role: requiredRole,
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
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'reject_expense',
      module: 'expenses',
      entityId: id,
      afterData: { reason: dto.reason.trim(), stepOrder },
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Finance mencatat pembayaran untuk pengeluaran yang berstatus siap_dibayar.
   */
  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (user.role !== Role.finance) {
      throw new ForbiddenException(
        'Hanya Finance yang dapat mencatat pembayaran',
      );
    }

    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (expense.status !== ExpenseStatus.siap_dibayar) {
      throw new BadRequestException(
        'Hanya pengeluaran dengan status siap_dibayar yang dapat dibayar',
      );
    }

    if (expense.payment) {
      throw new ConflictException(
        'Pembayaran untuk pengeluaran ini sudah dicatat',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          expenseId: id,
          paidBy: user.id,
          paidAt: new Date(dto.paidAt),
          method: dto.method,
          referenceNo: dto.referenceNo?.trim() ?? null,
          amount: expense.amount,
        },
      });

      await tx.expense.update({
        where: { id },
        data: { status: ExpenseStatus.dibayar },
      });
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'record_payment',
      module: 'expenses',
      entityId: id,
      afterData: {
        method: dto.method,
        paidAt: dto.paidAt,
        referenceNo: dto.referenceNo,
      },
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Mengambil daftar pengeluaran sesuai peran dan query filter.
   */
  async findMany(query: ExpenseQueryDto, user: AuthenticatedUser) {
    const where: Prisma.ExpenseWhereInput = {};

    // 1. Cakupan data berdasarkan peran
    if (user.role === Role.pengguna) {
      where.requesterId = user.id;
    } else if (user.role === Role.admin) {
      where.OR = [
        { requester: { departmentId: user.departmentId ?? undefined } },
        { project: { departmentId: user.departmentId ?? undefined } },
      ];
    } else {
      // Finance dan Super Admin
      if (query.departmentId) {
        where.OR = [
          { requester: { departmentId: query.departmentId } },
          { project: { departmentId: query.departmentId } },
        ];
      }
    }

    // 2. Filter parameter
    if (query.status) {
      where.status = query.status;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.isLargeAmount !== undefined) {
      where.isLargeAmount = query.isLargeAmount;
    }

    if (query.vendor) {
      where.vendor = { contains: query.vendor };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { id: true, name: true } },
            },
          },
          project: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
          costCenter: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, name: true } },
          payment: true,
          flags: true,
        },
        orderBy: [{ isLargeAmount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil detail satu pengeluaran beserta riwayat persetujuan.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
        project: { select: { id: true, name: true, departmentId: true } },
        task: { select: { id: true, title: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        payment: true,
        flags: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    // Pengecekan hak akses scope data
    if (user.role === Role.pengguna && expense.requesterId !== user.id) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (user.role === Role.admin) {
      const isSameDept =
        expense.project.departmentId === user.departmentId ||
        expense.requester.department?.id === user.departmentId;

      if (!isSameDept && expense.requesterId !== user.id) {
        throw new NotFoundException('Pengeluaran tidak ditemukan');
      }
    }

    // Ambil riwayat persetujuan
    const approvals = await this.prisma.approval.findMany({
      where: {
        documentType: DocumentType.expense,
        documentId: id,
      },
      include: {
        approver: { select: { id: true, name: true } },
      },
      orderBy: { stepOrder: 'asc' },
    });

    // Ambil attachments
    const attachments = await this.prisma.attachment.findMany({
      where: {
        ownerType: AttachmentOwner.expense,
        ownerId: id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...expense,
      approvalHistory: approvals,
      attachments,
    };
  }

  /**
   * Mengubah pengeluaran (hanya status draft atau ditolak).
   */
  async update(
    id: string,
    dto: UpdateExpenseDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (expense.requesterId !== user.id) {
      throw new ForbiddenException(
        'Hanya pemilik yang dapat mengubah pengeluaran',
      );
    }

    if (
      expense.status !== ExpenseStatus.draft &&
      expense.status !== ExpenseStatus.ditolak
    ) {
      throw new BadRequestException(
        'Hanya pengeluaran draft atau ditolak yang dapat diubah',
      );
    }

    const currentLimit = await this.getCurrentLimit();
    const targetAmount = dto.amount ?? Number(expense.amount.toString());
    const isLargeAmount =
      Number(targetAmount) >= Number(currentLimit.amount.toString());

    await this.prisma.expense.update({
      where: { id },
      data: {
        amount: dto.amount ? new Prisma.Decimal(dto.amount) : undefined,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        vendor: dto.vendor !== undefined ? dto.vendor : undefined,
        note: dto.note !== undefined ? dto.note : undefined,
        categoryId: dto.categoryId ?? undefined,
        costCenterId: dto.costCenterId ?? undefined,
        taskId: dto.taskId !== undefined ? dto.taskId : undefined,
        isLargeAmount,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_expense',
      module: 'expenses',
      entityId: id,
      afterData: { amount: targetAmount, isLargeAmount },
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Menghapus draft pengeluaran.
   */
  async delete(id: string, user: AuthenticatedUser, ip?: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    if (expense.requesterId !== user.id) {
      throw new ForbiddenException(
        'Hanya pemilik yang dapat menghapus pengeluaran',
      );
    }

    if (
      expense.status !== ExpenseStatus.draft &&
      expense.status !== ExpenseStatus.ditolak
    ) {
      throw new BadRequestException(
        'Hanya pengeluaran draft atau ditolak yang dapat dihapus',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({
        where: { ownerType: AttachmentOwner.expense, ownerId: id },
      });
      await tx.approval.deleteMany({
        where: { documentType: DocumentType.expense, documentId: id },
      });
      await tx.expenseFlag.deleteMany({ where: { expenseId: id } });
      await tx.expense.delete({ where: { id } });
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_expense',
      module: 'expenses',
      entityId: id,
      ipAddress: ip,
    });

    return { message: 'Pengeluaran berhasil dihapus' };
  }

  /**
   * Deteksi pemecahan pengeluaran (Job / Heuristic):
   * Mencari pengeluaran dalam rentang 7 hari dari pengaju / vendor / kategori yang sama
   * jika totalnya mendekati atau melewati batas.
   */
  private async detectSplitExpenses(expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) return;

    const sevenDaysAgo = new Date(expense.expenseDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sevenDaysAhead = new Date(expense.expenseDate);
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    const related = await this.prisma.expense.findMany({
      where: {
        id: { not: expenseId },
        expenseDate: { gte: sevenDaysAgo, lte: sevenDaysAhead },
        OR: [
          { requesterId: expense.requesterId },
          { vendor: expense.vendor ? expense.vendor : undefined },
        ],
      },
      select: { id: true, amount: true },
    });

    if (related.length > 0) {
      const currentLimit = await this.getCurrentLimit();
      const totalAmount =
        related.reduce((sum, r) => sum + Number(r.amount.toString()), 0) +
        Number(expense.amount.toString());

      if (totalAmount >= Number(currentLimit.amount.toString()) * 0.8) {
        await this.prisma.expenseFlag.create({
          data: {
            expenseId: expense.id,
            flagType: FlagType.terindikasi_dipecah,
            relatedExpenseIds: related.map((r) => r.id),
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LAMPIRAN NOTA (EXPENSE ATTACHMENTS)
  // ─────────────────────────────────────────────────────────────

  /**
   * Helper: ambil expense dan pastikan user bisa mengaksesnya sesuai scope peran.
   */
  private async findExpenseWithScope(id: string, user: AuthenticatedUser) {
    const expense = await this.prisma.expense.findFirst({
      where: { id },
      include: {
        requester: { select: { id: true, departmentId: true, role: true } },
      },
    });

    if (!expense) throw new NotFoundException('Pengeluaran tidak ditemukan');

    const { role } = user;
    if (role === Role.pengguna) {
      if (expense.requesterId !== user.id)
        throw new NotFoundException('Pengeluaran tidak ditemukan');
    } else if (role === Role.admin) {
      if (expense.requester?.departmentId !== user.departmentId)
        throw new NotFoundException('Pengeluaran tidak ditemukan');
    }
    // finance dan super_admin: bisa melihat semua

    return expense;
  }

  /**
   * Mengunggah nota untuk pengeluaran.
   * Hanya pengaju yang boleh mengunggah, dan hanya saat status draft atau ditolak.
   */
  async uploadAttachment(
    id: string,
    file: {
      buffer?: Buffer;
      size?: number;
      originalname?: string;
      mimetype?: string;
    },
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const expense = await this.findExpenseWithScope(id, user);

    // Hanya pengaju yang bisa mengunggah
    if (expense.requesterId !== user.id) {
      throw new ForbiddenException(
        'Hanya pengaju yang dapat mengunggah nota pengeluaran ini',
      );
    }

    // Hanya saat status draft atau ditolak
    const allowedStatuses: ExpenseStatus[] = [
      ExpenseStatus.draft,
      ExpenseStatus.ditolak,
    ];
    if (!allowedStatuses.includes(expense.status)) {
      throw new ForbiddenException(
        'Nota hanya dapat diunggah saat pengeluaran berstatus draft atau ditolak',
      );
    }

    // Validasi magic bytes dan ukuran (maks 10 MB)
    const { detectedMimeType } = validateFileSignatureAndSize(file);

    // Simpan file ke disk dengan nama acak (UUID, tanpa ekstensi asli)
    const storedFileName = await this.storageService.saveFile(
      file.buffer!,
      file.originalname!,
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerType: AttachmentOwner.expense,
        ownerId: id,
        fileUrl: storedFileName,
        fileName: file.originalname!,
        mimeType: detectedMimeType,
        size: file.size ?? file.buffer!.length,
        uploadedBy: user.id,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'upload_expense_attachment',
      module: 'expenses',
      entityId: attachment.id,
      beforeData: null,
      afterData: {
        id: attachment.id,
        fileName: attachment.fileName,
        size: attachment.size,
        mimeType: attachment.mimeType,
        expenseId: id,
      },
      ipAddress: ip,
    });

    return attachment;
  }

  /**
   * Mendapatkan daftar nota pengeluaran.
   * Pengaju, admin departemen, finance, dan super_admin bisa mengakses.
   */
  async getAttachments(id: string, user: AuthenticatedUser) {
    await this.findExpenseWithScope(id, user);

    return this.prisma.attachment.findMany({
      where: {
        ownerType: AttachmentOwner.expense,
        ownerId: id,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        uploadedBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Mendapatkan file path lampiran untuk diunduh (authenticated download).
   * Scope: pengaju, admin departemen, finance, super_admin.
   */
  async getAttachmentForDownload(
    id: string,
    attachmentId: string,
    user: AuthenticatedUser,
  ) {
    await this.findExpenseWithScope(id, user);

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: AttachmentOwner.expense,
        ownerId: id,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }

    const exists = await this.storageService.fileExists(attachment.fileUrl);
    if (!exists) {
      throw new NotFoundException('File fisik lampiran tidak ditemukan di server');
    }

    const filePath = this.storageService.getFilePath(attachment.fileUrl);
    return { filePath, attachment };
  }

  /**
   * Menghapus nota pengeluaran.
   * Hanya pengaju, hanya saat draft atau ditolak.
   */
  async removeAttachment(
    id: string,
    attachmentId: string,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const expense = await this.findExpenseWithScope(id, user);

    // Hanya pengaju
    if (expense.requesterId !== user.id) {
      throw new ForbiddenException(
        'Hanya pengaju yang dapat menghapus nota pengeluaran ini',
      );
    }

    // Hanya saat status draft atau ditolak
    const allowedStatuses: ExpenseStatus[] = [
      ExpenseStatus.draft,
      ExpenseStatus.ditolak,
    ];
    if (!allowedStatuses.includes(expense.status)) {
      throw new ForbiddenException(
        'Nota hanya dapat dihapus saat pengeluaran berstatus draft atau ditolak',
      );
    }

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: AttachmentOwner.expense,
        ownerId: id,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }

    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    await this.storageService.deleteFile(attachment.fileUrl);

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_expense_attachment',
      module: 'expenses',
      entityId: attachmentId,
      beforeData: {
        id: attachment.id,
        fileName: attachment.fileName,
        expenseId: id,
      },
      afterData: null,
      ipAddress: ip,
    });

    return { message: 'Nota berhasil dihapus', id: attachmentId };
  }
}
