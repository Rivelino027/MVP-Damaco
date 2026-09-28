import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({ success: true, data: notifications });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return res.json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
