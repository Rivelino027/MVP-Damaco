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
 * Membersihkan data audit log (beforeData & afterData) secara rekursif
 * untuk mencegah tampilan kredensial atau informasi rahasia di UI (defense in depth)
 */
export function sanitizeAuditData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const sensitiveKeyPatterns = [
    'password',
    'passwordhash',
    'password_hash',
    'token',
    'tokenhash',
    'token_hash',
    'refreshtoken',
    'refresh_token',
    'rawtoken',
    'initialpassword',
    'initial_password',
    'secret',
  ];

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === 'constructor' || typeof value === 'function') {
      continue;
    }

    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSensitive = sensitiveKeyPatterns.some(
      (pattern) =>
        normalizedKey === pattern.replace(/[^a-z0-9]/g, '') ||
        normalizedKey.includes('password') ||
        normalizedKey.includes('token') ||
        normalizedKey.includes('secret') ||
        normalizedKey.includes('hash'),
    );

    if (isSensitive) {
      continue;
    }

    clean[key] = sanitizeAuditData(value);
  }

  return clean;
}



