import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nama lengkap pengguna',
    example: 'Ahmad Dahlan',
  })
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  @IsString({ message: 'Nama harus berupa string' })
  name!: string;

  @ApiProperty({
    description: 'Alamat email pengguna (akan dinormalisasi huruf kecil)',
    example: 'ahmad@perusahaan.com',
  })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @ApiProperty({
    description: 'Peran akun (satu akun satu peran)',
    enum: Role,
    example: Role.pengguna,
  })
  @IsNotEmpty({ message: 'Peran wajib diisi' })
  @IsEnum(Role, {
    message:
      'Peran harus salah satu dari: pengguna, admin, finance, super_admin',
  })
  role!: Role;

  @ApiPropertyOptional({
    description:
      'ID Departemen (wajib untuk peran pengguna dan admin; opsional untuk finance dan super_admin)',
    example: 'uuid-departemen',
  })
  @IsOptional()
  @IsString({ message: 'ID Departemen harus berupa string UUID' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Jabatan pekerjaan pengguna',
    example: 'Senior Software Engineer',
  })
  @IsOptional()
  @IsString({ message: 'Jabatan harus berupa string' })
  jobTitle?: string;

  @ApiPropertyOptional({
    description:
      'Password awal. Jika dikosongkan, sistem akan mengacak password secara aman dan mengembalikannya satu kali.',
    example: 'PasswordKuat123!',
  })
  @IsOptional()
  @IsString({ message: 'Kata sandi harus berupa string' })
  @MinLength(8, { message: 'Kata sandi minimal 8 karakter' })
  password?: string;
}
