import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Status aktif pengguna (true untuk aktif, false untuk dinonaktifkan)',
    example: false,
  })
  @IsNotEmpty({ message: 'Status aktif wajib disertakan' })
  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  isActive!: boolean;
}
