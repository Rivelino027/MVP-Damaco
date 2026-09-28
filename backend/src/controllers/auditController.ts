import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { action, targetType } = req.query;
    const where: any = {};
    if (action) where.action = String(action);
    if (targetType) where.targetType = String(targetType);

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
