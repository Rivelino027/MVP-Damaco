import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({ description: 'ID Pengguna yang akan ditambahkan ke proyek' })
  @IsNotEmpty({ message: 'ID pengguna wajib diisi' })
  @IsUUID('4', { message: 'ID pengguna harus berupa UUID yang valid' })
  userId!: string;
}
