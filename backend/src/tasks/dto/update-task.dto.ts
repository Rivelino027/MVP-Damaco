import { ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'ID fase proyek (null jika dihapus dari fase)',
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @IsUUID('4', { message: 'ID fase harus berupa UUID yang valid' })
  phaseId?: string | null;

  @ApiPropertyOptional({ description: 'Judul tugas/task', maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'Judul task harus berupa string' })
  @IsNotEmpty({ message: 'Judul task tidak boleh kosong' })
  @MaxLength(255, { message: 'Judul task maksimal 255 karakter' })
  title?: string;

  @ApiPropertyOptional({ description: 'Deskripsi tugas/task' })
  @IsOptional()
  @IsString({ message: 'Deskripsi task harus berupa string' })
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'ID pengguna yang ditugaskan (null untuk membatalkan penugasan)',
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @IsUUID('4', { message: 'ID assignee harus berupa UUID yang valid' })
  assigneeId?: string | null;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Status pengerjaan task',
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status task tidak valid' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Prioritas task (rendah, sedang, tinggi)',
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'Prioritas task tidak valid' })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Tenggat waktu task (ISO 8601, null untuk menghapus)',
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @IsDateString(
    {},
    { message: 'Tenggat waktu harus berupa tanggal yang valid (ISO 8601)' },
  )
  dueDate?: string | null;

  @ApiPropertyOptional({ description: 'Estimasi waktu pengerjaan dalam jam' })
  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @Type(() => Number)
  @IsNumber({}, { message: 'Estimasi jam harus berupa angka' })
  @Min(0, { message: 'Estimasi jam tidak boleh negatif' })
  estimatedHours?: number | null;
}
