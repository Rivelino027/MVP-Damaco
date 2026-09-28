import { Router } from 'express';
import { getPhases, getPhaseById, createPhase, updatePhase, deletePhase } from '../controllers/wbsController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getPhases);
router.get('/:id', getPhaseById);
router.post('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), createPhase);
router.put('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updatePhase);
router.delete('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), deletePhase);

export default router;
