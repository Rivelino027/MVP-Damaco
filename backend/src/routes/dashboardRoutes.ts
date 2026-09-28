import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getDashboardSummary);
router.get('/summary', getDashboardSummary);

export default router;
