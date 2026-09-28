import { Router } from 'express';
import { getProjects, getProjectById, getProjectProfitability, createProject, updateProject, deleteProject } from '../controllers/projectController';
import { authenticateToken, requireRole, requireProfitabilityAccess } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// List projects (Sanitized & filtered according to role)
router.get('/', getProjects);

// Specific profitability endpoint - STRICTLY OWNER ONLY
router.get('/:id/profitability', requireProfitabilityAccess, getProjectProfitability);

// Project details by ID
router.get('/:id', getProjectById);

// Create project - OWNER & PM only
router.post('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), createProject);

// Update project - OWNER & PM only
router.put('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updateProject);

// Delete project - OWNER & PM only
router.delete('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), deleteProject);

export default router;
