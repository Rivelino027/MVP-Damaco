import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActivityLogQueryDto {
  @ApiPropertyOptional({ description: 'Nomor halaman', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Halaman harus berupa angka bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah item per halaman', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID pengguna pelaku aksi' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan nama modul aktivitas' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({
    description: 'Tanggal mulai filter (ISO 8601 string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal mulai harus berupa ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir filter (ISO 8601 string)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal akhir harus berupa ISO date string' })
  endDate?: string;
}
