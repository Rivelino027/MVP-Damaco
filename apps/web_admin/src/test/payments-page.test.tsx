import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import { useAuthStore } from '@/stores/auth';
import * as apiExpenses from '@/lib/api-expenses';
import type { Expense } from '@/types/expenses';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

const mockExpenseReadyToPay: Expense = {
  id: 'exp-pay-1',
  projectId: 'proj-1',
  taskId: null,
  costCenterId: 'cc-1',
  categoryId: 'cat-1',
  amount: 7500000,
  expenseDate: '2026-11-02',
  vendor: 'PT Vendor Server',
  note: 'Pembelian Router Cisco',
  status: 'siap_dibayar',
  isLargeAmount: true,
  limitAtSubmission: 5000000,
  submittedAt: '2026-11-02T10:00:00Z',
  requesterId: 'usr-worker-1',
  createdAt: '2026-11-02T10:00:00Z',
  updatedAt: '2026-11-02T10:00:00Z',
  requester: { id: 'usr-worker-1', name: 'Andi Staff', email: 'andi@damaco.co.id', department: { id: 'dept-eng', name: 'Engineering' } },
  project: { id: 'proj-1', name: 'Migrasi Datacenter' },
  category: { id: 'cat-1', name: 'Perangkat Keras' },
};

const mockExpensePaid: Expense = {
  ...mockExpenseReadyToPay,
  id: 'exp-paid-1',
  status: 'dibayar',
  payment: {
    id: 'pay-1',
    expenseId: 'exp-paid-1',
    paidBy: 'usr-fin-1',
    paidAt: '2026-11-03T14:30:00Z',
    method: 'transfer',
    referenceNo: 'TRF-20261103-0091',
    amount: 7500000,
    createdAt: '2026-11-03T14:30:00Z',
  },
};

describe('Halaman Pembayaran & Pencairan Kas (PaymentsPage)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: 'token-fin',
      user: {
        id: 'usr-fin-1',
        name: 'Finance Rani',
        email: 'rani@damaco.co.id',
        role: 'finance',
        departmentId: 'dept-fin',
        jobTitle: 'Cashier',
        avatarUrl: null,
        mustChangePassword: false,
        lastLoginAt: null,
      },
    });
  });

  it('menampilkan daftar siap dibayar beserta tombol Catat Bayar dan chip Nominal Besar', async () => {
    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseReadyToPay],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PaymentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('PT Vendor Server')).toBeInTheDocument();
    expect(screen.getByText('Nominal Besar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Catat Bayar/i })).toBeInTheDocument();

    // Verifikasi keamanan data: tidak ada data tarif per jam atau biaya per orang
    expect(screen.queryByText(/ratePerHour/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/costAmount/i)).not.toBeInTheDocument();
  });

  it('berpindah ke tab Riwayat Sudah Dibayar dan menampilkan informasi nomor referensi pembayaran', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiExpenses, 'getExpenses')
      .mockResolvedValueOnce({
        data: [mockExpenseReadyToPay],
        total: 1,
        page: 1,
        limit: 20,
      })
      .mockResolvedValueOnce({
        data: [mockExpensePaid],
        total: 1,
        page: 1,
        limit: 20,
      });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PaymentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const paidTab = await screen.findByRole('button', { name: /Riwayat Sudah Dibayar/i });
    await user.click(paidTab);

    expect(await screen.findByText(/TRF-20261103-0091/)).toBeInTheDocument();
    expect(screen.getByText(/transfer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Catat Bayar/i })).not.toBeInTheDocument();
  });
});
