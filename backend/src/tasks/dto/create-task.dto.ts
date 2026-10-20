import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'ID proyek yang memuat task' })
  @IsUUID('4', { message: 'ID proyek harus berupa UUID yang valid' })
  @IsNotEmpty({ message: 'ID proyek wajib diisi' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'ID fase proyek (opsional)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID fase harus berupa UUID yang valid' })
  phaseId?: string;

  @ApiProperty({ description: 'Judul tugas/task', maxLength: 255 })
  @IsString({ message: 'Judul task harus berupa string' })
  @IsNotEmpty({ message: 'Judul task wajib diisi' })
  @MaxLength(255, { message: 'Judul task maksimal 255 karakter' })
  title!: string;

  @ApiPropertyOptional({ description: 'Deskripsi tugas/task' })
  @IsOptional()
  @IsString({ message: 'Deskripsi task harus berupa string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'ID pengguna yang ditugaskan (anggota proyek)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID assignee harus berupa UUID yang valid' })
  assigneeId?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    default: TaskStatus.belum_mulai,
    description: 'Status pengerjaan task',
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status task tidak valid' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: Priority,
    default: Priority.sedang,
    description: 'Prioritas task (rendah, sedang, tinggi)',
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'Prioritas task tidak valid' })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Tenggat waktu task (ISO 8601, harus dalam rentang proyek)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Tenggat waktu harus berupa tanggal yang valid (ISO 8601)' },
  )
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimasi waktu pengerjaan dalam jam' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Estimasi jam harus berupa angka' })
  @Min(0, { message: 'Estimasi jam tidak boleh negatif' })
  estimatedHours?: number;
}
