import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({
    summary: 'Mendapatkan data dasbor untuk peran Admin (khusus departemennya)',
  })
  @ApiResponse({ status: 200, description: 'Ringkasan dasbor Admin' })
  async getAdminDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getAdminDashboard(user);
  }

  @Get('finance')
  @Roles(Role.finance, Role.super_admin)
  @ApiOperation({
    summary: 'Mendapatkan data dasbor untuk peran Finance (seluruh perusahaan)',
  })
  @ApiResponse({ status: 200, description: 'Ringkasan dasbor Finance' })
  async getFinanceDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getFinanceDashboard(user);
  }

  @Get('super-admin')
  @Roles(Role.super_admin)
  @ApiOperation({
    summary: 'Mendapatkan data dasbor untuk peran Super Admin (sistem & audit)',
  })
  @ApiResponse({ status: 200, description: 'Ringkasan dasbor Super Admin' })
  async getSuperAdminDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSuperAdminDashboard(user);
  }
}
