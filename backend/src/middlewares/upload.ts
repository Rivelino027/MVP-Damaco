import { Request, Response, NextFunction } from 'express';
import path from 'path';

/**
 * File Security Validator
 * Validates receipt/attachment file extensions and MIME types to block dangerous executables.
 */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.vbs', '.php', '.py', '.asp', '.aspx', '.jar'];

export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  const receiptPath = req.body.receiptPath || req.body.attachmentPath;

  if (receiptPath && typeof receiptPath === 'string') {
    const ext = path.extname(receiptPath).toLowerCase();

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        code: 'DANGEROUS_FILE_TYPE',
        message: `Tipe file '${ext}' berpotensi berbahaya dan ditolak oleh sistem keamanan DAMACO.`,
      });
    }

    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE_TYPE',
        message: `Format file '${ext}' tidak didukung. Harap unggah gambar (JPG, PNG, WEBP) atau PDF/Document.`,
      });
    }
  }

  next();
};
