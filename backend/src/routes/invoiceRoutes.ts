import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  recordPayment,
} from '../controllers/invoiceController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// View invoices - OWNER, FINANCE, PM, CLIENT
router.get('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'CLIENT']), getInvoices);
router.get('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM', 'CLIENT']), getInvoiceById);

// Create, Update, Delete invoice - OWNER, FINANCE, PM
router.post('/', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), createInvoice);
router.put('/:id', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), updateInvoice);
router.post('/:id/send', requireRole(['OWNER', 'FINANCE', 'PROJECT_MANAGER', 'PM']), sendInvoice);
router.patch('/:id/status', requireRole(['OWNER', 'FINANCE']), updateInvoiceStatus);
router.delete('/:id', requireRole(['OWNER', 'FINANCE']), deleteInvoice);

// Record payment - OWNER & FINANCE only
router.post('/payments', requireRole(['OWNER', 'FINANCE']), recordPayment);

export default router;
