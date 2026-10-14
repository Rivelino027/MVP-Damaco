import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Nomor halaman (mulai dari 1)', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Halaman harus berupa angka bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah item per halaman', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter berdasarkan peran', enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Filter peran tidak valid' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID Departemen' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan status aktif (true/false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: 'Filter status aktif harus boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Pencarian nama atau email pengguna' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sertakan akun yang telah di-soft-delete', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean = false;
}
