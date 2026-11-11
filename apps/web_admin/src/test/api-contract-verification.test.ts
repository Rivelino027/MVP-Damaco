/**
 * LANGKAH 8: Verifikasi alamat endpoint API
 * Memastikan fungsi API di web memanggil alamat yang tepat sesuai backend.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiLimits from '@/lib/api-limits';
import * as apiExpenses from '@/lib/api-expenses';
import * as apiBudgets from '@/lib/api-budgets';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/lib/api';
// Cast through unknown to avoid TS overlap error on AxiosInstance vs vi.fn mock shape
const mockedApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('Verifikasi Alamat Endpoint API (Langkah 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: null });
    mockedApi.post.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- api-limits ---
  describe('api-limits: alamat endpoint batas Nominal Besar', () => {
    it('getCurrentLimit memanggil GET /expenses/limit/current', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { id: 'lim-1', amount: '5000000' } });
      await apiLimits.getCurrentLimit();
      expect(mockedApi.get).toHaveBeenCalledWith('/expenses/limit/current');
    });

    it('getLimitHistory memanggil GET /expenses/limit/history', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });
      await apiLimits.getLimitHistory();
      expect(mockedApi.get).toHaveBeenCalledWith('/expenses/limit/history');
    });

    it('proposeLimit memanggil POST /expenses/limit/propose', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'req-1' } });
      await apiLimits.proposeLimit({ newAmount: 10000000, reason: 'Kebutuhan operasional' });
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/expenses/limit/propose',
        { newAmount: 10000000, reason: 'Kebutuhan operasional' },
      );
    });

    it('confirmLimit memanggil POST /expenses/limit/:id/confirm', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'req-1' } });
      await apiLimits.confirmLimit('req-1', { decision: 'berlaku' });
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/expenses/limit/req-1/confirm',
        { decision: 'berlaku' },
      );
    });
  });

  // --- api-expenses ---
  describe('api-expenses: alamat endpoint pengeluaran', () => {
    it('getExpenses memanggil GET /expenses', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });
      await apiExpenses.getExpenses({ limit: 20 });
      expect(mockedApi.get).toHaveBeenCalledWith('/expenses', { params: { limit: 20 } });
    });

    it('getExpenseById memanggil GET /expenses/:id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { id: 'exp-1' } });
      await apiExpenses.getExpenseById('exp-1');
      expect(mockedApi.get).toHaveBeenCalledWith('/expenses/exp-1');
    });

    it('approveExpenseAdmin memanggil POST /expenses/:id/approve', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'exp-1', status: 'menunggu_finance' } });
      await apiExpenses.approveExpenseAdmin('exp-1');
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-1/approve');
    });

    it('verifyExpenseFinance memanggil POST /expenses/:id/verify', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'exp-1', status: 'siap_dibayar' } });
      await apiExpenses.verifyExpenseFinance('exp-1');
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-1/verify');
    });

    it('rejectExpenseAdmin memanggil POST /expenses/:id/reject dengan alasan', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'exp-1', status: 'ditolak' } });
      await apiExpenses.rejectExpenseAdmin('exp-1', { reason: 'Bukti tidak lengkap' });
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-1/reject', { reason: 'Bukti tidak lengkap' });
    });

    it('rejectExpenseFinance memanggil POST /expenses/:id/reject dengan alasan', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'exp-1', status: 'ditolak' } });
      await apiExpenses.rejectExpenseFinance('exp-1', { reason: 'Nominal tidak sesuai' });
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-1/reject', { reason: 'Nominal tidak sesuai' });
    });

    it('recordPayment memanggil POST /expenses/:id/payment', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'exp-1', status: 'dibayar' } });
      await apiExpenses.recordPayment('exp-1', { method: 'transfer', referenceNo: 'TRF-001', paidAt: '2026-11-01' });
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-1/payment', { method: 'transfer', referenceNo: 'TRF-001', paidAt: '2026-11-01' });
    });
  });

  // --- api-budgets ---
  describe('api-budgets: alamat endpoint anggaran', () => {
    it('getBudgetRequests memanggil GET /budget-requests', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });
      await apiBudgets.getBudgetRequests({ status: 'menunggu_finance' });
      expect(mockedApi.get).toHaveBeenCalledWith('/budget-requests', { params: { status: 'menunggu_finance' } });
    });

    it('getBudgetRequestById memanggil GET /budget-requests/:id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { id: 'req-1' } });
      await apiBudgets.getBudgetRequestById('req-1');
      expect(mockedApi.get).toHaveBeenCalledWith('/budget-requests/req-1');
    });

    it('getActiveBudget memanggil GET /projects/:projectId/budget/active', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: null });
      await apiBudgets.getActiveBudget('proj-1');
      expect(mockedApi.get).toHaveBeenCalledWith('/projects/proj-1/budget/active');
    });

    it('getBudgetSummary memanggil GET /projects/:projectId/budget/summary', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { projectId: 'proj-1', totalBudgeted: 0 } });
      await apiBudgets.getBudgetSummary('proj-1');
      expect(mockedApi.get).toHaveBeenCalledWith('/projects/proj-1/budget/summary');
    });

    it('approveBudgetFinance memanggil POST /budget-requests/:id/approve', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'req-1', status: 'menunggu_super_admin' } });
      await apiBudgets.approveBudgetFinance('req-1');
      expect(mockedApi.post).toHaveBeenCalledWith('/budget-requests/req-1/approve', {});
    });

    it('approveBudgetSuperAdmin memanggil POST /budget-requests/:id/approve', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'req-1', status: 'disetujui' } });
      await apiBudgets.approveBudgetSuperAdmin('req-1');
      expect(mockedApi.post).toHaveBeenCalledWith('/budget-requests/req-1/approve', {});
    });

    it('rejectBudgetRequest memanggil POST /budget-requests/:id/reject dengan alasan', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'req-1', status: 'ditolak' } });
      await apiBudgets.rejectBudgetRequest('req-1', { reason: 'Tidak sesuai prioritas' });
      expect(mockedApi.post).toHaveBeenCalledWith('/budget-requests/req-1/reject', { reason: 'Tidak sesuai prioritas' });
    });
  });
});
