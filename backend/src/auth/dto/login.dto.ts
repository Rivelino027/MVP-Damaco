import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@perusahaan.com',
    description: 'Email pengguna yang terdaftar',
  })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @ApiProperty({
    example: 'rahasia123',
    description: 'Kata sandi akun',
  })
  @IsNotEmpty({ message: 'Kata sandi wajib diisi' })
  @IsString({ message: 'Kata sandi harus berupa teks' })
  @MinLength(1, { message: 'Kata sandi wajib diisi' })
  password!: string;
}
