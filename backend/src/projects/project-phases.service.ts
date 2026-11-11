import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../super-admin/services/audit-logger.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectPhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Memvalidasi rentang tanggal fase terhadap tanggal mulai dan selesai proyek.
   */
  private validatePhaseDates(
    project: { startDate: Date | null; endDate: Date | null },
    phaseStart: Date | null,
    phaseEnd: Date | null,
  ) {
    if (phaseStart && phaseEnd && phaseEnd < phaseStart) {
      throw new BadRequestException(
        'Tanggal selesai fase tidak boleh sebelum tanggal mulai fase',
      );
    }

    if (project.startDate) {
      if (phaseStart && phaseStart < project.startDate) {
        throw new BadRequestException(
          'Tanggal mulai fase tidak boleh sebelum tanggal mulai proyek',
        );
      }
      if (phaseEnd && phaseEnd < project.startDate) {
        throw new BadRequestException(
          'Tanggal selesai fase tidak boleh sebelum tanggal mulai proyek',
        );
      }
    }

    if (project.endDate) {
      if (phaseEnd && phaseEnd > project.endDate) {
        throw new BadRequestException(
          'Tanggal selesai fase tidak boleh setelah tanggal selesai proyek',
        );
      }
      if (phaseStart && phaseStart > project.endDate) {
        throw new BadRequestException(
          'Tanggal mulai fase tidak boleh setelah tanggal selesai proyek',
        );
      }
    }
  }

  /**
   * Membuat fase baru dalam proyek.
   */
  async create(
    projectId: string,
    dto: CreatePhaseDto,
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
        'Proyek yang sudah ditutup tidak dapat diubah fasenya',
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    this.validatePhaseDates(project, startDate, endDate);

    const phase = await this.prisma.phase.create({
      data: {
        projectId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        startDate,
        endDate,
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'create_phase',
      module: 'projects',
      entityId: phase.id,
      beforeData: null,
      afterData: phase,
      ipAddress: ip,
    });

    return phase;
  }

  /**
   * Memperbarui fase dalam proyek.
   */
  async update(
    projectId: string,
    phaseId: string,
    dto: UpdatePhaseDto,
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
        'Proyek yang sudah ditutup tidak dapat diubah fasenya',
      );
    }

    const existingPhase = await this.prisma.phase.findFirst({
      where: { id: phaseId, projectId },
    });

    if (!existingPhase) {
      throw new NotFoundException('Fase tidak ditemukan');
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : existingPhase.startDate;
    const endDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existingPhase.endDate;

    this.validatePhaseDates(project, startDate, endDate);

    const updatedPhase = await this.prisma.phase.update({
      where: { id: phaseId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.startDate !== undefined ? { startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate } : {}),
      },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'update_phase',
      module: 'projects',
      entityId: phaseId,
      beforeData: existingPhase,
      afterData: updatedPhase,
      ipAddress: ip,
    });

    return updatedPhase;
  }

  /**
   * Menghapus fase dalam proyek.
   * Ditolak jika fase masih memiliki task atau item anggaran terkait.
   */
  async remove(
    projectId: string,
    phaseId: string,
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
        'Proyek yang sudah ditutup tidak dapat diubah fasenya',
      );
    }

    const existingPhase = await this.prisma.phase.findFirst({
      where: { id: phaseId, projectId },
    });

    if (!existingPhase) {
      throw new NotFoundException('Fase tidak ditemukan');
    }

    // Periksa apakah masih memiliki task atau item anggaran terkait
    const [taskCount, budgetItemCount, budgetRequestItemCount] =
      await Promise.all([
        this.prisma.task.count({ where: { phaseId } }),
        this.prisma.budgetItem.count({ where: { phaseId } }),
        this.prisma.budgetRequestItem.count({ where: { phaseId } }),
      ]);

    if (taskCount > 0 || budgetItemCount > 0 || budgetRequestItemCount > 0) {
      throw new BadRequestException(
        'Fase tidak dapat dihapus karena masih memiliki tugas atau item anggaran terkait',
      );
    }

    await this.prisma.phase.delete({
      where: { id: phaseId },
    });

    await this.auditLogger.log({
      userId: user.id,
      action: 'delete_phase',
      module: 'projects',
      entityId: phaseId,
      beforeData: existingPhase,
      afterData: null,
      ipAddress: ip,
    });

    return {
      statusCode: 200,
      message: 'Fase berhasil dihapus',
    };
  }
}
