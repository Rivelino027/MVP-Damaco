import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ProposeLimitDto {
  @ApiProperty({
    description: 'Nominal batas baru yang diusulkan',
    example: 7500000,
  })
  @IsNotEmpty({ message: 'Nominal batas baru wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal batas harus berupa angka' })
  @IsPositive({ message: 'Nominal batas harus lebih besar dari 0' })
  newAmount!: number;

  @ApiPropertyOptional({ description: 'Alasan perubahan batas' })
  @IsOptional()
  @IsString()
  reason?: string;
}
