import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import clientRoutes from './routes/clientRoutes';
import taskRoutes from './routes/taskRoutes';
import timesheetRoutes from './routes/timesheetRoutes';
import expenseRoutes from './routes/expenseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import milestoneRoutes from './routes/milestoneRoutes';
import auditRoutes from './routes/auditRoutes';
import notificationRoutes from './routes/notificationRoutes';
import wbsRoutes from './routes/wbsRoutes';

import vendorRoutes from './routes/vendorRoutes';
import poRoutes from './routes/poRoutes';
import paymentRoutes from './routes/paymentRoutes';
import cashFlowRoutes from './routes/cashFlowRoutes';
import reportRoutes from './routes/reportRoutes';
import { globalErrorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/wbs-phases', wbsRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/vendors', vendorRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🚀 DAMACO Project Management Backend API is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'DAMACO Core Financial & Cost Control Engine API' });
});

// Centralized Error Handling Middleware
app.use(globalErrorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Node.js Backend running on http://0.0.0.0:${PORT} (Accessible via localhost and Local IP)`);
});
