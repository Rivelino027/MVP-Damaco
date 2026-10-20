import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProjectTypeDto {
  @ApiProperty({
    description: 'Nama jenis proyek (unik)',
    example: 'Pengembangan Web',
  })
  @IsNotEmpty({ message: 'Nama jenis proyek wajib diisi' })
  @IsString({ message: 'Nama jenis proyek harus berupa string' })
  name!: string;
}
