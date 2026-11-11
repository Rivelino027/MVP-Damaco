import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProjectTypeDto {
  @ApiPropertyOptional({ description: 'Nama jenis proyek' })
  @IsOptional()
  @IsString({ message: 'Nama jenis proyek harus berupa string' })
  name?: string;

  @ApiPropertyOptional({ description: 'Status aktif jenis proyek' })
  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive?: boolean;
}
