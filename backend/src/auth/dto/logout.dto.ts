import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    example: '5f9b4c8a...',
    description: 'Refresh token spesifik yang ingin dicabut saat logout',
  })
  @IsOptional()
  @IsString({ message: 'Refresh token harus berupa teks' })
  refreshToken?: string;
}
