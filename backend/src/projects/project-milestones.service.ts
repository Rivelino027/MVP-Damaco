import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectMilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Memvalidasi tanggal tenggat milestone dalam rentang proyek.
   */
  private validateMilestoneDueDate(
    project: { startDate: Date | null; endDate: Date | null },
    dueDate: Date,
  ) {
    if (project.startDate && dueDate < project.startDate) {
      throw new BadRequestException(
        'Tenggat milestone tidak boleh sebelum tanggal mulai proyek',
      );
    }
    if (project.endDate && dueDate > project.endDate) {
      throw new BadRequestException(
        'Tenggat milestone tidak boleh setelah tanggal selesai proyek',
      );
    }
  }

  /**
   * Membuat milestone baru dalam proyek.
   */
  async create(
    projectId: string,
    dto: CreateMilestoneDto,
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
        'Proyek yang sudah ditutup tidak dapat diubah milestonenya',
      );
    }

    if (dto.phaseId) {
      const phase = await this.prisma.phase.findFirst({
        where: { id: dto.phaseId, projectId },
      });
      if (!phase) {
        throw new BadRequestException(
          'Fase tidak ditemukan dalam proyek ini',
        );
      }
    }

    const dueDate = new Date(dto.dueDate);
    this.validateMilestoneDueDate(project, dueDate);

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        phaseId: dto.phaseId ?? null,
        name: dto.name,
        dueDate,
        isDone: dto.isDone ?? false,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_milestone',
      module: 'projects',
      entityId: milestone.id,
      beforeData: null,
      afterData: milestone,
      ipAddress: ip,
    });

    return milestone;
  }

  /**
   * Memperbarui milestone dalam proyek.
   */
  async update(
    projectId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
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
        'Proyek yang sudah ditutup tidak dapat diubah milestonenya',
      );
    }

    const existingMilestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!existingMilestone) {
      throw new NotFoundException('Milestone tidak ditemukan');
    }

    if (dto.phaseId !== undefined && dto.phaseId !== null) {
      const phase = await this.prisma.phase.findFirst({
        where: { id: dto.phaseId, projectId },
      });
      if (!phase) {
        throw new BadRequestException(
          'Fase tidak ditemukan dalam proyek ini',
        );
      }
    }

    const dueDate =
      dto.dueDate !== undefined
        ? new Date(dto.dueDate)
        : existingMilestone.dueDate;

    if (dto.dueDate !== undefined) {
      this.validateMilestoneDueDate(project, dueDate);
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.dueDate !== undefined ? { dueDate } : {}),
        ...(dto.isDone !== undefined ? { isDone: dto.isDone } : {}),
        ...(dto.phaseId !== undefined ? { phaseId: dto.phaseId } : {}),
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_milestone',
      module: 'projects',
      entityId: milestoneId,
      beforeData: existingMilestone,
      afterData: updatedMilestone,
      ipAddress: ip,
    });

    return updatedMilestone;
  }

  /**
   * Menghapus milestone dalam proyek.
   */
  async remove(
    projectId: string,
    milestoneId: string,
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
        'Proyek yang sudah ditutup tidak dapat diubah milestonenya',
      );
    }

    const existingMilestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!existingMilestone) {
      throw new NotFoundException('Milestone tidak ditemukan');
    }

    await this.prisma.milestone.delete({
      where: { id: milestoneId },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_milestone',
      module: 'projects',
      entityId: milestoneId,
      beforeData: existingMilestone,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Milestone berhasil dihapus',
    };
  }
}
