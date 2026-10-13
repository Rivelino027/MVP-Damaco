import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Cek kesehatan aplikasi dan konektivitas database' })
  @ApiResponse({
    status: 200,
    description: 'Aplikasi berjalan normal dan terhubung ke database.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-10-13T09:00:00.000Z',
        database: {
          status: 'connected',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Koneksi database bermasalah atau terputus.',
    schema: {
      example: {
        status: 'error',
        timestamp: '2026-10-13T09:00:00.000Z',
        database: {
          status: 'disconnected',
          error: 'Connection refused',
        },
      },
    },
  })
  async check(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
        },
      });
    } catch (error: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          error: error?.message || 'Database connection failed',
        },
      });
    }
  }
}
