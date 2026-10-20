import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Membuat task baru' })
  @ApiResponse({ status: 201, description: 'Task berhasil dibuat.' })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid atau melanggar aturan bisnis.',
  })
  @ApiResponse({ status: 403, description: 'Peran tidak memiliki izin.' })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.create(dto, user, ip);
  }

  @Get('my-tasks')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({
    summary: 'Melihat task yang ditugaskan kepada pengguna login',
  })
  @ApiResponse({ status: 200, description: 'Daftar task berhasil dimuat.' })
  async findMyTasks(
    @Query() query: TaskQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findMyTasks(query, user);
  }

  @Get()
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat daftar task sesuai cakupan peran' })
  @ApiResponse({ status: 200, description: 'Daftar task berhasil dimuat.' })
  async findAll(
    @Query() query: TaskQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat detail task' })
  @ApiResponse({ status: 200, description: 'Detail task ditemukan.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui data task' })
  @ApiResponse({ status: 200, description: 'Task berhasil diperbarui.' })
  @ApiResponse({ status: 400, description: 'Data tidak valid.' })
  @ApiResponse({ status: 403, description: 'Peran tidak memiliki izin.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.update(id, dto, user, ip);
  }

  @Patch(':id/status')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui status task' })
  @ApiResponse({ status: 200, description: 'Status task berhasil diperbarui.' })
  @ApiResponse({ status: 400, description: 'Status tidak valid.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.updateStatus(id, dto, user, ip);
  }

  @Delete(':id')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menghapus task secara soft-delete' })
  @ApiResponse({ status: 200, description: 'Task berhasil dihapus.' })
  @ApiResponse({
    status: 400,
    description: 'Task memiliki timesheet entry atau pengeluaran terkait.',
  })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.remove(id, user, ip);
  }

  // ─────────────────────────────────────────────────────────────
  // CHECKLIST
  // ─────────────────────────────────────────────────────────────

  @Post(':id/checklists')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menambahkan item checklist ke task' })
  @ApiResponse({ status: 201, description: 'Item checklist berhasil dibuat.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async createChecklist(
    @Param('id') taskId: string,
    @Body() dto: CreateChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.createChecklist(taskId, dto, user, ip);
  }

  @Patch(':id/checklists/:checklistId')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Memperbarui item checklist (centang/teks)' })
  @ApiResponse({
    status: 200,
    description: 'Item checklist berhasil diperbarui.',
  })
  @ApiResponse({ status: 404, description: 'Item checklist tidak ditemukan.' })
  async updateChecklist(
    @Param('id') taskId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: UpdateChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.updateChecklist(
      taskId,
      checklistId,
      dto,
      user,
      ip,
    );
  }

  @Delete(':id/checklists/:checklistId')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menghapus item checklist' })
  @ApiResponse({ status: 200, description: 'Item checklist berhasil dihapus.' })
  @ApiResponse({ status: 404, description: 'Item checklist tidak ditemukan.' })
  async removeChecklist(
    @Param('id') taskId: string,
    @Param('checklistId') checklistId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.removeChecklist(taskId, checklistId, user, ip);
  }

  // ─────────────────────────────────────────────────────────────
  // KOMENTAR
  // ─────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menambahkan komentar ke task' })
  @ApiResponse({ status: 201, description: 'Komentar berhasil dibuat.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async createComment(
    @Param('id') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.createComment(taskId, dto, user, ip);
  }

  @Delete(':id/comments/:commentId')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menghapus komentar (penulis atau admin)' })
  @ApiResponse({ status: 200, description: 'Komentar berhasil dihapus.' })
  @ApiResponse({ status: 403, description: 'Bukan penulis atau admin.' })
  @ApiResponse({ status: 404, description: 'Komentar tidak ditemukan.' })
  async removeComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.removeComment(taskId, commentId, user, ip);
  }

  // ─────────────────────────────────────────────────────────────
  // LAMPIRAN (ATTACHMENTS)
  // ─────────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Mengunggah file lampiran untuk task' })
  @ApiResponse({ status: 201, description: 'Lampiran berhasil diunggah.' })
  @ApiResponse({
    status: 400,
    description:
      'File tidak valid, melebihi 10 MB, atau signature tidak sesuai.',
  })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async uploadAttachment(
    @Param('id') taskId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.uploadAttachment(taskId, file, user, ip);
  }

  @Get(':id/attachments')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat daftar lampiran task' })
  @ApiResponse({ status: 200, description: 'Daftar lampiran berhasil dimuat.' })
  @ApiResponse({ status: 404, description: 'Task tidak ditemukan.' })
  async getAttachments(
    @Param('id') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getAttachments(taskId, user);
  }

  @Get(':id/attachments/:attachmentId/download')
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Mengunduh file lampiran' })
  @ApiResponse({ status: 200, description: 'File lampiran berhasil diunduh.' })
  @ApiResponse({ status: 404, description: 'Lampiran tidak ditemukan.' })
  async downloadAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { filePath, attachment } =
      await this.tasksService.getAttachmentForDownload(
        taskId,
        attachmentId,
        user,
      );

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles(Role.pengguna, Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menghapus lampiran task' })
  @ApiResponse({ status: 200, description: 'Lampiran berhasil dihapus.' })
  @ApiResponse({ status: 403, description: 'Bukan pengunggah atau admin.' })
  @ApiResponse({ status: 404, description: 'Lampiran tidak ditemukan.' })
  async removeAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.tasksService.removeAttachment(taskId, attachmentId, user, ip);
  }
}
