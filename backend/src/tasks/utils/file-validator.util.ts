import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export interface ValidatedFileResult {
  detectedMimeType: string;
  extension: string;
}

export function validateFileSignatureAndSize(file: {
  buffer?: Buffer;
  size?: number;
  originalname?: string;
  mimetype?: string;
}): ValidatedFileResult {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('File lampiran tidak valid atau kosong');
  }

  const fileSize = file.size ?? file.buffer.length;
  if (
    fileSize > MAX_ATTACHMENT_SIZE ||
    file.buffer.length > MAX_ATTACHMENT_SIZE
  ) {
    throw new BadRequestException('Ukuran file melebihi batas maksimum 10 MB');
  }

  const originalName = file.originalname || '';
  const ext = path.extname(originalName).toLowerCase();
  const buffer = file.buffer;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (ext !== '.png') {
      throw new BadRequestException(
        'Tipe file tidak diizinkan atau signature file tidak valid',
      );
    }
    return { detectedMimeType: 'image/png', extension: '.png' };
  }

  // 2. JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    if (ext !== '.jpg' && ext !== '.jpeg') {
      throw new BadRequestException(
        'Tipe file tidak diizinkan atau signature file tidak valid',
      );
    }
    return { detectedMimeType: 'image/jpeg', extension: ext };
  }

  // 3. WEBP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('utf8', 0, 4) === 'RIFF' &&
    buffer.toString('utf8', 8, 12) === 'WEBP'
  ) {
    if (ext !== '.webp') {
      throw new BadRequestException(
        'Tipe file tidak diizinkan atau signature file tidak valid',
      );
    }
    return { detectedMimeType: 'image/webp', extension: '.webp' };
  }

  // 4. PDF: %PDF-
  if (buffer.length >= 5 && buffer.toString('utf8', 0, 5) === '%PDF-') {
    if (ext !== '.pdf') {
      throw new BadRequestException(
        'Tipe file tidak diizinkan atau signature file tidak valid',
      );
    }
    return { detectedMimeType: 'application/pdf', extension: '.pdf' };
  }

  // 5. Office Open XML (.docx, .xlsx, .pptx): PK\x03\x04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    if (ext === '.docx') {
      return {
        detectedMimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
      };
    }
    if (ext === '.xlsx') {
      return {
        detectedMimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
      };
    }
    if (ext === '.pptx') {
      return {
        detectedMimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        extension: '.pptx',
      };
    }
  }

  // File type or signature did not match any allowed format
  throw new BadRequestException(
    'Tipe file tidak diizinkan atau signature file tidak valid',
  );
}
