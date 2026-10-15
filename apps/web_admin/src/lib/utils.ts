import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ekstraksi pesan error dari respons Axios / backend NestJS
 */
export function extractErrorMessage(error: unknown, fallback = 'Terjadi kesalahan sistem'): string {
  // Cek apakah error memiliki struktur response Axios / NestJS
  const anyError = error as {
    response?: { data?: { message?: string | string[]; error?: string } };
    message?: string;
  };

  if (anyError?.response?.data) {
    const data = anyError.response.data;
    if (data.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      return String(data.message);
    }
    if (data.error) {
      return String(data.error);
    }
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[]; error?: string } | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      return String(data.message);
    }
    if (data?.error) {
      return String(data.error);
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

/**
 * Format tanggal Indonesia (contoh: 15 Okt 2026)
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

/**
 * Format tanggal dan waktu Indonesia (contoh: 15 Okt 2026, 08:30)
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '-';
  }
}

/**
 * Format mata uang Rupiah Indonesia (contoh: Rp 500.000.000)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Daftar substring nama kunci yang dianggap sensitif (case-insensitive, tanpa separator).
 * Nilai pada kunci yang cocok diganti "[disembunyikan]" — kunci TETAP muncul agar
 * auditor tahu field tersebut ada, tanpa membocorkan isinya.
 *
 * Aturan pencocokan: nama kunci di-lowercase lalu semua karakter non-alfanumerik
 * dihapus, kemudian dicek apakah mengandung salah satu pola di bawah.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'tokenhash',
  'refreshtoken',
  'accesstoken',
  'secret',
  'temporarypassword',
  'initialpassword',
  // 'token' terakhir agar tidak menangkap 'tokenhash'/'refreshtoken' dua kali
  'token',
] as const;

/**
 * Mengembalikan true jika nama kunci dianggap sensitif.
 * Pencocokan case-insensitive dan mengabaikan karakter non-alfanumerik.
 */
export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Fungsi murni yang secara rekursif menyamarkan nilai kunci sensitif dalam data audit
 * (beforeData & afterData) dengan string "[disembunyikan]".
 *
 * - Kunci sensitif TETAP ada di output (auditor bisa melihat field-nya ada).
 * - Nilainya diganti "[disembunyikan]" — tidak pernah value asli.
 * - Objek asli TIDAK dimutasi (immutable / pure function).
 * - Aman terhadap null, undefined, primitif, array bersarang, dan objek bersarang.
 */
export function sanitizeAuditData(data: unknown): unknown {
  // Lewatkan null / undefined apa adanya
  if (data === null || data === undefined) {
    return data;
  }

  // Rekursi ke setiap elemen array
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  // Primitif (string, number, boolean, bigint, symbol) langsung dikembalikan
  if (typeof data !== 'object') {
    return data;
  }

  // Objek: buat salinan dangkal baru, proses tiap pasangan kunci-nilai
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Abaikan kunci internal JavaScript yang tidak perlu diserialisasi
    if (key === '__proto__' || key === 'constructor' || typeof value === 'function') {
      continue;
    }

    if (isSensitiveKey(key)) {
      // Nilai sensitif → tampilkan placeholder, bukan nilai asli
      clean[key] = '[disembunyikan]';
    } else {
      // Rekursi ke nilai untuk menangkap objek bersarang
      clean[key] = sanitizeAuditData(value);
    }
  }

  return clean;
}




