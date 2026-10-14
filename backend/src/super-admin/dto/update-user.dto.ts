import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nama lengkap pengguna' })
  @IsOptional()
  @IsString({ message: 'Nama harus berupa string' })
  name?: string;

  @ApiPropertyOptional({ description: 'Alamat email pengguna' })
  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Peran akun (satu akun satu peran)',
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role, {
    message: 'Peran harus salah satu dari: pengguna, admin, finance, super_admin',
  })
  role?: Role;

  @ApiPropertyOptional({ description: 'ID Departemen pengguna' })
  @IsOptional()
  @IsString({ message: 'ID Departemen harus berupa string' })
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Jabatan pekerjaan' })
  @IsOptional()
  @IsString({ message: 'Jabatan harus berupa string' })
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Status aktif akun pengguna' })
  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus bernilai boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Kata sandi baru (opsional jika ingin mengganti langsung)',
  })
  @IsOptional()
  @IsString({ message: 'Kata sandi harus berupa string' })
  @MinLength(8, { message: 'Kata sandi minimal 8 karakter' })
  password?: string;
}
