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
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { SuperAdminUsersService } from '../services/super-admin-users.service';

@ApiTags('Super Admin - Users')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['users', 'admin/users'])
export class UsersController {
  constructor(private readonly usersService: SuperAdminUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat akun pengguna baru' })
  @ApiResponse({
    status: 201,
    description: 'Pengguna berhasil dibuat.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validasi gagal atau departemen tidak valid.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email sudah terdaftar.',
  })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.usersService.create(dto, currentUserId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat daftar seluruh pengguna dengan filter dan paginasi' })
  @ApiResponse({ status: 200, description: 'Daftar pengguna berhasil dimuat.' })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail informasi pengguna' })
  @ApiResponse({ status: 200, description: 'Detail pengguna berhasil ditemukan.' })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data akun pengguna' })
  @ApiResponse({ status: 200, description: 'Pengguna berhasil diperbarui.' })
  @ApiResponse({
    status: 400,
    description: 'Pelanggaran aturan keamanan atau validasi data.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.usersService.update(id, dto, currentUserId, ip);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mengaktifkan atau menonaktifkan akun pengguna' })
  @ApiResponse({ status: 200, description: 'Status pengguna berhasil diperbarui.' })
  @ApiResponse({
    status: 400,
    description: 'Tidak dapat menonaktifkan diri sendiri atau super_admin terakhir.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.usersService.updateStatus(id, dto, currentUserId, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus pengguna secara aman (soft delete)' })
  @ApiResponse({ status: 200, description: 'Pengguna berhasil di-soft-delete.' })
  @ApiResponse({
    status: 400,
    description: 'Tidak dapat menghapus diri sendiri atau super_admin terakhir.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.usersService.remove(id, currentUserId, ip);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mereset kata sandi pengguna dan mencabut seluruh sesi aktif' })
  @ApiResponse({
    status: 200,
    description: 'Permintaan reset berhasil diproses, token sekali pakai tersimpan dan sesi dicabut.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Ip() ip: string,
  ) {
    return this.usersService.resetPassword(id, currentUserId, ip);
  }
}
