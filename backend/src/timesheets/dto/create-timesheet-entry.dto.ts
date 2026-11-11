import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTimesheetEntryDto {
  @ApiProperty({ description: 'ID Task yang dikerjakan' })
  @IsNotEmpty({ message: 'Task ID wajib diisi' })
  @IsString()
  taskId!: string;

  @ApiProperty({
    description: 'Tanggal pengerjaan task (YYYY-MM-DD)',
    example: '2026-10-19',
  })
  @IsNotEmpty({ message: 'Tanggal pengerjaan (workDate) wajib diisi' })
  @IsDateString(
    {},
    { message: 'Format tanggal kerja tidak valid (gunakan YYYY-MM-DD)' },
  )
  workDate!: string;

  @ApiProperty({
    description: 'Jumlah jam kerja (0.01 - 24.00, maks 2 desimal)',
    example: 8,
  })
  @IsNotEmpty({ message: 'Jumlah jam kerja wajib diisi' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Jam kerja harus berupa angka dengan maksimal 2 angka desimal' },
  )
  @Min(0.01, { message: 'Jam kerja minimal 0.01 jam' })
  @Max(24, { message: 'Jam kerja per entry maksimal 24 jam' })
  hours!: number;

  @ApiPropertyOptional({ description: 'Catatan pekerjaan' })
  @IsOptional()
  @IsString()
  note?: string;
}
