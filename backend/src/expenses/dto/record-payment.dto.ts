import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Metode pembayaran' })
  @IsNotEmpty()
  @IsEnum(PaymentMethod, {
    message: 'Metode pembayaran tidak valid (transfer atau tunai)',
  })
  method!: PaymentMethod;

  @ApiProperty({
    description: 'Tanggal pembayaran (YYYY-MM-DD atau ISO string)',
  })
  @IsNotEmpty({ message: 'Tanggal pembayaran wajib diisi' })
  @IsDateString({}, { message: 'Format tanggal pembayaran tidak valid' })
  paidAt!: string;

  @ApiPropertyOptional({ description: 'Nomor referensi / nomor transfer' })
  @IsOptional()
  @IsString()
  referenceNo?: string;
}
