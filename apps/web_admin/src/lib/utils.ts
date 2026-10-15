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

