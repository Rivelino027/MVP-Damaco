import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChecklistDto {
  @ApiProperty({ description: 'Teks butir checklist' })
  @IsString({ message: 'Teks checklist harus berupa string' })
  @IsNotEmpty({ message: 'Teks checklist wajib diisi' })
  @MaxLength(500, { message: 'Teks checklist maksimal 500 karakter' })
  text!: string;
}
