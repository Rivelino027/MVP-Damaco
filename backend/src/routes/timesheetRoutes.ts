import { Router } from 'express';
import { getTimesheets, getTimesheetById, createTimesheet, updateTimesheet, deleteTimesheet } from '../controllers/timesheetController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// View timesheets - OWNER, FINANCE, PM, MEMBER (Client forbidden)
router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getTimesheets);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getTimesheetById);

// Create timesheet - OWNER, FINANCE, PM, MEMBER (Client forbidden)
router.post('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), createTimesheet);

// Edit timesheet - OWNER, FINANCE, PM, MEMBER
router.put('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), updateTimesheet);

// Delete timesheet - OWNER, FINANCE, PM, MEMBER
router.delete('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), deleteTimesheet);

export default router;
