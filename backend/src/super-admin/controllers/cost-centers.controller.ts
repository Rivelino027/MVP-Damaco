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
import { CostCenterQueryDto } from '../dto/cost-center-query.dto';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';
import { SuperAdminCostCentersService } from '../services/super-admin-cost-centers.service';

@ApiTags('Super Admin - Cost Centers')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['cost-centers', 'admin/cost-centers'])
export class CostCentersController {
  constructor(
    private readonly costCentersService: SuperAdminCostCentersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat cost center baru' })
  @ApiResponse({ status: 201, description: 'Cost center berhasil dibuat.' })
  @ApiResponse({
    status: 409,
    description: 'Kode cost center sudah digunakan.',
  })
  async create(
    @Body() dto: CreateCostCenterDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.costCentersService.create(dto, currentUserId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat daftar cost center' })
  @ApiResponse({
    status: 200,
    description: 'Daftar cost center berhasil dimuat.',
  })
  async findAll(@Query() query: CostCenterQueryDto) {
    return this.costCentersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail cost center' })
  @ApiResponse({ status: 200, description: 'Detail cost center ditemukan.' })
  @ApiResponse({ status: 404, description: 'Cost center tidak ditemukan.' })
  async findOne(@Param('id') id: string) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data cost center' })
  @ApiResponse({ status: 200, description: 'Cost center berhasil diperbarui.' })
  @ApiResponse({ status: 404, description: 'Cost center tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.costCentersService.update(id, dto, currentUserId, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus cost center (hanya jika belum dipakai)' })
  @ApiResponse({ status: 200, description: 'Cost center berhasil dihapus.' })
  @ApiResponse({
    status: 400,
    description: 'Cost center sedang digunakan oleh proyek atau pengeluaran.',
  })
  @ApiResponse({ status: 404, description: 'Cost center tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.costCentersService.remove(id, currentUserId, ip);
  }
}
