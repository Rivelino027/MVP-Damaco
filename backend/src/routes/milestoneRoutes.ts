import { Router } from 'express';
import {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
} from '../controllers/milestoneController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getMilestones);
router.get('/:id', getMilestoneById);
router.post('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), createMilestone);
router.put('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updateMilestone);
router.patch('/:id/status', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updateMilestoneStatus);
router.delete('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), deleteMilestone);

export default router;
