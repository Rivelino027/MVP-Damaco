import { Router } from 'express';
import { getExpenses, getExpenseById, createExpense, updateExpense, updateExpenseStatus, deleteExpense } from '../controllers/expenseController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { validateFileUpload } from '../middlewares/upload';

const router = Router();

router.use(authenticateToken);

// View expenses - OWNER, FINANCE, PM, MEMBER (Client forbidden)
router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getExpenses);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), getExpenseById);

// Submit expense - OWNER, FINANCE, PM, MEMBER (File security validated)
router.post('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), validateFileUpload, createExpense);

// Edit expense - OWNER, FINANCE, PM, MEMBER (File security validated)
router.put('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), validateFileUpload, updateExpense);

// Approve/Reject expense - OWNER, PM, FINANCE only (Member forbidden)
router.patch('/:id/status', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), updateExpenseStatus);

// Delete expense - OWNER, FINANCE, PM, MEMBER
router.delete('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'MEMBER']), deleteExpense);

export default router;
