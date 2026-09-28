import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  deletePurchaseOrder,
} from '../controllers/poController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getPurchaseOrders);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getPurchaseOrderById);
router.post('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), createPurchaseOrder);
router.put('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), updatePurchaseOrder);
router.post('/:id/approve', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), approvePurchaseOrder);
router.delete('/:id', requireRole(['OWNER', 'FINANCE']), deletePurchaseOrder);

export default router;
