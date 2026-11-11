import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { ProjectPhasesService } from './project-phases.service';

@ApiTags('Projects - Phases')
@ApiBearerAuth()
@Controller('projects/:id/phases')
export class ProjectPhasesController {
  constructor(private readonly phasesService: ProjectPhasesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Membuat fase baru dalam proyek' })
  @ApiResponse({ status: 201, description: 'Fase berhasil dibuat.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan rentang proyek.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async create(
    @Param('id') projectId: string,
    @Body() dto: CreatePhaseDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.phasesService.create(projectId, dto, user, ip);
  }

  @Patch(':phaseId')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui data fase dalam proyek' })
  @ApiResponse({ status: 200, description: 'Fase berhasil diperbarui.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan rentang proyek.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proyek atau fase tidak ditemukan.',
  })
  async update(
    @Param('id') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.phasesService.update(projectId, phaseId, dto, user, ip);
  }

  @Delete(':phaseId')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({
    summary:
      'Menghapus fase dalam proyek (hanya jika belum memiliki task atau item anggaran)',
  })
  @ApiResponse({ status: 200, description: 'Fase berhasil dihapus.' })
  @ApiResponse({
    status: 400,
    description: 'Fase memiliki task atau item anggaran terkait.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proyek atau fase tidak ditemukan.',
  })
  async remove(
    @Param('id') projectId: string,
    @Param('phaseId') phaseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.phasesService.remove(projectId, phaseId, user, ip);
  }
}
