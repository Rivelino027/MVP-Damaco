export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface StorageService {
  /**
   * Menyimpan buffer file ke storage lokal dengan nama unik (UUID) tanpa ekstensi asli.
   * Mengembalikan nama file tersimpan (storedFileName).
   */
  saveFile(buffer: Buffer, originalFilename: string): Promise<string>;

  /**
   * Mendapatkan path lengkap file di disk.
   */
  getFilePath(storedFileName: string): string;

  /**
   * Menghapus file dari storage jika ada.
   */
  deleteFile(storedFileName: string): Promise<void>;

  /**
   * Memeriksa apakah file ada di storage.
   */
  fileExists(storedFileName: string): Promise<boolean>;
}
