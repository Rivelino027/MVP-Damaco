import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePhaseDto {
  @ApiPropertyOptional({ description: 'Nama fase' })
  @IsOptional()
  @IsString({ message: 'Nama fase harus berupa string' })
  @MaxLength(255, { message: 'Nama fase maksimal 255 karakter' })
  name?: string;

  @ApiPropertyOptional({ description: 'Nomor urutan fase' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Urutan fase harus berupa integer' })
  @Min(0, { message: 'Urutan fase minimal 0' })
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Tanggal mulai fase' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal mulai fase tidak valid' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Tanggal selesai fase' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal selesai fase tidak valid' })
  endDate?: string;
}
