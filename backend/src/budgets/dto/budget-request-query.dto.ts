import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { BudgetRequestStatus, BudgetRequestType } from '@prisma/client';

export class BudgetRequestQueryDto {
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

  @ApiPropertyOptional({
    enum: BudgetRequestStatus,
    description: 'Filter status',
  })
  @IsOptional()
  @IsEnum(BudgetRequestStatus)
  status?: BudgetRequestStatus;

  @ApiPropertyOptional({
    enum: BudgetRequestType,
    description: 'Filter tipe (awal / perubahan)',
  })
  @IsOptional()
  @IsEnum(BudgetRequestType)
  type?: BudgetRequestType;

  @ApiPropertyOptional({ description: 'Filter ID proyek' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
