import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateTimesheetEntryDto } from './create-timesheet-entry.dto';

export class CreateTimesheetDto {
  @ApiProperty({
    description: 'Tanggal awal minggu (harus hari Senin, format YYYY-MM-DD)',
    example: '2026-10-19',
  })
  @IsNotEmpty({ message: 'Tanggal awal minggu (weekStart) wajib diisi' })
  @IsDateString(
    {},
    { message: 'Format tanggal awal minggu tidak valid (gunakan YYYY-MM-DD)' },
  )
  weekStart!: string;

  @ApiPropertyOptional({
    description: 'ID pengguna pemilik timesheet (hanya untuk validasi)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Daftar entry pekerjaan harian dalam minggu ini',
    type: [CreateTimesheetEntryDto],
  })
  @IsOptional()
  @IsArray({ message: 'Entries harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTimesheetEntryDto)
  entries?: CreateTimesheetEntryDto[];
}
