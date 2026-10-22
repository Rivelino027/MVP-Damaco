import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateHourlyCostDto {
  @ApiProperty({ description: 'ID pengguna penerima tarif' })
  @IsNotEmpty({ message: 'User ID wajib diisi' })
  @IsString({ message: 'User ID harus berupa string' })
  userId!: string;

  @ApiProperty({
    description: 'Tarif per jam (harus angka positif, Decimal 18,2)',
    example: 75000,
  })
  @IsNotEmpty({ message: 'Tarif per jam wajib diisi' })
  @IsNumber({}, { message: 'Tarif per jam harus berupa angka' })
  @Min(0.01, { message: 'Tarif per jam harus lebih besar dari 0' })
  ratePerHour!: number;

  @ApiProperty({
    description: 'Tanggal mulai berlaku tarif (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsNotEmpty({ message: 'Tanggal berlaku (effectiveFrom) wajib diisi' })
  @IsDateString(
    {},
    { message: 'Format tanggal berlaku tidak valid (gunakan YYYY-MM-DD)' },
  )
  effectiveFrom!: string;
}
