import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Membuat proyek baru' })
  @ApiResponse({ status: 201, description: 'Proyek berhasil dibuat.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau aturan bisnis dilanggar.',
  })
  @ApiResponse({ status: 403, description: 'Peran tidak memiliki izin.' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.projectsService.create(dto, user, ip);
  }

  @Get()
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat daftar proyek sesuai cakupan peran' })
  @ApiResponse({ status: 200, description: 'Daftar proyek berhasil dimuat.' })
  async findAll(
    @Query() query: ProjectQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat detail proyek' })
  @ApiResponse({ status: 200, description: 'Detail proyek ditemukan.' })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui data proyek' })
  @ApiResponse({ status: 200, description: 'Proyek berhasil diperbarui.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan bisnis.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Body() rawBody: any,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.projectsService.update(id, dto, user, ip, rawBody);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menutup proyek (berjalan -> ditutup)' })
  @ApiResponse({ status: 200, description: 'Proyek berhasil ditutup.' })
  @ApiResponse({
    status: 400,
    description: 'Hanya proyek berstatus berjalan yang dapat ditutup.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async closeProject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.projectsService.closeProject(id, user, ip);
  }

  @Delete(':id')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({
    summary:
      'Menghapus proyek secara soft-delete (hanya jika belum memiliki data transaksi)',
  })
  @ApiResponse({ status: 200, description: 'Proyek berhasil dihapus.' })
  @ApiResponse({
    status: 400,
    description:
      'Proyek sudah memiliki anggaran/pengeluaran/timesheet, tolak penghapusan.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.projectsService.remove(id, user, ip);
  }
}
