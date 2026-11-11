import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class LaborCostQueryDto {
  @ApiPropertyOptional({ description: 'ID proyek' })
  @IsOptional()
  @IsUUID('4', { message: 'ID proyek harus berupa UUID yang valid' })
  projectId?: string;

  @ApiPropertyOptional({ description: 'ID departemen' })
  @IsOptional()
  @IsUUID('4', { message: 'ID departemen harus berupa UUID yang valid' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal mulai pekerjaan (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Format tanggal mulai tidak valid, gunakan format YYYY-MM-DD',
    },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter tanggal akhir pekerjaan (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Format tanggal akhir tidak valid, gunakan format YYYY-MM-DD',
    },
  )
  endDate?: string;
}
