import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMilestoneDto {
  @ApiProperty({
    description: 'Nama milestone',
    example: 'Persetujuan Desain UI/UX',
  })
  @IsNotEmpty({ message: 'Nama milestone wajib diisi' })
  @IsString({ message: 'Nama milestone harus berupa string' })
  @MaxLength(255, { message: 'Nama milestone maksimal 255 karakter' })
  name!: string;

  @ApiProperty({
    description: 'Tenggat waktu milestone',
    example: '2026-02-01',
  })
  @IsNotEmpty({ message: 'Tenggat waktu milestone wajib diisi' })
  @IsDateString({}, { message: 'Format tenggat waktu milestone tidak valid' })
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Status selesai', default: false })
  @IsOptional()
  @IsBoolean({ message: 'Status selesai harus bernilai boolean' })
  isDone?: boolean;

  @ApiPropertyOptional({ description: 'ID Fase terkait (opsional)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID fase harus berupa UUID yang valid' })
  phaseId?: string;
}
