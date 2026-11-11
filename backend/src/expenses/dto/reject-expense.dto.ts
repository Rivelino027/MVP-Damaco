import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectExpenseDto {
  @ApiProperty({ description: 'Alasan penolakan (wajib diisi)' })
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @IsString()
  @MinLength(3, { message: 'Alasan penolakan minimal 3 karakter' })
  reason!: string;
}
