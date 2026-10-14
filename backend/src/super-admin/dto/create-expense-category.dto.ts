import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Nama kategori pengeluaran (unik)', example: 'Material' })
  @IsNotEmpty({ message: 'Nama kategori wajib diisi' })
  @IsString({ message: 'Nama kategori harus berupa string' })
  name!: string;

  @ApiProperty({ description: 'Kode unik kategori pengeluaran', example: 'MAT' })
  @IsNotEmpty({ message: 'Kode kategori wajib diisi' })
  @IsString({ message: 'Kode kategori harus berupa string' })
  code!: string;

  @ApiPropertyOptional({ description: 'Warna label/chip (HEX)', example: '#10B981' })
  @IsOptional()
  @IsString({ message: 'Warna harus berupa string' })
  color?: string;
}
