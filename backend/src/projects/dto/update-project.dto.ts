import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Nama proyek' })
  @IsOptional()
  @IsString({ message: 'Nama proyek harus berupa string' })
  @MaxLength(255, { message: 'Nama proyek maksimal 255 karakter' })
  name?: string;

  @ApiPropertyOptional({ description: 'Deskripsi proyek' })
  @IsOptional()
  @IsString({ message: 'Deskripsi proyek harus berupa string' })
  description?: string;

  @ApiPropertyOptional({ description: 'ID Cost Center pemilik biaya proyek' })
  @IsOptional()
  @IsUUID('4', { message: 'ID cost center harus berupa UUID' })
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'ID Jenis Proyek' })
  @IsOptional()
  @IsUUID('4', { message: 'ID jenis proyek harus berupa UUID' })
  projectTypeId?: string;

  @ApiPropertyOptional({ description: 'Tanggal mulai proyek', example: '2026-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal mulai tidak valid (gunakan format YYYY-MM-DD)' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Tanggal selesai proyek', example: '2026-06-30' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal selesai tidak valid (gunakan format YYYY-MM-DD)' })
  endDate?: string;
}
