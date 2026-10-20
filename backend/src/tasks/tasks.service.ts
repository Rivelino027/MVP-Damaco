import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentOwner,
  Prisma,
  Priority,
  Project,
  ProjectStatus,
  Role,
  Task,
  TaskStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { STORAGE_SERVICE, StorageService } from './storage/storage.interface';
import { validateFileSignatureAndSize } from './utils/file-validator.util';

/**
 * Select eksplisit untuk peran pengguna (TIDAK memuat biaya, tarif, atau relasi finansial apapun)
 */
export const PENGGUNA_TASK_SELECT = {
  id: true,
  projectId: true,
  phaseId: true,
  title: true,
  description: true,
  assigneeId: true,
  status: true,
  priority: true,
  dueDate: true,
  estimatedHours: true,
  createdAt: true,
  updatedAt: true,
  phase: {
    select: {
      id: true,
      name: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      status: true,
      departmentId: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      avatarUrl: true,
    },
  },
  checklists: {
    select: {
      id: true,
      text: true,
      isDone: true,
    },
    orderBy: { id: 'asc' as const },
  },
  comments: {
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

/**
 * Select untuk admin, finance, dan super_admin
 */
export const DEFAULT_TASK_SELECT = {
  id: true,
  projectId: true,
  phaseId: true,
  title: true,
  description: true,
  assigneeId: true,
  status: true,
  priority: true,
  dueDate: true,
  estimatedHours: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  phase: {
    select: {
      id: true,
      name: true,
      sortOrder: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      status: true,
      departmentId: true,
      progressPercent: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      avatarUrl: true,
    },
  },
  checklists: {
    select: {
      id: true,
      text: true,
      isDone: true,
    },
    orderBy: { id: 'asc' as const },
  },
  comments: {
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  /**
   * Menghitung ulang progressPercent proyek di dalam transaksi:
   * (jumlah task selesai / total task tidak terhapus) * 100, dua desimal.
   * Proyek tanpa task memiliki progres 0.
   */
  async recalculateProjectProgress(
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<Prisma.Decimal> {
    const totalTasks = await tx.task.count({
      where: { projectId, deletedAt: null },
    });

    if (totalTasks === 0) {
      const zeroDecimal = new Prisma.Decimal(0);
      await tx.project.update({
        where: { id: projectId },
        data: { progressPercent: zeroDecimal },
      });
      return zeroDecimal;
    }

    const completedTasks = await tx.task.count({
      where: {
        projectId,
        deletedAt: null,
        status: TaskStatus.selesai,
      },
    });

    const progressValue = Number(
      ((completedTasks / totalTasks) * 100).toFixed(2),
    );
    const progressDecimal = new Prisma.Decimal(progressValue);

    await tx.project.update({
      where: { id: projectId },
      data: { progressPercent: progressDecimal },
    });

    return progressDecimal;
  }

  /**
   * Memeriksa hak akses terhadap task berdasarkan scope peran.
   * Mengembalikan 404 jika di luar scope agar tidak membocorkan keberadaan data.
   */
  async checkTaskAccess(
    taskId: string,
    user: AuthenticatedUser,
    mode: 'read' | 'write' | 'status_only' | 'delete' = 'read',
  ): Promise<Task & { project: Project }> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { project: true },
    });

    if (!task || task.project.deletedAt !== null) {
      throw new NotFoundException('Task tidak ditemukan');
    }

    if (user.role === Role.super_admin) {
      if (mode !== 'read' && task.project.status === ProjectStatus.ditutup) {
        throw new BadRequestException(
          'Proyek yang sudah ditutup tidak dapat diubah task-nya',
        );
      }
      return task;
    }

    if (user.role === Role.finance) {
      if (mode !== 'read') {
        throw new ForbiddenException(
          'Akses ditolak: Finance hanya memiliki hak akses baca',
        );
      }
      return task;
    }

    if (user.role === Role.admin) {
      if (task.project.departmentId !== user.departmentId) {
        throw new NotFoundException('Task tidak ditemukan');
      }
      if (mode !== 'read' && task.project.status === ProjectStatus.ditutup) {
        throw new BadRequestException(
          'Proyek yang sudah ditutup tidak dapat diubah task-nya',
        );
      }
      return task;
    }

    if (user.role === Role.pengguna) {
      // Pengguna harus merupakan anggota proyek
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: user.id,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Task tidak ditemukan');
      }

      // Pengguna hanya boleh mengakses task yang ditugaskan kepadanya
      if (task.assigneeId !== user.id) {
        throw new NotFoundException('Task tidak ditemukan');
      }

      if (mode === 'delete') {
        throw new ForbiddenException(
          'Akses ditolak: Pengguna tidak memiliki izin menghapus task',
        );
      }

      if (mode === 'write') {
        throw new ForbiddenException(
          'Akses ditolak: Pengguna tidak memiliki izin mengubah isi task',
        );
      }

      if (mode === 'status_only') {
        if (task.project.status === ProjectStatus.ditutup) {
          throw new BadRequestException(
            'Proyek yang sudah ditutup tidak dapat diubah task-nya',
          );
        }
      }

      return task;
    }

    throw new ForbiddenException('Akses ditolak: peran tidak valid');
  }

  /**
   * Membuat task baru.
   * Hanya untuk Admin (di proyek departemennya) dan Super Admin.
   */
  async create(dto: CreateTaskDto, user: AuthenticatedUser, ip?: string) {
    if (user.role === Role.pengguna) {
      throw new ForbiddenException(
        'Akses ditolak: Pengguna tidak memiliki izin membuat task',
      );
    }
    if (user.role === Role.finance) {
      throw new ForbiddenException(
        'Akses ditolak: Finance tidak memiliki izin membuat task',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (
      user.role === Role.admin &&
      project.departmentId !== user.departmentId
    ) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (project.status === ProjectStatus.ditutup) {
      throw new BadRequestException(
        'Proyek yang sudah ditutup tidak dapat diubah task-nya',
      );
    }

    // Validasi fase jika diisi
    if (dto.phaseId) {
      const phase = await this.prisma.phase.findFirst({
        where: { id: dto.phaseId, projectId: dto.projectId },
      });
      if (!phase) {
        throw new BadRequestException(
          'Fase tidak ditemukan atau tidak berada dalam proyek yang sama',
        );
      }
    }

    // Validasi assignee jika diisi
    if (dto.assigneeId) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: dto.projectId,
            userId: dto.assigneeId,
          },
        },
        include: { user: true },
      });

      if (!member) {
        throw new BadRequestException(
          'Assignee harus merupakan anggota proyek',
        );
      }

      if (!member.user.isActive || member.user.deletedAt !== null) {
        throw new BadRequestException('Assignee tidak aktif');
      }
    }

    // Validasi tenggat terhadap rentang proyek
    if (dto.dueDate) {
      const taskDueDate = new Date(dto.dueDate);
      if (project.startDate && taskDueDate < project.startDate) {
        throw new BadRequestException(
          'Tenggat waktu task tidak boleh sebelum tanggal mulai proyek',
        );
      }
      if (project.endDate && taskDueDate > project.endDate) {
        throw new BadRequestException(
          'Tenggat waktu task tidak boleh setelah tanggal selesai proyek',
        );
      }
    }

    // Buat task dan hitung progres proyek dalam transaksi yang sama
    const task = await this.prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          projectId: dto.projectId,
          phaseId: dto.phaseId || null,
          title: dto.title,
          description: dto.description || null,
          assigneeId: dto.assigneeId || null,
          status: dto.status ?? TaskStatus.belum_mulai,
          priority: dto.priority ?? Priority.sedang,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          estimatedHours:
            dto.estimatedHours !== undefined && dto.estimatedHours !== null
              ? new Prisma.Decimal(dto.estimatedHours)
              : null,
        },
        select: DEFAULT_TASK_SELECT,
      });

      await this.recalculateProjectProgress(tx, dto.projectId);
      return createdTask;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_task',
      module: 'tasks',
      entityId: task.id,
      beforeData: null,
      afterData: task,
      ipAddress: ip,
    });

    return task;
  }

  /**
   * Mengambil daftar task sesuai cakupan peran dengan paginasi dan filter.
   */
  async findAll(query: TaskQueryDto, user: AuthenticatedUser) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    if (user.role === Role.pengguna) {
      // Pengguna hanya melihat task miliknya di proyek tempat ia terdaftar
      where.assigneeId = user.id;
      where.project = {
        deletedAt: null,
        members: {
          some: { userId: user.id },
        },
      };

      if (query.projectId) {
        const member = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: query.projectId,
              userId: user.id,
            },
          },
        });
        if (!member) {
          throw new NotFoundException('Proyek tidak ditemukan');
        }
        where.projectId = query.projectId;
      }
    } else if (user.role === Role.admin) {
      const adminDeptId = user.departmentId ?? undefined;
      if (query.projectId) {
        const project = await this.prisma.project.findFirst({
          where: {
            id: query.projectId,
            departmentId: adminDeptId,
            deletedAt: null,
          },
        });
        if (!project) {
          throw new NotFoundException('Proyek tidak ditemukan');
        }
        where.projectId = query.projectId;
      } else {
        where.project = {
          departmentId: adminDeptId,
          deletedAt: null,
        };
      }
    } else {
      // finance & super_admin
      if (query.projectId) {
        where.projectId = query.projectId;
      }
      where.project = { deletedAt: null };
    }

    if (query.phaseId) {
      where.phaseId = query.phaseId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.assigneeId && user.role !== Role.pengguna) {
      where.assigneeId = query.assigneeId;
    }

    if (query.search) {
      where.title = { contains: query.search };
    }

    const select =
      user.role === Role.pengguna ? PENGGUNA_TASK_SELECT : DEFAULT_TASK_SELECT;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
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
   * Endpoint khusus "Task Saya" untuk pengguna.
   */
  async findMyTasks(query: TaskQueryDto, user: AuthenticatedUser) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      assigneeId: user.id,
      deletedAt: null,
      project: {
        deletedAt: null,
        members: {
          some: { userId: user.id },
        },
      },
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.phaseId) {
      where.phaseId = query.phaseId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.search) {
      where.title = { contains: query.search };
    }

    const select =
      user.role === Role.pengguna ? PENGGUNA_TASK_SELECT : DEFAULT_TASK_SELECT;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
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
   * Mengambil detail satu task.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    await this.checkTaskAccess(id, user, 'read');

    const select =
      user.role === Role.pengguna ? PENGGUNA_TASK_SELECT : DEFAULT_TASK_SELECT;

    const task = await this.prisma.task.findUnique({
      where: { id },
      select,
    });

    return task;
  }

  /**
   * Memperbarui data task.
   * Admin dan Super Admin bebas mengubah field;
   * Pengguna hanya boleh mengubah status task miliknya sendiri.
   */
  async update(
    id: string,
    dto: UpdateTaskDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    if (user.role === Role.pengguna) {
      // Periksa apakah pengguna mencoba mengubah field selain status
      const hasContentChanges =
        dto.title !== undefined ||
        dto.description !== undefined ||
        dto.phaseId !== undefined ||
        dto.assigneeId !== undefined ||
        dto.priority !== undefined ||
        dto.dueDate !== undefined ||
        dto.estimatedHours !== undefined;

      if (hasContentChanges) {
        // Jika task bukan miliknya, checkTaskAccess akan melempar 404
        await this.checkTaskAccess(id, user, 'status_only');
        throw new ForbiddenException(
          'Pengguna hanya diizinkan mengubah status task miliknya',
        );
      }

      if (dto.status !== undefined) {
        return this.updateStatus(id, { status: dto.status }, user, ip);
      }

      // Tidak ada perubahan
      return this.findOne(id, user);
    }

    const existingTask = await this.checkTaskAccess(id, user, 'write');

    // Validasi fase jika diubah
    if (dto.phaseId !== undefined && dto.phaseId !== null) {
      const phase = await this.prisma.phase.findFirst({
        where: { id: dto.phaseId, projectId: existingTask.projectId },
      });
      if (!phase) {
        throw new BadRequestException(
          'Fase tidak ditemukan atau tidak berada dalam proyek yang sama',
        );
      }
    }

    // Validasi assignee jika diubah
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existingTask.projectId,
            userId: dto.assigneeId,
          },
        },
        include: { user: true },
      });
      if (!member) {
        throw new BadRequestException(
          'Assignee harus merupakan anggota proyek',
        );
      }
      if (!member.user.isActive || member.user.deletedAt !== null) {
        throw new BadRequestException('Assignee tidak aktif');
      }
    }

    // Validasi tenggat jika diubah
    if (dto.dueDate !== undefined && dto.dueDate !== null) {
      const taskDueDate = new Date(dto.dueDate);
      if (
        existingTask.project.startDate &&
        taskDueDate < existingTask.project.startDate
      ) {
        throw new BadRequestException(
          'Tenggat waktu task tidak boleh sebelum tanggal mulai proyek',
        );
      }
      if (
        existingTask.project.endDate &&
        taskDueDate > existingTask.project.endDate
      ) {
        throw new BadRequestException(
          'Tenggat waktu task tidak boleh setelah tanggal selesai proyek',
        );
      }
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.phaseId !== undefined ? { phaseId: dto.phaseId } : {}),
          ...(dto.assigneeId !== undefined
            ? { assigneeId: dto.assigneeId }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.dueDate !== undefined
            ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
            : {}),
          ...(dto.estimatedHours !== undefined
            ? {
                estimatedHours:
                  dto.estimatedHours !== null
                    ? new Prisma.Decimal(dto.estimatedHours)
                    : null,
              }
            : {}),
        },
        select: DEFAULT_TASK_SELECT,
      });

      if (dto.status !== undefined) {
        await this.recalculateProjectProgress(tx, existingTask.projectId);
      }

      return updated;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_task',
      module: 'tasks',
      entityId: id,
      beforeData: existingTask,
      afterData: updatedTask,
      ipAddress: ip,
    });

    return updatedTask;
  }

  /**
   * Mengubah status task.
   * Pengguna boleh mengubah status task miliknya; admin & super_admin bebas.
   */
  async updateStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const existingTask = await this.checkTaskAccess(id, user, 'status_only');

    const select =
      user.role === Role.pengguna ? PENGGUNA_TASK_SELECT : DEFAULT_TASK_SELECT;

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: { status: dto.status },
        select,
      });

      await this.recalculateProjectProgress(tx, existingTask.projectId);
      return updated;
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_task_status',
      module: 'tasks',
      entityId: id,
      beforeData: { status: existingTask.status },
      afterData: { status: dto.status },
      ipAddress: ip,
    });

    return updatedTask;
  }

  /**
   * Menghapus task secara soft-delete.
   * Ditolak jika sudah memiliki timesheet entry atau expense terkait.
   */
  async remove(id: string, user: AuthenticatedUser, ip?: string) {
    const existingTask = await this.checkTaskAccess(id, user, 'delete');

    const [entryCount, expenseCount] = await Promise.all([
      this.prisma.timesheetEntry.count({ where: { taskId: id } }),
      this.prisma.expense.count({ where: { taskId: id } }),
    ]);

    if (entryCount > 0 || expenseCount > 0) {
      throw new BadRequestException(
        'Task tidak dapat dihapus karena sudah memiliki timesheet entry atau pengeluaran terkait',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await this.recalculateProjectProgress(tx, existingTask.projectId);
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_task',
      module: 'tasks',
      entityId: id,
      beforeData: existingTask,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Task berhasil dihapus',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CHECKLIST
  // ─────────────────────────────────────────────────────────────

  async createChecklist(
    taskId: string,
    dto: CreateChecklistDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    // Pengguna hanya bisa pada task miliknya, admin pada proyek departemennya
    await this.checkTaskAccess(taskId, user, 'status_only');

    const checklist = await this.prisma.taskChecklist.create({
      data: {
        taskId,
        text: dto.text,
        isDone: false,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_task_checklist',
      module: 'tasks',
      entityId: checklist.id,
      beforeData: null,
      afterData: checklist,
      ipAddress: ip,
    });

    return checklist;
  }

  async updateChecklist(
    taskId: string,
    checklistId: string,
    dto: UpdateChecklistDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    await this.checkTaskAccess(taskId, user, 'status_only');

    const existing = await this.prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId },
    });

    if (!existing) {
      throw new NotFoundException('Item checklist tidak ditemukan');
    }

    const updated = await this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.isDone !== undefined ? { isDone: dto.isDone } : {}),
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_task_checklist',
      module: 'tasks',
      entityId: checklistId,
      beforeData: existing,
      afterData: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async removeChecklist(
    taskId: string,
    checklistId: string,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    await this.checkTaskAccess(taskId, user, 'status_only');

    const existing = await this.prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId },
    });

    if (!existing) {
      throw new NotFoundException('Item checklist tidak ditemukan');
    }

    await this.prisma.taskChecklist.delete({
      where: { id: checklistId },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_task_checklist',
      module: 'tasks',
      entityId: checklistId,
      beforeData: existing,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Item checklist berhasil dihapus',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // KOMENTAR
  // ─────────────────────────────────────────────────────────────

  async createComment(
    taskId: string,
    dto: CreateCommentDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    await this.checkTaskAccess(taskId, user, 'status_only');

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId: user.id,
        body: dto.body,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_task_comment',
      module: 'tasks',
      entityId: comment.id,
      beforeData: null,
      afterData: comment,
      ipAddress: ip,
    });

    return comment;
  }

  async removeComment(
    taskId: string,
    commentId: string,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const task = await this.checkTaskAccess(taskId, user, 'read');

    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }

    // Hanya pembuat komentar atau admin/super_admin yang berhak menghapus komentar
    const isAuthor = comment.userId === user.id;
    const isSuperAdmin = user.role === Role.super_admin;
    const isAdmin =
      user.role === Role.admin &&
      task.project.departmentId === user.departmentId;

    if (!isAuthor && !isSuperAdmin && !isAdmin) {
      throw new ForbiddenException(
        'Hanya pembuat komentar atau admin yang dapat menghapus komentar',
      );
    }

    await this.prisma.taskComment.delete({
      where: { id: commentId },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_task_comment',
      module: 'tasks',
      entityId: commentId,
      beforeData: comment,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Komentar berhasil dihapus',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // LAMPIRAN (ATTACHMENTS)
  // ─────────────────────────────────────────────────────────────

  async uploadAttachment(
    taskId: string,
    file: {
      buffer?: Buffer;
      size?: number;
      originalname?: string;
      mimetype?: string;
    },
    user: AuthenticatedUser,
    ip?: string,
  ) {
    await this.checkTaskAccess(taskId, user, 'status_only');

    // Validasi magic bytes dan ukuran (maks 10 MB)
    const { detectedMimeType } = validateFileSignatureAndSize(file);

    // Simpan file ke disk lewat abstraksi storage
    const storedFileName = await this.storageService.saveFile(
      file.buffer!,
      file.originalname!,
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerType: AttachmentOwner.task,
        ownerId: taskId,
        fileUrl: storedFileName,
        fileName: file.originalname!,
        mimeType: detectedMimeType,
        size: file.size ?? file.buffer!.length,
        uploadedBy: user.id,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'upload_task_attachment',
      module: 'tasks',
      entityId: attachment.id,
      beforeData: null,
      afterData: {
        id: attachment.id,
        fileName: attachment.fileName,
        size: attachment.size,
        mimeType: attachment.mimeType,
      },
      ipAddress: ip,
    });

    return attachment;
  }

  async getAttachments(taskId: string, user: AuthenticatedUser) {
    await this.checkTaskAccess(taskId, user, 'read');

    const attachments = await this.prisma.attachment.findMany({
      where: {
        ownerType: AttachmentOwner.task,
        ownerId: taskId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments;
  }

  async getAttachmentForDownload(
    taskId: string,
    attachmentId: string,
    user: AuthenticatedUser,
  ) {
    await this.checkTaskAccess(taskId, user, 'read');

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: AttachmentOwner.task,
        ownerId: taskId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }

    const exists = await this.storageService.fileExists(attachment.fileUrl);
    if (!exists) {
      throw new NotFoundException(
        'File fisik lampiran tidak ditemukan di server',
      );
    }

    const filePath = this.storageService.getFilePath(attachment.fileUrl);
    return {
      filePath,
      attachment,
    };
  }

  async removeAttachment(
    taskId: string,
    attachmentId: string,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const task = await this.checkTaskAccess(taskId, user, 'status_only');

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: AttachmentOwner.task,
        ownerId: taskId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Lampiran tidak ditemukan');
    }

    const isUploader = attachment.uploadedBy === user.id;
    const isSuperAdmin = user.role === Role.super_admin;
    const isAdmin =
      user.role === Role.admin &&
      task.project.departmentId === user.departmentId;

    if (!isUploader && !isSuperAdmin && !isAdmin) {
      throw new ForbiddenException(
        'Hanya pengunggah atau admin yang dapat menghapus lampiran',
      );
    }

    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    // Hapus juga file fisik di disk
    await this.storageService.deleteFile(attachment.fileUrl);

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_task_attachment',
      module: 'tasks',
      entityId: attachmentId,
      beforeData: attachment,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Lampiran berhasil dihapus',
    };
  }
}
