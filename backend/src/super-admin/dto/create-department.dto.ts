import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Nama departemen (unik)',
    example: 'Engineering',
  })
  @IsNotEmpty({ message: 'Nama departemen wajib diisi' })
  @IsString({ message: 'Nama departemen harus berupa string' })
  name!: string;

  @ApiPropertyOptional({
    description: 'ID pengguna kepala departemen',
    example: 'uuid-user-kepala-dept',
  })
  @IsOptional()
  @IsString({ message: 'ID kepala departemen harus berupa string UUID' })
  headUserId?: string;

  @ApiPropertyOptional({
    description: 'Anggaran tahunan departemen dalam Rupiah',
    example: 500000000,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsNumber({}, { message: 'Anggaran tahunan harus berupa angka' })
  @Min(0, { message: 'Anggaran tahunan tidak boleh negatif' })
  annualBudget?: number = 0;
}
