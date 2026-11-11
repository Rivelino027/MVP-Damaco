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
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';
import { SuperAdminMasterDataService } from '../services/super-admin-master-data.service';

@ApiTags('Super Admin - Expense Categories')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['expense-categories', 'admin/expense-categories'])
export class ExpenseCategoriesController {
  constructor(
    private readonly masterDataService: SuperAdminMasterDataService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat kategori pengeluaran baru' })
  @ApiResponse({
    status: 201,
    description: 'Kategori pengeluaran berhasil dibuat.',
  })
  @ApiResponse({
    status: 409,
    description: 'Nama atau kode kategori sudah digunakan.',
  })
  async create(
    @Body() dto: CreateExpenseCategoryDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.createExpenseCategory(dto, currentUserId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat seluruh kategori pengeluaran' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Daftar kategori berhasil dimuat.' })
  async findAll(@Query('isActive') isActive?: string) {
    const activeFilter =
      isActive === undefined ? undefined : isActive === 'true';
    return this.masterDataService.findAllExpenseCategories(activeFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail kategori pengeluaran' })
  @ApiResponse({ status: 200, description: 'Detail kategori ditemukan.' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
  async findOne(@Param('id') id: string) {
    return this.masterDataService.findOneExpenseCategory(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data kategori pengeluaran' })
  @ApiResponse({ status: 200, description: 'Kategori berhasil diperbarui.' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.updateExpenseCategory(
      id,
      dto,
      currentUserId,
      ip,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Menonaktifkan kategori pengeluaran (bukan hapus permanen)',
  })
  @ApiResponse({ status: 200, description: 'Kategori berhasil dinonaktifkan.' })
  @ApiResponse({ status: 404, description: 'Kategori tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.masterDataService.removeExpenseCategory(id, currentUserId, ip);
  }
}
