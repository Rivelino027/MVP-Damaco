import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectTimesheetDto {
  @ApiProperty({
    description: 'Alasan penolakan timesheet',
    example: 'Catatan jam kerja hari Rabu tidak sesuai dengan progres task',
  })
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @IsString({ message: 'Alasan penolakan harus berupa string' })
  reason!: string;
}
