import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class LoginRateLimiterService {
  private readonly WINDOW_MS = 60 * 1000; // 1 menit
  private readonly MAX_ATTEMPTS = 5;
  private readonly attempts = new Map<string, number[]>();

  /**
   * Mengecek apakah percobaan login melebihi ambang batas rate limit.
   * Kunci kombinasi: `${ip}:${normalizedEmail}`
   * Maksimal 5 percobaan per menit. Percobaan ke-6 ditolak 429.
   */
  check(ip: string, email: string): void {
    const key = `${ip.trim()}:${email.trim().toLowerCase()}`;
    const now = Date.now();
    const timestamps = (this.attempts.get(key) || []).filter(
      (ts) => now - ts < this.WINDOW_MS,
    );

    if (timestamps.length >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Terlalu banyak percobaan login. Silakan coba lagi setelah 1 menit.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.attempts.set(key, timestamps);
  }

  /**
   * Reset data rate limiter (berguna untuk pengujian)
   */
  clear(): void {
    this.attempts.clear();
  }
}
