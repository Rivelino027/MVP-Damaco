import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'OWNER' | 'PROJECT_MANAGER' | 'PM' | 'MEMBER' | 'FINANCE' | 'CLIENT';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    hourlyRate?: number;
    clientId?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Akses ditolak. Token autentikasi tidak ditemukan.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-key-mp-agile-cost-2026';
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token tidak valid atau telah kadaluarsa.',
    });
  }
};

/**
 * Require one of the specified roles
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Pengguna belum terautentikasi.',
      });
    }

    const normalizedUserRole = req.user.role === 'PM' ? 'PROJECT_MANAGER' : req.user.role;
    const normalizedAllowedRoles = allowedRoles.map((r) => (r === 'PM' ? 'PROJECT_MANAGER' : r));

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Hak akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk melakukan tindakan ini.`,
      });
    }

    next();
  };
};

/**
 * Strict Profitability & Margin Guard (OWNER only)
 */
export const requireProfitabilityAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Belum terautentikasi' });
  }

  const role = req.user.role;
  if (role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Informasi profitabilitas dan margin sensitif hanya dapat diakses oleh OWNER.',
    });
  }

  next();
};

/**
 * Sensitive Financial Rate Guard (Blocks MEMBER and CLIENT from hourly rates / salaries)
 */
export const requireFinancialRateAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Belum terautentikasi' });
  }

  const role = req.user.role === 'PM' ? 'PROJECT_MANAGER' : req.user.role;
  if (role === 'MEMBER' || role === 'CLIENT') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Peran Anda tidak memiliki izin untuk melihat data tarif/gaji internal.',
    });
  }

  next();
};
