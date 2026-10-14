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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateProjectTypeDto } from '../dto/create-project-type.dto';
import { UpdateProjectTypeDto } from '../dto/update-project-type.dto';
import { SuperAdminMasterDataService } from '../services/super-admin-master-data.service';

@ApiTags('Super Admin - Project Types')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['project-types', 'admin/project-types'])
export class ProjectTypesController {
  constructor(
    private readonly masterDataService: SuperAdminMasterDataService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat jenis proyek baru' })
  @ApiResponse({ status: 201, description: 'Jenis proyek berhasil dibuat.' })
  @ApiResponse({ status: 409, description: 'Nama jenis proyek sudah digunakan.' })
  async create(
    @Body() dto: CreateProjectTypeDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.createProjectType(dto, currentUserId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat seluruh jenis proyek' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Daftar jenis proyek berhasil dimuat.' })
  async findAll(@Query('isActive') isActive?: string) {
    const activeFilter =
      isActive === undefined ? undefined : isActive === 'true';
    return this.masterDataService.findAllProjectTypes(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail jenis proyek' })
  @ApiResponse({ status: 200, description: 'Detail jenis proyek ditemukan.' })
  @ApiResponse({ status: 404, description: 'Jenis proyek tidak ditemukan.' })
  async findOne(@Param('id') id: string) {
    return this.masterDataService.findOneProjectType(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data jenis proyek' })
  @ApiResponse({ status: 200, description: 'Jenis proyek berhasil diperbarui.' })
  @ApiResponse({ status: 404, description: 'Jenis proyek tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTypeDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.updateProjectType(id, dto, currentUserId, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menonaktifkan jenis proyek (bukan hapus permanen)' })
  @ApiResponse({ status: 200, description: 'Jenis proyek berhasil dinonaktifkan.' })
  @ApiResponse({ status: 404, description: 'Jenis proyek tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.removeProjectType(id, currentUserId, ip);
  }
}
