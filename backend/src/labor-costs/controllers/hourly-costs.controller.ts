import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
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
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateHourlyCostDto } from '../dto/create-hourly-cost.dto';
import { HourlyCostQueryDto } from '../dto/hourly-cost-query.dto';
import { HourlyCostsService } from '../services/hourly-costs.service';

@ApiTags('Hourly Costs')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['hourly-costs', 'hourly_costs'])
export class HourlyCostsController {
  constructor(private readonly hourlyCostsService: HourlyCostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Menambahkan tarif per jam baru (Super Admin)' })
  @ApiResponse({ status: 201, description: 'Tarif berhasil dibuat.' })
  @ApiResponse({ status: 400, description: 'Data tidak valid.' })
  @ApiResponse({
    status: 403,
    description: 'Hanya super_admin yang diizinkan.',
  })
  @ApiResponse({
    status: 409,
    description: 'Tarif untuk tanggal berlaku ini sudah ada.',
  })
  async create(
    @Body() dto: CreateHourlyCostDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.hourlyCostsService.create(dto, user, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat daftar tarif per jam (Super Admin)' })
  @ApiResponse({ status: 200, description: 'Daftar tarif berhasil dimuat.' })
  @ApiResponse({
    status: 403,
    description: 'Hanya super_admin yang diizinkan.',
  })
  async findAll(
    @Query() query: HourlyCostQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.hourlyCostsService.findAll(query, user, ip);
  }

  @Get('users/:userId')
  @ApiOperation({
    summary: 'Melihat riwayat tarif per jam pengguna (Super Admin)',
  })
  @ApiResponse({ status: 200, description: 'Riwayat tarif berhasil dimuat.' })
  @ApiResponse({
    status: 403,
    description: 'Hanya super_admin yang diizinkan.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async findByUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.hourlyCostsService.findByUser(userId, user, ip);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Melihat riwayat tarif per jam pengguna (Super Admin alias)',
  })
  @ApiResponse({ status: 200, description: 'Riwayat tarif berhasil dimuat.' })
  @ApiResponse({
    status: 403,
    description: 'Hanya super_admin yang diizinkan.',
  })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan.' })
  async findByUserAlias(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.hourlyCostsService.findByUser(userId, user, ip);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Melihat satu tarif per jam berdasarkan ID (Super Admin)',
  })
  @ApiResponse({ status: 200, description: 'Tarif berhasil dimuat.' })
  @ApiResponse({
    status: 403,
    description: 'Hanya super_admin yang diizinkan.',
  })
  @ApiResponse({ status: 404, description: 'Tarif tidak ditemukan.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.hourlyCostsService.findOne(id, user, ip);
  }
}
