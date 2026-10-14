import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: '5f9b4c8a...',
    description: 'Refresh token yang masih aktif untuk dirotasi',
  })
  @IsNotEmpty({ message: 'Refresh token wajib diisi' })
  @IsString({ message: 'Refresh token harus berupa teks' })
  refreshToken!: string;
}
