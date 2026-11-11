import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    description: 'Status baru task: belum_mulai, dikerjakan, review, selesai',
  })
  @IsNotEmpty({ message: 'Status task wajib diisi' })
  @IsEnum(TaskStatus, { message: 'Status task tidak valid' })
  status!: TaskStatus;
}
