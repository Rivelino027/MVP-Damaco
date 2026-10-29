import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveBudgetDto {
  @ApiPropertyOptional({ description: 'Catatan persetujuan (opsional)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
