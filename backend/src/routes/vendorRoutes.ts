import { Router } from 'express';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../controllers/vendorController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getVendors);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getVendorById);
router.post('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), createVendor);
router.put('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), updateVendor);
router.delete('/:id', requireRole(['OWNER', 'FINANCE']), deleteVendor);

export default router;
