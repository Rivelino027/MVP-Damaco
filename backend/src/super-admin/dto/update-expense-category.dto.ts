import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional({ description: 'Nama kategori pengeluaran' })
  @IsOptional()
  @IsString({ message: 'Nama kategori harus berupa string' })
  name?: string;

  @ApiPropertyOptional({ description: 'Kode unik kategori' })
  @IsOptional()
  @IsString({ message: 'Kode kategori harus berupa string' })
  code?: string;

  @ApiPropertyOptional({ description: 'Warna label/chip (HEX)' })
  @IsOptional()
  @IsString({ message: 'Warna harus berupa string' })
  color?: string;

  @ApiPropertyOptional({ description: 'Status aktif kategori' })
  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive?: boolean;
}
