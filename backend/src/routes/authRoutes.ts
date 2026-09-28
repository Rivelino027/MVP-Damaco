import { Router } from 'express';
import { login, getMe, getUsers, updateUserRole, updateProfile } from '../controllers/authController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { loginRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.get('/me', authenticateToken, getMe);
router.get('/users', authenticateToken, getUsers);
router.put('/profile', authenticateToken, updateProfile);
router.put('/users/:id/role', authenticateToken, requireRole(['OWNER']), updateUserRole);

export default router;
