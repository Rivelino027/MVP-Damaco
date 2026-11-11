import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'ID Proyek' })
  @IsNotEmpty({ message: 'Project ID wajib diisi' })
  @IsUUID('4', { message: 'Format Project ID tidak valid' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'ID Task terkait' })
  @IsOptional()
  @IsUUID('4', { message: 'Format Task ID tidak valid' })
  taskId?: string;

  @ApiProperty({ description: 'ID Cost Center' })
  @IsNotEmpty({ message: 'Cost Center ID wajib diisi' })
  @IsUUID('4', { message: 'Format Cost Center ID tidak valid' })
  costCenterId!: string;

  @ApiProperty({ description: 'ID Kategori Pengeluaran' })
  @IsNotEmpty({ message: 'Category ID wajib diisi' })
  @IsUUID('4', { message: 'Format Category ID tidak valid' })
  categoryId!: string;

  @ApiProperty({ description: 'Jumlah nominal pengeluaran' })
  @IsNotEmpty({ message: 'Nominal pengeluaran wajib diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @IsPositive({ message: 'Nominal harus lebih besar dari 0' })
  amount!: number;

  @ApiProperty({ description: 'Tanggal pengeluaran (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Tanggal pengeluaran wajib diisi' })
  @IsDateString({}, { message: 'Format tanggal pengeluaran tidak valid' })
  expenseDate!: string;

  @ApiPropertyOptional({ description: 'Nama vendor / toko / penyedia' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Catatan pengeluaran / alasan' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'ID Attachment / bukti nota yang sudah diunggah',
  })
  @IsOptional()
  @IsUUID('4')
  attachmentId?: string;

  @ApiPropertyOptional({
    description: 'URL atau file nota jika dikirim langsung',
  })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({
    description: 'Langsung ajukan pengeluaran (bukan draft)',
  })
  @IsOptional()
  submitNow?: boolean;
}
