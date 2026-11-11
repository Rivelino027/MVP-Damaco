import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    const envUploadDir = process.env.UPLOAD_DIR;
    this.uploadDir = envUploadDir
      ? path.isAbsolute(envUploadDir)
        ? envUploadDir
        : path.resolve(process.cwd(), envUploadDir)
      : path.resolve(process.cwd(), 'uploads');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Menyimpan file dengan nama acak (UUID) tanpa ekstensi asli yang bisa dieksekusi.
   */
  async saveFile(buffer: Buffer, _originalFilename?: string): Promise<string> {
    void _originalFilename;
    const storedFileName = randomUUID();
    const targetPath = path.join(this.uploadDir, storedFileName);
    await fs.promises.writeFile(targetPath, buffer);
    return storedFileName;
  }

  getFilePath(storedFileName: string): string {
    return path.join(this.uploadDir, storedFileName);
  }

  async fileExists(storedFileName: string): Promise<boolean> {
    const targetPath = this.getFilePath(storedFileName);
    try {
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(storedFileName: string): Promise<void> {
    const targetPath = this.getFilePath(storedFileName);
    try {
      const exists = await this.fileExists(storedFileName);
      if (exists) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err) {
      this.logger.error(
        `Gagal menghapus file di storage: ${storedFileName}`,
        err,
      );
    }
  }
}
