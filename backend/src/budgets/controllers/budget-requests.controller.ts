import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BudgetsService } from '../budgets.service';
import { ApproveBudgetDto } from '../dto/approve-budget.dto';
import { BudgetRequestQueryDto } from '../dto/budget-request-query.dto';
import { CreateBudgetRequestDto } from '../dto/create-budget-request.dto';
import { RejectBudgetDto } from '../dto/reject-budget.dto';

@ApiTags('Budget Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budget-requests')
export class BudgetRequestsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan daftar pengajuan anggaran' })
  @ApiResponse({
    status: 200,
    description: 'Daftar pengajuan anggaran berpaginasi',
  })
  async findMany(
    @Query() query: BudgetRequestQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.findMany(query, user);
  }

  @Post()
  @Roles(Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({
    summary: 'Membuat pengajuan anggaran baru (draft atau langsung ajukan)',
  })
  @ApiResponse({
    status: 201,
    description: 'Pengajuan anggaran berhasil dibuat',
  })
  async create(
    @Body() dto: CreateBudgetRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail pengajuan anggaran' })
  @ApiResponse({ status: 200, description: 'Detail pengajuan anggaran' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.findOne(id, user);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Mengajukan pengajuan anggaran draft / ditolak' })
  @ApiResponse({
    status: 200,
    description: 'Pengajuan anggaran berhasil diajukan',
  })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.submit(id, user);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.finance, Role.super_admin)
  @ApiOperation({
    summary:
      'Menyetujui pengajuan anggaran (Finance kelayakan atau Super Admin final)',
  })
  @ApiResponse({ status: 200, description: 'Pengajuan anggaran disetujui' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.approve(id, dto, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.finance, Role.super_admin)
  @ApiOperation({
    summary: 'Menolak pengajuan anggaran (Finance atau Super Admin)',
  })
  @ApiResponse({ status: 200, description: 'Pengajuan anggaran ditolak' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.reject(id, dto, user);
  }
}
