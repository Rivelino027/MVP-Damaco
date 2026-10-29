import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { BudgetRequestType } from '@prisma/client';

export class CreateBudgetRequestItemDto {
  @ApiPropertyOptional({ description: 'ID Fase proyek (opsional)' })
  @IsOptional()
  @IsUUID('4')
  phaseId?: string;

  @ApiProperty({ description: 'ID Kategori Biaya' })
  @IsNotEmpty({ message: 'Category ID wajib diisi' })
  @IsUUID('4', { message: 'Format Category ID tidak valid' })
  categoryId!: string;

  @ApiProperty({ description: 'Nominal anggaran baru' })
  @IsNotEmpty({ message: 'Nominal baru wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal baru harus berupa angka' })
  @Min(0, { message: 'Nominal baru minimal 0' })
  newAmount!: number;

  @ApiPropertyOptional({
    description: 'Nominal anggaran lama (untuk perubahan)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  oldAmount?: number;
}

export class CreateBudgetRequestDto {
  @ApiProperty({ description: 'ID Proyek' })
  @IsNotEmpty({ message: 'Project ID wajib diisi' })
  @IsUUID('4', { message: 'Format Project ID tidak valid' })
  projectId!: string;

  @ApiProperty({
    enum: BudgetRequestType,
    description: 'Tipe pengajuan (awal / perubahan)',
  })
  @IsNotEmpty({ message: 'Tipe pengajuan wajib diisi' })
  @IsEnum(BudgetRequestType, {
    message: 'Tipe pengajuan harus berupa awal atau perubahan',
  })
  type!: BudgetRequestType;

  @ApiPropertyOptional({ description: 'Alasan pengajuan / justifikasi' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Tanggal selesai baru yang diusulkan (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  newEndDate?: string;

  @ApiProperty({
    description: 'Daftar rincian anggaran per kategori / fase',
    type: [CreateBudgetRequestItemDto],
  })
  @IsArray({ message: 'Items harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetRequestItemDto)
  items!: CreateBudgetRequestItemDto[];

  @ApiPropertyOptional({ description: 'Langsung ajukan (bukan draft)' })
  @IsOptional()
  submitNow?: boolean;
}
