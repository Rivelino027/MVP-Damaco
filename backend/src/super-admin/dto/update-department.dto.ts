import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ description: 'Nama departemen' })
  @IsOptional()
  @IsString({ message: 'Nama departemen harus berupa string' })
  name?: string;

  @ApiPropertyOptional({ description: 'ID pengguna kepala departemen' })
  @IsOptional()
  @IsString({ message: 'ID kepala departemen harus berupa string UUID' })
  headUserId?: string | null;

  @ApiPropertyOptional({ description: 'Anggaran tahunan departemen' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber({}, { message: 'Anggaran tahunan harus berupa angka' })
  @Min(0, { message: 'Anggaran tahunan tidak boleh negatif' })
  annualBudget?: number;

  @ApiPropertyOptional({ description: 'Status aktif departemen' })
  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive?: boolean;
}
