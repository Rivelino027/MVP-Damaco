import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ description: 'Nama milestone' })
  @IsOptional()
  @IsString({ message: 'Nama milestone harus berupa string' })
  @MaxLength(255, { message: 'Nama milestone maksimal 255 karakter' })
  name?: string;

  @ApiPropertyOptional({ description: 'Tenggat waktu milestone' })
  @IsOptional()
  @IsDateString({}, { message: 'Format tenggat waktu milestone tidak valid' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Status selesai' })
  @IsOptional()
  @IsBoolean({ message: 'Status selesai harus bernilai boolean' })
  isDone?: boolean;

  @ApiPropertyOptional({ description: 'ID Fase terkait (kirim null untuk melepas dari fase)' })
  @IsOptional()
  @IsUUID('4', { message: 'ID fase harus berupa UUID yang valid' })
  phaseId?: string | null;
}
