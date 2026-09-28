import { Router } from 'express';
import { getTasks, getTaskById, createTask, updateTask, updateTaskStatus, deleteTask } from '../controllers/taskController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), createTask);
router.put('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updateTask);
router.patch('/:id/status', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM', 'MEMBER']), updateTaskStatus);
router.delete('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), deleteTask);

export default router;
