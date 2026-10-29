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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ConfirmLimitDto } from './dto/confirm-limit.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ProposeLimitDto } from './dto/propose-limit.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ─────────────────────────────────────────────────────────────
  // BATAS NOMINAL BESAR (SEBELUM /:id)
  // ─────────────────────────────────────────────────────────────

  @Get('limit/current')
  @ApiOperation({
    summary: 'Mendapatkan batas Nominal Besar yang saat ini berlaku',
  })
  @ApiResponse({ status: 200, description: 'Batas yang berlaku saat ini' })
  async getCurrentLimit() {
    return this.expensesService.getCurrentLimit();
  }

  @Get('limit/history')
  @ApiOperation({
    summary: 'Mendapatkan riwayat perubahan batas Nominal Besar',
  })
  @ApiResponse({ status: 200, description: 'Daftar riwayat perubahan batas' })
  async getLimitHistory() {
    return this.expensesService.getLimitHistory();
  }

  @Post('limit/propose')
  @Roles(Role.admin, Role.finance)
  @ApiOperation({
    summary: 'Mengusulkan perubahan batas Nominal Besar (Admin / Finance)',
  })
  @ApiResponse({ status: 201, description: 'Usulan batas berhasil dibuat' })
  async proposeLimit(
    @Body() dto: ProposeLimitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.proposeLimit(dto, user);
  }

  @Post('limit/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.finance)
  @ApiOperation({
    summary:
      'Konfirmasi / penolakan usulan batas Nominal Besar (orang dan peran berbeda dari pengusul)',
  })
  @ApiResponse({ status: 200, description: 'Status batas berhasil diperbarui' })
  async confirmLimit(
    @Param('id') id: string,
    @Body() dto: ConfirmLimitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.confirmLimit(id, dto, user);
  }

  // ─────────────────────────────────────────────────────────────
  // PENGELUARAN (EXPENSES)
  // ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Mendapatkan daftar pengeluaran sesuai scope peran',
  })
  @ApiResponse({ status: 200, description: 'Daftar pengeluaran berpaginasi' })
  async findMany(
    @Query() query: ExpenseQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.findMany(query, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Membuat pengeluaran baru (draft atau ajukan langsung)',
  })
  @ApiResponse({ status: 201, description: 'Pengeluaran berhasil dibuat' })
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Mendapatkan detail pengeluaran beserta riwayat persetujuan',
  })
  @ApiResponse({ status: 200, description: 'Detail pengeluaran' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengubah pengeluaran (hanya draft atau ditolak)' })
  @ApiResponse({ status: 200, description: 'Pengeluaran berhasil diperbarui' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus pengeluaran (hanya draft atau ditolak)' })
  @ApiResponse({ status: 200, description: 'Pengeluaran berhasil dihapus' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.delete(id, user);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mengajukan pengeluaran draft / ditolak' })
  @ApiResponse({ status: 200, description: 'Pengeluaran berhasil diajukan' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.submit(id, user);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Admin menyetujui pengeluaran (langkah 1)' })
  @ApiResponse({ status: 200, description: 'Pengeluaran disetujui Admin' })
  async approveAdmin(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.approveAdmin(id, user);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.finance)
  @ApiOperation({ summary: 'Finance memverifikasi pengeluaran (langkah 2)' })
  @ApiResponse({ status: 200, description: 'Pengeluaran diverifikasi Finance' })
  async verifyFinance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.verifyFinance(id, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.admin, Role.finance)
  @ApiOperation({ summary: 'Menolak pengeluaran (Admin atau Finance)' })
  @ApiResponse({ status: 200, description: 'Pengeluaran berhasil ditolak' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.reject(id, dto, user);
  }

  @Post(':id/payment')
  @Roles(Role.finance)
  @ApiOperation({
    summary: 'Finance mencatat pembayaran pengeluaran siap_dibayar',
  })
  @ApiResponse({ status: 201, description: 'Pembayaran berhasil dicatat' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.recordPayment(id, dto, user);
  }

  // ─────────────────────────────────────────────────────────────
  // LAMPIRAN NOTA (EXPENSE ATTACHMENTS)
  // ─────────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Mengunggah nota untuk pengeluaran (hanya pengaju, status draft atau ditolak)',
  })
  @ApiResponse({ status: 201, description: 'Nota berhasil diunggah.' })
  @ApiResponse({
    status: 400,
    description:
      'File tidak valid, melebihi 10 MB, atau signature tidak sesuai.',
  })
  @ApiResponse({ status: 403, description: 'Bukan pengaju atau status tidak mengizinkan.' })
  @ApiResponse({ status: 404, description: 'Pengeluaran tidak ditemukan.' })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.expensesService.uploadAttachment(id, file, user, ip);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'Melihat daftar nota pengeluaran' })
  @ApiResponse({ status: 200, description: 'Daftar nota berhasil dimuat.' })
  @ApiResponse({ status: 404, description: 'Pengeluaran tidak ditemukan.' })
  async getAttachments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.getAttachments(id, user);
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Mengunduh file nota pengeluaran (terautentikasi)' })
  @ApiResponse({ status: 200, description: 'File nota berhasil diunduh.' })
  @ApiResponse({ status: 403, description: 'Tidak memiliki akses unduh.' })
  @ApiResponse({ status: 404, description: 'Lampiran tidak ditemukan.' })
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { filePath, attachment } =
      await this.expensesService.getAttachmentForDownload(id, attachmentId, user);

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
  @ApiOperation({ summary: 'Menghapus nota pengeluaran (hanya pengaju, status draft atau ditolak)' })
  @ApiResponse({ status: 200, description: 'Nota berhasil dihapus.' })
  @ApiResponse({ status: 403, description: 'Bukan pengaju atau status tidak mengizinkan.' })
  @ApiResponse({ status: 404, description: 'Lampiran tidak ditemukan.' })
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.expensesService.removeAttachment(id, attachmentId, user, ip);
  }
}
