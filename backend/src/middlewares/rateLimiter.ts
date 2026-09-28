import { Request, Response, NextFunction } from 'express';

interface LoginAttempt {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const MAX_ATTEMPTS = 10; // Max 10 failed login attempts per IP per window

/**
 * Rate Limiter for Login Endpoint
 * Prevents brute force login attacks.
 */
export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = loginAttempts.get(clientIp);

  if (record) {
    if (now > record.resetTime) {
      // Window expired, reset counter
      loginAttempts.set(clientIp, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    if (record.count >= MAX_ATTEMPTS) {
      const remainingSec = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: `Batas percobaan login terlampaui. Silakan coba kembali dalam ${remainingSec} detik.`,
      });
    }

    record.count++;
  } else {
    loginAttempts.set(clientIp, { count: 1, resetTime: now + WINDOW_MS });
  }

  next();
};
