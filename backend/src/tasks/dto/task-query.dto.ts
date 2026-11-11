import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class TaskQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Halaman data (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page harus berupa bilangan bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Jumlah item per halaman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus berupa bilangan bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID proyek' })
  @IsOptional()
  @IsUUID('4', { message: 'ID proyek harus berupa UUID yang valid' })
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID fase' })
  @IsOptional()
  @IsUUID('4', { message: 'ID fase harus berupa UUID yang valid' })
  phaseId?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Filter berdasarkan status task',
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status task tidak valid' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Filter berdasarkan prioritas task',
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'Prioritas task tidak valid' })
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID assignee' })
  @IsOptional()
  @IsUUID('4', { message: 'ID assignee harus berupa UUID yang valid' })
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Pencarian berdasarkan judul task' })
  @IsOptional()
  @IsString({ message: 'Pencarian harus berupa string' })
  search?: string;
}
