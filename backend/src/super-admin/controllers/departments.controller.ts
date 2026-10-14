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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { DepartmentQueryDto } from '../dto/department-query.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { SuperAdminDepartmentsService } from '../services/super-admin-departments.service';

@ApiTags('Super Admin - Departments')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['departments', 'admin/departments'])
export class DepartmentsController {
  constructor(
    private readonly departmentsService: SuperAdminDepartmentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat departemen baru' })
  @ApiResponse({ status: 201, description: 'Departemen berhasil dibuat.' })
  @ApiResponse({ status: 409, description: 'Nama departemen sudah digunakan.' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.departmentsService.create(dto, currentUserId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat daftar departemen' })
  @ApiResponse({ status: 200, description: 'Daftar departemen berhasil dimuat.' })
  async findAll(@Query() query: DepartmentQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail departemen' })
  @ApiResponse({ status: 200, description: 'Detail departemen ditemukan.' })
  @ApiResponse({ status: 404, description: 'Departemen tidak ditemukan.' })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data departemen' })
  @ApiResponse({ status: 200, description: 'Departemen berhasil diperbarui.' })
  @ApiResponse({ status: 404, description: 'Departemen tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.departmentsService.update(id, dto, currentUserId, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus departemen (hanya jika belum dipakai proyek/user)' })
  @ApiResponse({ status: 200, description: 'Departemen berhasil di-soft-delete.' })
  @ApiResponse({
    status: 400,
    description: 'Departemen sedang digunakan oleh pengguna atau proyek.',
  })
  @ApiResponse({ status: 404, description: 'Departemen tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.departmentsService.remove(id, currentUserId, ip);
  }
}
