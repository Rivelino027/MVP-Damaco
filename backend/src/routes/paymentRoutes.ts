import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  deletePayment,
} from '../controllers/paymentController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'CLIENT']), getPayments);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'CLIENT']), getPaymentById);
router.post('/', requireRole(['OWNER', 'FINANCE']), createPayment);
router.delete('/:id', requireRole(['OWNER', 'FINANCE']), deletePayment);

export default router;
