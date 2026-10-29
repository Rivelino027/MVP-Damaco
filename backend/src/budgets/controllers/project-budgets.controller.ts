import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BudgetsService } from '../budgets.service';

@ApiTags('Project Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/budget')
export class ProjectBudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Mendapatkan anggaran aktif suatu proyek' })
  @ApiResponse({ status: 200, description: 'Anggaran aktif proyek' })
  async getActiveBudget(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.getActiveBudget(projectId, user);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Mendapatkan ringkasan serapan anggaran proyek (Budget vs Aktual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ringkasan serapan anggaran dan peringatan dini',
  })
  async getBudgetSummary(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.getBudgetSummary(projectId, user);
  }
}
