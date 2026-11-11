import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmLimitDto {
  @ApiProperty({
    description: 'Keputusan konfirmasi: berlaku atau ditolak',
    enum: ['berlaku', 'ditolak'],
  })
  @IsNotEmpty({ message: 'Keputusan konfirmasi wajib diisi' })
  @IsIn(['berlaku', 'ditolak', 'disetujui'], {
    message: 'Keputusan harus berupa berlaku atau ditolak',
  })
  decision!: 'berlaku' | 'ditolak' | 'disetujui';

  @ApiPropertyOptional({ description: 'Alasan keputusan' })
  @IsOptional()
  @IsString()
  reason?: string;
}
