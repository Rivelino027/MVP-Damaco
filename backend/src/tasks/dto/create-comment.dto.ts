import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Isi komentar pada task' })
  @IsString({ message: 'Isi komentar harus berupa string' })
  @IsNotEmpty({ message: 'Isi komentar wajib diisi' })
  @MaxLength(2000, { message: 'Isi komentar maksimal 2000 karakter' })
  body!: string;
}
