import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePhaseDto {
  @ApiProperty({ description: 'Nama fase', example: 'Fase 1: Perencanaan & Desain' })
  @IsNotEmpty({ message: 'Nama fase wajib diisi' })
  @IsString({ message: 'Nama fase harus berupa string' })
  @MaxLength(255, { message: 'Nama fase maksimal 255 karakter' })
  name!: string;

  @ApiPropertyOptional({ description: 'Nomor urutan fase', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Urutan fase harus berupa integer' })
  @Min(0, { message: 'Urutan fase minimal 0' })
  sortOrder: number = 0;

  @ApiPropertyOptional({ description: 'Tanggal mulai fase', example: '2026-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal mulai fase tidak valid' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Tanggal selesai fase', example: '2026-02-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal selesai fase tidak valid' })
  endDate?: string;
}
