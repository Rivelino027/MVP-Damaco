import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTimesheetEntryDto } from './create-timesheet-entry.dto';

export class UpdateTimesheetDto {
  @ApiProperty({
    description: 'Daftar entry pekerjaan harian dalam minggu ini',
    type: [CreateTimesheetEntryDto],
  })
  @IsArray({ message: 'Entries harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTimesheetEntryDto)
  entries!: CreateTimesheetEntryDto[];
}
