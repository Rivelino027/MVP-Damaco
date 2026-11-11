import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimesheetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class TimesheetQueryDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan tanggal awal minggu (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  weekStart?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan status timesheet',
    enum: TimesheetStatus,
  })
  @IsOptional()
  @IsEnum(TimesheetStatus)
  status?: TimesheetStatus;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID proyek dari task yang dikerjakan',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description:
      'Filter berdasarkan ID departemen pengguna (hanya super_admin)',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Halaman data', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah data per halaman', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
