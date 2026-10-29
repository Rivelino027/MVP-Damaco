import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  BudgetRequestStatus,
  BudgetRequestType,
  BudgetStatus,
  DocumentType,
  ExpenseStatus,
  Prisma,
  Role,
  TimesheetStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { LaborCostsService } from '../labor-costs/services/labor-costs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { ApproveBudgetDto } from './dto/approve-budget.dto';
import { BudgetRequestQueryDto } from './dto/budget-request-query.dto';
import { CreateBudgetRequestDto } from './dto/create-budget-request.dto';
import { RejectBudgetDto } from './dto/reject-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly laborCostsService: LaborCostsService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Membuat pengajuan anggaran (awal atau perubahan).
   */
  async create(
    dto: CreateBudgetRequestDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Pengguna tidak memiliki izin untuk mengajukan anggaran',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      project.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'Admin hanya dapat mengelola anggaran proyek di departemennya',
      );
    }

    if (project.status === 'ditutup') {
      throw new BadRequestException(
        'Tidak dapat mengajukan anggaran untuk proyek yang sudah ditutup',
      );
    }

    // Cek keberadaan anggaran aktif
    const activeBudget = await this.prisma.budget.findFirst({
      where: { projectId: dto.projectId, status: BudgetStatus.aktif },
      orderBy: { version: 'desc' },
    });

    if (dto.type === BudgetRequestType.awal && activeBudget) {
      throw new BadRequestException(
        'Proyek sudah memiliki anggaran aktif, gunakan tipe perubahan',
      );
    }

    if (dto.type === BudgetRequestType.perubahan && !activeBudget) {
      throw new BadRequestException(
        'Proyek belum memiliki anggaran aktif, gunakan tipe awal',
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Rincian item anggaran tidak boleh kosong');
    }

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + Number(item.newAmount),
      0,
    );

    let extraAmount: number | null = null;
    if (dto.type === BudgetRequestType.perubahan && activeBudget) {
      extraAmount = totalAmount - Number(activeBudget.totalAmount.toString());
    }

    const isSubmitting = Boolean(dto.submitNow);
    const initialStatus = isSubmitting
      ? BudgetRequestStatus.menunggu_finance
      : BudgetRequestStatus.draft;

    const budgetRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.budgetRequest.create({
        data: {
          projectId: dto.projectId,
          type: dto.type,
          requestedById: user.id,
          totalAmount: new Prisma.Decimal(totalAmount),
          extraAmount:
            extraAmount !== null ? new Prisma.Decimal(extraAmount) : null,
          newEndDate: dto.newEndDate ? new Date(dto.newEndDate) : null,
          reason: dto.reason?.trim() ?? null,
          status: initialStatus,
          submittedAt: isSubmitting ? new Date() : null,
          items: {
            create: dto.items.map((item) => ({
              phaseId: item.phaseId ?? null,
              categoryId: item.categoryId,
              oldAmount: new Prisma.Decimal(item.oldAmount ?? 0),
              newAmount: new Prisma.Decimal(item.newAmount),
            })),
          },
        },
      });

      if (isSubmitting) {
        // Step 1: Admin (pengaju / departemen)
        await tx.approval.create({
          data: {
            documentType: DocumentType.budget_request,
            documentId: created.id,
            stepOrder: 1,
            role: Role.admin,
            status: ApprovalStatus.disetujui,
            approverId: user.id,
            actedAt: new Date(),
            reason: 'Diajukan oleh Admin / Pengelola Proyek',
          },
        });

        // Step 2: Finance (cek kelayakan)
        await tx.approval.create({
          data: {
            documentType: DocumentType.budget_request,
            documentId: created.id,
            stepOrder: 2,
            role: Role.finance,
            status: ApprovalStatus.menunggu,
          },
        });

        // Step 3: Super Admin (keputusan final)
        await tx.approval.create({
          data: {
            documentType: DocumentType.budget_request,
            documentId: created.id,
            stepOrder: 3,
            role: Role.super_admin,
            status: ApprovalStatus.menunggu,
          },
        });
      }

      return created;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: isSubmitting ? 'submit_budget_request' : 'create_budget_request',
      module: 'budgets',
      entityId: budgetRequest.id,
      afterData: {
        projectId: dto.projectId,
        type: dto.type,
        totalAmount,
        status: initialStatus,
      },
      ipAddress: ip,
    });

    return this.findOne(budgetRequest.id, user);
  }

  /**
   * Mengajukan pengajuan anggaran (draft atau ditolak -> menunggu_finance).
   */
  async submit(id: string, user: AuthenticatedUser, ip?: string) {
    const request = await this.prisma.budgetRequest.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!request) {
      throw new NotFoundException('Pengajuan anggaran tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      request.project.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'Admin hanya dapat mengelola anggaran proyek di departemennya',
      );
    }

    if (
      request.status !== BudgetRequestStatus.draft &&
      request.status !== BudgetRequestStatus.ditolak
    ) {
      throw new BadRequestException(
        'Hanya pengajuan anggaran draft atau ditolak yang dapat diajukan',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetRequest.update({
        where: { id },
        data: {
          status: BudgetRequestStatus.menunggu_finance,
          submittedAt: new Date(),
        },
      });

      // Step 1: Admin
      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder: 1,
          },
        },
        create: {
          documentType: DocumentType.budget_request,
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

      // Step 2: Finance
      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder: 2,
          },
        },
        create: {
          documentType: DocumentType.budget_request,
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

      // Step 3: Super Admin
      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder: 3,
          },
        },
        create: {
          documentType: DocumentType.budget_request,
          documentId: id,
          stepOrder: 3,
          role: Role.super_admin,
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
      action: 'submit_budget_request',
      module: 'budgets',
      entityId: id,
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Menyetujui pengajuan anggaran:
   * - Finance: langkah 2 (menunggu_finance -> menunggu_super_admin)
   * - Super Admin: langkah 3 (menunggu_super_admin -> disetujui + aktivasi Budget baru)
   */
  async approve(
    id: string,
    dto: ApproveBudgetDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const budgetReq = await this.prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        items: true,
        project: true,
      },
    });

    if (!budgetReq) {
      throw new NotFoundException('Pengajuan anggaran tidak ditemukan');
    }

    if (budgetReq.status === BudgetRequestStatus.menunggu_finance) {
      // Langkah 2: Finance
      if (user.role !== Role.finance && user.role !== Role.super_admin) {
        throw new ForbiddenException(
          'Hanya Finance dan Super Admin yang dapat memverifikasi kelayakan anggaran',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.budgetRequest.update({
          where: { id },
          data: { status: BudgetRequestStatus.menunggu_super_admin },
        });

        await tx.approval.upsert({
          where: {
            documentType_documentId_stepOrder: {
              documentType: DocumentType.budget_request,
              documentId: id,
              stepOrder: 2,
            },
          },
          create: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder: 2,
            role: Role.finance,
            status: ApprovalStatus.disetujui,
            approverId: user.id,
            actedAt: new Date(),
            reason: dto.reason?.trim() ?? null,
          },
          update: {
            status: ApprovalStatus.disetujui,
            approverId: user.id,
            actedAt: new Date(),
            reason: dto.reason?.trim() ?? null,
          },
        });
      });

      await this.auditLogger.log({
        userId: user.id,
        action: 'approve_budget_finance',
        module: 'budgets',
        entityId: id,
        ipAddress: ip,
      });

      return this.findOne(id, user);
    }

    if (budgetReq.status === BudgetRequestStatus.menunggu_super_admin) {
      // Langkah 3: Super Admin
      if (user.role !== Role.super_admin) {
        throw new ForbiddenException(
          'Hanya Super Admin yang dapat memutuskan persetujuan akhir anggaran',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        // 1. Update status request
        await tx.budgetRequest.update({
          where: { id },
          data: { status: BudgetRequestStatus.disetujui },
        });

        // 2. Update approval record step 3
        await tx.approval.upsert({
          where: {
            documentType_documentId_stepOrder: {
              documentType: DocumentType.budget_request,
              documentId: id,
              stepOrder: 3,
            },
          },
          create: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder: 3,
            role: Role.super_admin,
            status: ApprovalStatus.disetujui,
            approverId: user.id,
            actedAt: new Date(),
            reason: dto.reason?.trim() ?? null,
          },
          update: {
            status: ApprovalStatus.disetujui,
            approverId: user.id,
            actedAt: new Date(),
            reason: dto.reason?.trim() ?? null,
          },
        });

        // 3. Arsipkan budget aktif sebelumnya
        const prevBudget = await tx.budget.findFirst({
          where: {
            projectId: budgetReq.projectId,
            status: BudgetStatus.aktif,
          },
          orderBy: { version: 'desc' },
        });

        let nextVersion = 1;
        if (prevBudget) {
          await tx.budget.update({
            where: { id: prevBudget.id },
            data: { status: BudgetStatus.digantikan },
          });
          nextVersion = prevBudget.version + 1;
        }

        // 4. Buat budget baru yang aktif dan terkunci
        await tx.budget.create({
          data: {
            projectId: budgetReq.projectId,
            version: nextVersion,
            status: BudgetStatus.aktif,
            totalAmount: budgetReq.totalAmount,
            isBaseline: true,
            lockedAt: new Date(),
            approvedBy: user.id,
            items: {
              create: budgetReq.items.map((item) => ({
                phaseId: item.phaseId,
                categoryId: item.categoryId,
                amount: item.newAmount,
              })),
            },
          },
        });

        // 5. Update tanggal selesai proyek jika diusulkan perpanjangan
        if (budgetReq.newEndDate) {
          await tx.project.update({
            where: { id: budgetReq.projectId },
            data: { endDate: budgetReq.newEndDate },
          });
        }

        // 6. Jika ini anggaran awal, transisi proyek dari 'diajukan' ke 'berjalan'
        //    (skip jika proyek sudah berjalan — kasus migrasi data atau setup awal)
        if (budgetReq.type === BudgetRequestType.awal) {
          const currentProject = await tx.project.findFirst({
            where: { id: budgetReq.projectId },
            select: { status: true },
          });
          if (currentProject?.status === 'diajukan') {
            await this.projectsService.transitionToRunning(budgetReq.projectId, tx);
          }
        }
      });

      await this.auditLogger.log({
        userId: user.id,
        action: 'approve_budget_super_admin',
        module: 'budgets',
        entityId: id,
        afterData: { totalAmount: budgetReq.totalAmount.toString() },
        ipAddress: ip,
      });

      return this.findOne(id, user);
    }

    throw new BadRequestException(
      'Pengajuan anggaran tidak berada dalam status yang dapat disetujui',
    );
  }

  /**
   * Menolak pengajuan anggaran (Finance atau Super Admin).
   */
  async reject(
    id: string,
    dto: RejectBudgetDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const budgetReq = await this.prisma.budgetRequest.findUnique({
      where: { id },
    });

    if (!budgetReq) {
      throw new NotFoundException('Pengajuan anggaran tidak ditemukan');
    }

    let stepOrder = 2;
    let requiredRole: Role = Role.finance;

    if (budgetReq.status === BudgetRequestStatus.menunggu_finance) {
      stepOrder = 2;
      requiredRole = Role.finance;
      if (user.role !== Role.finance && user.role !== Role.super_admin) {
        throw new ForbiddenException(
          'Hanya Finance dan Super Admin yang dapat menolak pada tahap ini',
        );
      }
    } else if (budgetReq.status === BudgetRequestStatus.menunggu_super_admin) {
      stepOrder = 3;
      requiredRole = Role.super_admin;
      if (user.role !== Role.super_admin) {
        throw new ForbiddenException(
          'Hanya Super Admin yang dapat menolak pada tahap ini',
        );
      }
    } else {
      throw new BadRequestException(
        'Pengajuan anggaran tidak berada dalam status yang dapat ditolak',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetRequest.update({
        where: { id },
        data: { status: BudgetRequestStatus.ditolak },
      });

      await tx.approval.upsert({
        where: {
          documentType_documentId_stepOrder: {
            documentType: DocumentType.budget_request,
            documentId: id,
            stepOrder,
          },
        },
        create: {
          documentType: DocumentType.budget_request,
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
      action: 'reject_budget_request',
      module: 'budgets',
      entityId: id,
      afterData: { reason: dto.reason.trim(), stepOrder },
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  /**
   * Mengambil anggaran aktif suatu proyek.
   */
  async getActiveBudget(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      project.departmentId !== user.departmentId
    ) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    return this.prisma.budget.findFirst({
      where: { projectId, status: BudgetStatus.aktif },
      include: {
        items: {
          include: {
            category: { select: { id: true, name: true } },
            phase: { select: { id: true, name: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Mengambil ringkasan anggaran vs aktual untuk proyek.
   */
  async getBudgetSummary(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      project.departmentId !== user.departmentId
    ) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    const budget = await this.getActiveBudget(projectId, user);

    // Ambil pengeluaran nyata yang telah disetujui / dibayar
    const expenses = await this.prisma.expense.findMany({
      where: {
        projectId,
        status: {
          in: [
            ExpenseStatus.siap_dibayar,
            ExpenseStatus.dibayar,
            ExpenseStatus.disetujui,
          ],
        },
      },
      select: { categoryId: true, amount: true },
    });

    // Ambil biaya tenaga kerja teragregasi dari LaborCostsService (aman dari kebocoran)
    const laborAgg = await this.laborCostsService.getProjectAggregate(
      projectId,
      user,
    );

    const isSuperAdmin = user.role === Role.super_admin;
    const isLaborCostHidden =
      laborAgg.workerCount > 0 && laborAgg.isCostHidden && !isSuperAdmin;
    const laborActual = isLaborCostHidden
      ? null
      : laborAgg.workerCount === 0
        ? 0
        : laborAgg.costAmount
          ? Number(laborAgg.costAmount)
          : 0;

    const expenseActual = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount.toString()),
      0,
    );

    // Jika biaya tenaga kerja disembunyikan, totalActual juga disembunyikan (null)
    // agar Admin/Finance tidak dapat melakukan pengurangan (totalActual - expenseActual)
    // untuk membocorkan biaya tenaga kerja satu pekerja.
    const totalActual = isLaborCostHidden
      ? null
      : (laborActual ?? 0) + expenseActual;
    const totalBudgeted = budget ? Number(budget.totalAmount.toString()) : 0;
    const absorptionPct =
      totalActual !== null && totalBudgeted > 0
        ? Math.round((totalActual / totalBudgeted) * 100 * 100) / 100
        : null;

    // Hitung progres task
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(
      (t) => t.status === 'selesai',
    ).length;
    const progressPct =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100
        : 0;

    // Rincian kategori
    const categoriesMap = new Map<
      string,
      { categoryName: string; budgeted: number; actual: number }
    >();

    if (budget && budget.items) {
      for (const item of budget.items) {
        const catId = item.categoryId;
        const catName = item.category?.name ?? 'Kategori';
        const existing = categoriesMap.get(catId) || {
          categoryName: catName,
          budgeted: 0,
          actual: 0,
        };
        existing.budgeted += Number(item.amount.toString());
        categoriesMap.set(catId, existing);
      }
    }

    for (const exp of expenses) {
      const existing = categoriesMap.get(exp.categoryId);
      if (existing) {
        existing.actual += Number(exp.amount.toString());
      }
    }

    const categories = Array.from(categoriesMap.entries()).map(
      ([categoryId, val]) => ({
        categoryId,
        categoryName: val.categoryName,
        budgeted: val.budgeted,
        actual: val.actual,
        absorptionPct:
          val.budgeted > 0
            ? Math.round((val.actual / val.budgeted) * 100 * 100) / 100
            : 0,
      }),
    );

    return {
      projectId,
      totalBudgeted,
      totalActual,
      laborActual,
      isCostHidden: isLaborCostHidden,
      hiddenReason: isLaborCostHidden ? laborAgg.hiddenReason : null,
      absorptionPct: absorptionPct ?? 0,
      progressPct,
      isEarlyWarning:
        absorptionPct !== null &&
        absorptionPct > progressPct &&
        progressPct < 100,
      isOverBudget:
        totalActual !== null ? totalActual > totalBudgeted : false,
      categories,
      budget,
    };
  }

  /**
   * Mengambil daftar pengajuan anggaran sesuai peran.
   */
  async findMany(query: BudgetRequestQueryDto, user: AuthenticatedUser) {
    const where: Prisma.BudgetRequestWhereInput = {};

    if (user.role === Role.admin) {
      where.project = {
        departmentId: user.departmentId ?? undefined,
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.budgetRequest.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              department: { select: { id: true, name: true } },
            },
          },
          requestedBy: { select: { id: true, name: true } },
          items: {
            include: {
              category: { select: { id: true, name: true } },
              phase: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.budgetRequest.count({ where }),
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
   * Mengambil detail satu pengajuan anggaran.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    const request = await this.prisma.budgetRequest.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
        requestedBy: { select: { id: true, name: true } },
        items: {
          include: {
            category: { select: { id: true, name: true } },
            phase: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Pengajuan anggaran tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      request.project.departmentId !== user.departmentId &&
      request.requestedById !== user.id
    ) {
      throw new NotFoundException('Pengajuan anggaran tidak ditemukan');
    }

    const approvals = await this.prisma.approval.findMany({
      where: {
        documentType: DocumentType.budget_request,
        documentId: id,
      },
      include: {
        approver: { select: { id: true, name: true } },
      },
      orderBy: { stepOrder: 'asc' },
    });

    return {
      ...request,
      approvalHistory: approvals,
    };
  }
}
