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
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ProjectMilestonesService } from './project-milestones.service';

@ApiTags('Projects - Milestones')
@ApiBearerAuth()
@Controller('projects/:id/milestones')
export class ProjectMilestonesController {
  constructor(private readonly milestonesService: ProjectMilestonesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Membuat milestone baru dalam proyek' })
  @ApiResponse({ status: 201, description: 'Milestone berhasil dibuat.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan rentang proyek.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async create(
    @Param('id') projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.milestonesService.create(projectId, dto, user, ip);
  }

  @Patch(':milestoneId')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui data milestone dalam proyek' })
  @ApiResponse({ status: 200, description: 'Milestone berhasil diperbarui.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan rentang proyek.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proyek atau milestone tidak ditemukan.',
  })
  async update(
    @Param('id') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.milestonesService.update(projectId, milestoneId, dto, user, ip);
  }

  @Delete(':milestoneId')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menghapus milestone dalam proyek' })
  @ApiResponse({ status: 200, description: 'Milestone berhasil dihapus.' })
  @ApiResponse({
    status: 404,
    description: 'Proyek atau milestone tidak ditemukan.',
  })
  async remove(
    @Param('id') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.milestonesService.remove(projectId, milestoneId, user, ip);
  }
}
