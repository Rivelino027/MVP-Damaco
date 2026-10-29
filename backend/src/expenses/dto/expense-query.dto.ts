import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExpenseStatus } from '@prisma/client';

export class ExpenseQueryDto {
  @ApiPropertyOptional({ description: 'Nomor halaman', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah item per halaman', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ExpenseStatus, description: 'Filter status' })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: 'Filter ID proyek' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter ID departemen (admin: diabaikan, selalu dept sendiri)',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter hanya Nominal Besar' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLargeAmount?: boolean;

  @ApiPropertyOptional({ description: 'Cari berdasarkan nama vendor' })
  @IsOptional()
  @IsString()
  vendor?: string;
}
