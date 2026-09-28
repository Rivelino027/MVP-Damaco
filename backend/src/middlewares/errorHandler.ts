import { Request, Response, NextFunction } from 'express';

/**
 * Global Error Handling Middleware
 * Prevents stack trace, database credential, or internal path leakage in API responses.
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[DAMACO API ERROR] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  
  // Custom structured response
  return res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 
      ? 'Terjadi kesalahan sistem internal. Permintaan Anda gagal diproses secara aman.' 
      : (err.message || 'Permintaan gagal.'),
  });
};
