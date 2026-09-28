import { Router } from 'express';
import { getCashFlow } from '../controllers/cashFlowController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'CLIENT']), getCashFlow);

export default router;
