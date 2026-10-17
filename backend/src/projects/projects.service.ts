import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Project, ProjectStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ScopeService } from '../auth/services/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * Memeriksa hak akses pengguna terhadap sebuah proyek.
   * Mengembalikan objek proyek jika diizinkan, atau melempar 404 (bukan 403)
   * agar keberadaan data tidak bocor antar scope.
   */
  async checkProjectAccess(
    id: string,
    user: AuthenticatedUser,
    mode: 'read' | 'write' = 'read',
  ): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (user.role === Role.pengguna) {
      if (mode === 'write') {
        throw new ForbiddenException('Akses ditolak: peran tidak memadai');
      }
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: id,
            userId: user.id,
          },
        },
      });
      if (!member) {
        throw new NotFoundException('Proyek tidak ditemukan');
      }
    } else if (user.role === Role.admin) {
      if (project.departmentId !== user.departmentId) {
        throw new NotFoundException('Proyek tidak ditemukan');
      }
    } else if (user.role === Role.finance) {
      if (mode === 'write') {
        throw new ForbiddenException('Akses ditolak: peran tidak memadai');
      }
    }
    // super_admin memiliki akses penuh

    return project;
  }

  /**
   * Menghapus field keuangan (seperti annualBudget departemen, dsb)
   * untuk pengguna dengan peran 'pengguna'.
   */
  private sanitizeProjectForUser(project: any, userRole: Role): any {
    if (!project) return project;
    if (userRole === Role.pengguna) {
      const clone = { ...project };
      if (clone.department && typeof clone.department === 'object') {
        const { annualBudget, ...cleanDept } = clone.department;
        clone.department = cleanDept;
      }
      delete clone.budgets;
      delete clone.budgetRequests;
      delete clone.expenses;
      delete clone.hourlyCosts;
      return clone;
    }
    return project;
  }

  /**
   * Membuat proyek baru.
   * Status awal selalu 'diajukan'.
   * Admin dipaksa ke departemennya sendiri.
   */
  async create(
    dto: CreateProjectDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    let targetDepartmentId: string;

    if (user.role === Role.admin) {
      if (!user.departmentId) {
        throw new BadRequestException('Admin tidak terdaftar pada departemen');
      }
      if (dto.departmentId && dto.departmentId !== user.departmentId) {
        throw new BadRequestException(
          'Admin hanya dapat membuat proyek di departemennya sendiri',
        );
      }
      targetDepartmentId = user.departmentId;
    } else if (user.role === Role.super_admin) {
      if (!dto.departmentId) {
        throw new BadRequestException('Departemen wajib dipilih untuk Super Admin');
      }
      targetDepartmentId = dto.departmentId;
    } else {
      throw new ForbiddenException('Akses ditolak: peran tidak memadai');
    }

    // Validasi departemen
    const department = await this.prisma.department.findFirst({
      where: { id: targetDepartmentId, deletedAt: null, isActive: true },
    });
    if (!department) {
      throw new BadRequestException('Departemen tidak ditemukan atau tidak aktif');
    }

    // Validasi cost center
    const costCenter = await this.prisma.costCenter.findUnique({
      where: { id: dto.costCenterId },
    });
    if (
      !costCenter ||
      costCenter.departmentId !== targetDepartmentId ||
      !costCenter.isActive
    ) {
      throw new BadRequestException(
        'Cost center tidak aktif atau tidak sesuai dengan departemen proyek',
      );
    }

    // Validasi jenis proyek jika ada
    if (dto.projectTypeId) {
      const projectType = await this.prisma.projectType.findUnique({
        where: { id: dto.projectTypeId },
      });
      if (!projectType || !projectType.isActive) {
        throw new BadRequestException(
          'Jenis proyek tidak ditemukan atau tidak aktif',
        );
      }
    }

    // Validasi tanggal
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        departmentId: targetDepartmentId,
        costCenterId: dto.costCenterId,
        projectTypeId: dto.projectTypeId ?? null,
        status: ProjectStatus.diajukan,
        startDate,
        endDate,
        createdById: user.id,
      },
      include: {
        department: true,
        costCenter: true,
        projectType: true,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_project',
      module: 'projects',
      entityId: project.id,
      beforeData: null,
      afterData: project,
      ipAddress: ip,
    });

    return project;
  }

  /**
   * Mengambil daftar proyek dengan filter dan paginasi sesuai hak akses/scope.
   */
  async findAll(query: ProjectQueryDto, user: AuthenticatedUser) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      departmentId,
      costCenterId,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (user.role === Role.pengguna) {
      // Pengguna hanya membaca proyek tempat ia menjadi anggota
      where.members = {
        some: {
          userId: user.id,
        },
      };
    } else if (user.role === Role.admin) {
      // Admin hanya membaca proyek di departemennya sendiri
      where.departmentId = user.departmentId ?? '__NONE__';
    } else {
      // finance & super_admin: filter departmentId dari query jika disediakan
      if (departmentId) {
        where.departmentId = departmentId;
      }
    }

    if (search) {
      where.name = { contains: search };
    }

    if (status) {
      where.status = status;
    }

    if (costCenterId) {
      where.costCenterId = costCenterId;
    }

    const [total, rawProjects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              annualBudget: user.role !== Role.pengguna,
            },
          },
          costCenter: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          projectType: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              members: true,
              phases: true,
              milestones: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    const projects = rawProjects.map((p) =>
      this.sanitizeProjectForUser(p, user.role),
    );

    return {
      data: projects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mengambil detail proyek beserta anggota, fase, dan milestone.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    await this.checkProjectAccess(id, user, 'read');

    const rawProject = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            annualBudget: user.role !== Role.pengguna,
          },
        },
        costCenter: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        projectType: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                jobTitle: true,
                avatarUrl: true,
                departmentId: true,
              },
            },
          },
        },
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: {
            milestones: {
              orderBy: { dueDate: 'asc' },
            },
          },
        },
        milestones: {
          where: { phaseId: null },
          orderBy: { dueDate: 'asc' },
        },
        _count: {
          select: {
            members: true,
            phases: true,
            milestones: true,
            tasks: true,
          },
        },
      },
    });

    if (!rawProject) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    return this.sanitizeProjectForUser(rawProject, user.role);
  }

  /**
   * Memperbarui data proyek.
   * Tidak boleh mengubah status atau departemen setelah dibuat.
   */
  async update(
    id: string,
    dto: UpdateProjectDto,
    user: AuthenticatedUser,
    ip?: string,
    rawBody?: any,
  ) {
    const existingProject = await this.checkProjectAccess(id, user, 'write');

    // Tolak perubahan status jika ada di request body
    if (rawBody && rawBody.status !== undefined) {
      throw new BadRequestException(
        'Status proyek tidak dapat diubah melalui endpoint ini',
      );
    }

    // Tolak perubahan departemen jika ada di request body
    if (
      rawBody &&
      rawBody.departmentId !== undefined &&
      rawBody.departmentId !== existingProject.departmentId
    ) {
      throw new BadRequestException(
        'Departemen proyek tidak dapat diubah setelah dibuat',
      );
    }

    const dataToUpdate: Prisma.ProjectUpdateInput = {};

    if (dto.name !== undefined) {
      dataToUpdate.name = dto.name;
    }
    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description;
    }

    // Validasi dan set tanggal
    const finalStartDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : existingProject.startDate;
    const finalEndDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existingProject.endDate;

    if (finalStartDate && finalEndDate && finalEndDate < finalStartDate) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }

    if (dto.startDate !== undefined) {
      dataToUpdate.startDate = finalStartDate;
    }
    if (dto.endDate !== undefined) {
      dataToUpdate.endDate = finalEndDate;
    }

    // Validasi cost center jika diubah
    if (dto.costCenterId !== undefined) {
      const costCenter = await this.prisma.costCenter.findUnique({
        where: { id: dto.costCenterId },
      });
      if (
        !costCenter ||
        costCenter.departmentId !== existingProject.departmentId ||
        !costCenter.isActive
      ) {
        throw new BadRequestException(
          'Cost center tidak aktif atau tidak sesuai dengan departemen proyek',
        );
      }
      dataToUpdate.costCenter = { connect: { id: dto.costCenterId } };
    }

    // Validasi project type jika diubah
    if (dto.projectTypeId !== undefined) {
      if (dto.projectTypeId === null) {
        dataToUpdate.projectType = { disconnect: true };
      } else {
        const projectType = await this.prisma.projectType.findUnique({
          where: { id: dto.projectTypeId },
        });
        if (!projectType || !projectType.isActive) {
          throw new BadRequestException(
            'Jenis proyek tidak ditemukan atau tidak aktif',
          );
        }
        dataToUpdate.projectType = { connect: { id: dto.projectTypeId } };
      }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: dataToUpdate,
      include: {
        department: true,
        costCenter: true,
        projectType: true,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_project',
      module: 'projects',
      entityId: id,
      beforeData: existingProject,
      afterData: updatedProject,
      ipAddress: ip,
    });

    return updatedProject;
  }

  /**
   * Menutup proyek (berjalan -> ditutup).
   * Hanya untuk proyek dengan status 'berjalan'.
   */
  async closeProject(id: string, user: AuthenticatedUser, ip?: string) {
    const existingProject = await this.checkProjectAccess(id, user, 'write');

    if (existingProject.status !== ProjectStatus.berjalan) {
      throw new BadRequestException(
        'Hanya proyek dengan status berjalan yang dapat ditutup',
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ditutup },
      include: {
        department: true,
        costCenter: true,
        projectType: true,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'close_project',
      module: 'projects',
      entityId: id,
      beforeData: existingProject,
      afterData: updatedProject,
      ipAddress: ip,
    });

    return updatedProject;
  }

  /**
   * Mengubah status proyek dari 'diajukan' ke 'berjalan'.
   * HANYA dipanggil secara internal oleh modul anggaran setelah persetujuan.
   * Metode ini TIDAK diekspos sebagai endpoint publik/API.
   */
  async transitionToRunning(
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const prismaClient = tx || this.prisma;
    const project = await prismaClient.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    if (project.status !== ProjectStatus.diajukan) {
      throw new BadRequestException(
        `Transisi ke 'berjalan' hanya diperbolehkan untuk proyek dengan status 'diajukan' (status saat ini: ${project.status})`,
      );
    }

    return prismaClient.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.berjalan },
    });
  }

  /**
   * Menghapus proyek secara soft delete (deletedAt).
   * Ditolak jika sudah memiliki budget, budgetRequest, expense, atau timesheetEntry terkait.
   */
  async remove(id: string, user: AuthenticatedUser, ip?: string) {
    const existingProject = await this.checkProjectAccess(id, user, 'write');

    const [budgetCount, budgetRequestCount, expenseCount, timesheetCount] =
      await Promise.all([
        this.prisma.budget.count({ where: { projectId: id } }),
        this.prisma.budgetRequest.count({ where: { projectId: id } }),
        this.prisma.expense.count({ where: { projectId: id } }),
        this.prisma.timesheetEntry.count({
          where: { task: { projectId: id } },
        }),
      ]);

    if (
      budgetCount > 0 ||
      budgetRequestCount > 0 ||
      expenseCount > 0 ||
      timesheetCount > 0
    ) {
      throw new BadRequestException(
        'Proyek tidak dapat dihapus karena sudah memiliki data anggaran, pengeluaran, atau timesheet terkait. Silakan tutup proyek sebagai gantinya.',
      );
    }

    const deletedProject = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_project',
      module: 'projects',
      entityId: id,
      beforeData: existingProject,
      afterData: { deletedAt: deletedProject.deletedAt },
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Proyek berhasil dihapus (soft-delete)',
    };
  }
}
