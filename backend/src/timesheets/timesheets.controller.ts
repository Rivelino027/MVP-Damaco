import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Put,
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
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { TimesheetsService } from './timesheets.service';

@ApiTags('Timesheets')
@ApiBearerAuth()
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Membuat timesheet mingguan baru (draft)' })
  @ApiResponse({ status: 201, description: 'Timesheet berhasil dibuat.' })
  @ApiResponse({ status: 400, description: 'Validasi gagal.' })
  @ApiResponse({ status: 403, description: 'Izin ditolak.' })
  @ApiResponse({ status: 409, description: 'Timesheet minggu ini sudah ada.' })
  async create(
    @Body() dto: CreateTimesheetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.create(dto, user, ip);
  }

  @Get('my')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Melihat daftar timesheet milik sendiri' })
  @ApiResponse({
    status: 200,
    description: 'Daftar timesheet berhasil dimuat.',
  })
  async findMy(
    @Query() query: TimesheetQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timesheetsService.findMy(query, user);
  }

  @Get('team')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({
    summary: 'Melihat timesheet tim (Admin: departemennya, Super Admin: semua)',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar timesheet tim berhasil dimuat.',
  })
  async findTeam(
    @Query() query: TimesheetQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timesheetsService.findTeam(query, user);
  }

  @Get(':id')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat detail timesheet' })
  @ApiResponse({
    status: 200,
    description: 'Detail timesheet berhasil dimuat.',
  })
  @ApiResponse({ status: 403, description: 'Tidak memiliki izin.' })
  @ApiResponse({ status: 404, description: 'Timesheet tidak ditemukan.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.findOne(id, user, ip);
  }

  @Put(':id')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Mengubah entry timesheet (draft / ditolak)' })
  @ApiResponse({ status: 200, description: 'Timesheet berhasil diubah.' })
  @ApiResponse({ status: 400, description: 'Timesheet tidak dapat diubah.' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik timesheet.' })
  @ApiResponse({ status: 404, description: 'Timesheet tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimesheetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.update(id, dto, user, ip);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Mengajukan timesheet ke Admin' })
  @ApiResponse({ status: 200, description: 'Timesheet berhasil diajukan.' })
  @ApiResponse({
    status: 400,
    description: 'Timesheet kosong atau status tidak valid.',
  })
  @ApiResponse({ status: 403, description: 'Bukan pemilik timesheet.' })
  @ApiResponse({ status: 404, description: 'Timesheet tidak ditemukan.' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.submit(id, user, ip);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menyetujui timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet berhasil disetujui.' })
  @ApiResponse({
    status: 400,
    description: 'Tarif belum diatur atau self-approval.',
  })
  @ApiResponse({ status: 404, description: 'Timesheet tidak ditemukan.' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.approve(id, user, ip);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menolak timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet berhasil ditolak.' })
  @ApiResponse({ status: 400, description: 'Alasan wajib diisi.' })
  @ApiResponse({ status: 404, description: 'Timesheet tidak ditemukan.' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectTimesheetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.timesheetsService.reject(id, dto, user, ip);
  }
}
