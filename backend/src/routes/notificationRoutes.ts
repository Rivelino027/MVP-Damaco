import { Router } from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);

export default router;
