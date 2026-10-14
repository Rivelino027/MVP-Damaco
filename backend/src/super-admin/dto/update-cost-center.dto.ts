import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCostCenterDto {
  @ApiPropertyOptional({ description: 'Kode unik cost center' })
  @IsOptional()
  @IsString({ message: 'Kode cost center harus berupa string' })
  code?: string;

  @ApiPropertyOptional({ description: 'Nama cost center' })
  @IsOptional()
  @IsString({ message: 'Nama cost center harus berupa string' })
  name?: string;

  @ApiPropertyOptional({ description: 'ID Departemen pemilik cost center' })
  @IsOptional()
  @IsString({ message: 'ID Departemen harus berupa string' })
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Status aktif cost center' })
  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive?: boolean;
}
