import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Audit logs are visible to OWNER, PM, and FINANCE
router.get('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM', 'FINANCE']), getAuditLogs);

export default router;
