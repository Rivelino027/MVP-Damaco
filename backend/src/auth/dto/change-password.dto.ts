import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Kata sandi lama atau sementara',
    example: 'TempPassword123!',
  })
  @IsNotEmpty({ message: 'Kata sandi lama wajib diisi' })
  @IsString({ message: 'Kata sandi lama harus berupa teks' })
  oldPassword!: string;

  @ApiProperty({
    description: 'Kata sandi baru (minimal 10 karakter)',
    example: 'KataSandiBaru123!@#',
  })
  @IsNotEmpty({ message: 'Kata sandi baru wajib diisi' })
  @IsString({ message: 'Kata sandi baru harus berupa teks' })
  @MinLength(10, { message: 'Kata sandi baru minimal 10 karakter' })
  newPassword!: string;
}
