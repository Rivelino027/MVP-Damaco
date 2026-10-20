import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateChecklistDto {
  @ApiPropertyOptional({ description: 'Teks butir checklist' })
  @IsOptional()
  @IsString({ message: 'Teks checklist harus berupa string' })
  @IsNotEmpty({ message: 'Teks checklist tidak boleh kosong' })
  @MaxLength(500, { message: 'Teks checklist maksimal 500 karakter' })
  text?: string;

  @ApiPropertyOptional({
    description: 'Status checklist (selesai / belum selesai)',
  })
  @IsOptional()
  @IsBoolean({ message: 'isDone harus berupa nilai boolean' })
  isDone?: boolean;
}
