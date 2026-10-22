import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
import { LaborCostQueryDto } from '../dto/labor-cost-query.dto';
import { LaborCostsService } from '../services/labor-costs.service';

@ApiTags('Labor Costs')
@ApiBearerAuth()
@Roles(Role.admin, Role.finance, Role.super_admin)
@Controller(['labor-costs', 'labor_costs'])
export class LaborCostsController {
  constructor(private readonly laborCostsService: LaborCostsService) {}

  @Get('projects/:projectId')
  @ApiOperation({
    summary:
      'Melihat agregat biaya tenaga kerja per proyek (Admin departemennya, Finance & Super Admin semua)',
  })
  @ApiResponse({ status: 200, description: 'Agregat proyek berhasil dimuat.' })
  @ApiResponse({ status: 403, description: 'Tidak memiliki izin.' })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async getProjectAggregate(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LaborCostQueryDto,
  ) {
    return this.laborCostsService.getProjectAggregate(projectId, user, query);
  }

  @Get('departments/:departmentId')
  @ApiOperation({
    summary:
      'Melihat agregat biaya tenaga kerja per departemen (Admin departemennya, Finance & Super Admin semua)',
  })
  @ApiResponse({
    status: 200,
    description: 'Agregat departemen berhasil dimuat.',
  })
  @ApiResponse({ status: 403, description: 'Tidak memiliki izin.' })
  @ApiResponse({ status: 404, description: 'Departemen tidak ditemukan.' })
  async getDepartmentAggregate(
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LaborCostQueryDto,
  ) {
    return this.laborCostsService.getDepartmentAggregate(
      departmentId,
      user,
      query,
    );
  }

  @Get('aggregate')
  @ApiOperation({
    summary:
      'Melihat agregat biaya tenaga kerja fleksibel (berdasarkan projectId atau departmentId)',
  })
  @ApiResponse({ status: 200, description: 'Agregat berhasil dimuat.' })
  async getAggregate(
    @Query() query: LaborCostQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (query.projectId) {
      return this.laborCostsService.getProjectAggregate(
        query.projectId,
        user,
        query,
      );
    }
    if (query.departmentId) {
      return this.laborCostsService.getDepartmentAggregate(
        query.departmentId,
        user,
        query,
      );
    }
    throw new BadRequestException(
      'Harap sertakan projectId atau departmentId dalam query parameter',
    );
  }
}
