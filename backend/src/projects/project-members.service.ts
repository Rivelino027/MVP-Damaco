import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Mengambil daftar anggota dalam proyek.
   */
  async findAll(projectId: string, user: AuthenticatedUser) {
    await this.projectsService.checkProjectAccess(projectId, user, 'read');

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
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
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }

  /**
   * Menambahkan anggota ke proyek.
   * - Proyek ditutup menolak penambahan anggota.
   * - Pengguna harus aktif dan berperan pengguna atau admin.
   * - Admin hanya boleh menambahkan anggota yang satu departemen dengan proyek.
   * - Super Admin boleh lintas departemen.
   * - Pengguna hanya boleh satu kali terdaftar per proyek.
   */
  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const project = await this.projectsService.checkProjectAccess(
      projectId,
      user,
      'write',
    );

    if (project.status === ProjectStatus.ditutup) {
      throw new BadRequestException(
        'Proyek yang sudah ditutup tidak dapat diubah anggotanya',
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException(
        'Pengguna tidak aktif atau tidak ditemukan',
      );
    }

    if (targetUser.role !== Role.pengguna && targetUser.role !== Role.admin) {
      throw new BadRequestException(
        'Hanya pengguna dengan peran pengguna atau admin yang dapat ditambahkan sebagai anggota proyek',
      );
    }

    // Admin dibatasi hanya departemen yang sama dengan proyek
    if (user.role === Role.admin) {
      if (targetUser.departmentId !== project.departmentId) {
        throw new BadRequestException(
          'Admin hanya dapat menambahkan anggota dari departemen yang sama dengan proyek',
        );
      }
    }

    // Periksa apakah pengguna sudah menjadi anggota
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        'Pengguna sudah terdaftar sebagai anggota proyek ini',
      );
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        addedById: user.id,
      },
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
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'add_project_member',
      module: 'projects',
      entityId: member.id,
      beforeData: null,
      afterData: member,
      ipAddress: ip,
    });

    return member;
  }

  /**
   * Mengeluarkan anggota dari proyek.
   * Ditolak jika anggota masih memiliki tugas (task) di proyek tersebut.
   */
  async removeMember(
    projectId: string,
    memberUserId: string,
    user: AuthenticatedUser,
    ip?: string,
  ) {
    const project = await this.projectsService.checkProjectAccess(
      projectId,
      user,
      'write',
    );

    if (project.status === ProjectStatus.ditutup) {
      throw new BadRequestException(
        'Proyek yang sudah ditutup tidak dapat diubah anggotanya',
      );
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Anggota proyek tidak ditemukan');
    }

    // Periksa apakah anggota masih memiliki task yang ditugaskan di proyek
    const assignedTaskCount = await this.prisma.task.count({
      where: {
        projectId,
        assigneeId: memberUserId,
        deletedAt: null,
      },
    });

    if (assignedTaskCount > 0) {
      throw new BadRequestException(
        'Anggota tidak dapat dikeluarkan karena masih memiliki tugas (task) yang ditugaskan dalam proyek ini. Alihkan tugas terlebih dahulu.',
      );
    }

    await this.prisma.projectMember.delete({
      where: { id: member.id },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'remove_project_member',
      module: 'projects',
      entityId: member.id,
      beforeData: member,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Anggota berhasil dikeluarkan dari proyek',
    };
  }
}
