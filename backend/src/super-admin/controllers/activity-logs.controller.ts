import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ActivityLogQueryDto } from '../dto/activity-log-query.dto';
import { ActivityLogsService } from '../services/activity-logs.service';

@ApiTags('Super Admin - Activity Logs')
@ApiBearerAuth()
@Roles(Role.super_admin)
@Controller(['activity-logs', 'admin/activity-logs'])
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Melihat daftar riwayat audit/log aktivitas sistem (hanya super_admin, baca saja)',
  })
  @ApiResponse({
    status: 200,
    description: 'Log aktivitas berhasil diambil.',
  })
  async findAll(@Query() query: ActivityLogQueryDto) {
    return this.activityLogsService.findAll(query);
  }
}
