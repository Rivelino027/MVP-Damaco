import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getProjectPerformanceReport,
  getBudgetVsActualReport,
  getTimesheetReport,
  getExpenseReport,
  getInvoiceAgingReport,
  getPaymentReport,
  getPoReport,
  exportReportData,
} from '../controllers/reportController';

const router = Router();

router.use(authenticateToken);

router.get('/project-performance', getProjectPerformanceReport);
router.get('/budget-vs-actual', getBudgetVsActualReport);
router.get('/timesheets', getTimesheetReport);
router.get('/expenses', getExpenseReport);
router.get('/invoices-aging', getInvoiceAgingReport);
router.get('/payments', getPaymentReport);
router.get('/purchase-orders', getPoReport);
router.get('/export/:reportType', exportReportData);

export default router;
