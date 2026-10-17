import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ProjectQueryDto {
  @ApiPropertyOptional({ description: 'Nomor halaman', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Halaman harus berupa angka bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah item per halaman', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit: number = 10;

  @ApiPropertyOptional({ description: 'Pencarian nama proyek' })
  @IsOptional()
  @IsString({ message: 'Pencarian harus berupa string' })
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter status proyek' })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status proyek tidak valid' })
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Filter ID Departemen' })
  @IsOptional()
  @IsUUID('4', { message: 'ID departemen tidak valid' })
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter ID Cost Center' })
  @IsOptional()
  @IsUUID('4', { message: 'ID cost center tidak valid' })
  costCenterId?: string;
}
