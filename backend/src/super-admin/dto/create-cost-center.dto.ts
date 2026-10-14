import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({
    description: 'Kode unik cost center',
    example: 'CC-ENG-001',
  })
  @IsNotEmpty({ message: 'Kode cost center wajib diisi' })
  @IsString({ message: 'Kode cost center harus berupa string' })
  code!: string;

  @ApiProperty({
    description: 'Nama cost center',
    example: 'Engineering Software Development',
  })
  @IsNotEmpty({ message: 'Nama cost center wajib diisi' })
  @IsString({ message: 'Nama cost center harus berupa string' })
  name!: string;

  @ApiProperty({
    description: 'ID Departemen pemilik cost center',
    example: 'uuid-departemen',
  })
  @IsNotEmpty({ message: 'Departemen wajib diisi' })
  @IsString({ message: 'ID Departemen harus berupa string UUID' })
  departmentId!: string;
}
