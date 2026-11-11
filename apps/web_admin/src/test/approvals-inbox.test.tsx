import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ApprovalsInboxPage from '@/pages/approvals/ApprovalsInboxPage';
import { useAuthStore } from '@/stores/auth';
import * as apiExpenses from '@/lib/api-expenses';
import * as apiTimesheets from '@/lib/api-timesheets';
import * as apiBudgets from '@/lib/api-budgets';
import type { User } from '@/types';
import type { Expense } from '@/types/expenses';
import type { Timesheet } from '@/types/timesheets';
import type { BudgetRequest } from '@/types/budgets';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function mockUser(role: User['role'], id = 'usr-1', name = 'Test User'): User {
  return {
    id,
    name,
    email: `${role}@damaco.co.id`,
    role,
    departmentId: 'dept-eng',
    jobTitle: 'Lead',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

const mockExpenseWaitingAdmin: Expense = {
  id: 'exp-1',
  projectId: 'proj-1',
  categoryId: 'cat-1',
  amount: 2500000,
  expenseDate: '2026-11-01',
  vendor: 'PT Vendor ABC',
  note: 'Server Cloud',
  status: 'menunggu_admin',
  isLargeAmount: false,
  limitAtSubmission: 5000000,
  taskId: null,
  costCenterId: 'cc-1',
  submittedAt: '2026-11-01T10:00:00Z',
  requesterId: 'usr-other',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  requester: { id: 'usr-other', name: 'Budi Pekerja', email: 'budi@damaco.co.id', department: { id: 'dept-eng', name: 'Engineering' } },
  project: { id: 'proj-1', name: 'ERP Core' },
  category: { id: 'cat-1', name: 'Software License' },
};

const mockExpenseOwnAdmin: Expense = {
  ...mockExpenseWaitingAdmin,
  id: 'exp-own',
  requesterId: 'usr-admin-1',
  requester: { id: 'usr-admin-1', name: 'Admin Doni', email: 'doni@damaco.co.id', department: { id: 'dept-eng', name: 'Engineering' } },
};

const mockTimesheetWaitingAdmin: Timesheet = {
  id: 'ts-1',
  userId: 'usr-worker-1',
  weekStart: '2026-11-02',
  status: 'menunggu_admin',
  totalHours: 40,
  createdAt: '2026-11-06T17:00:00Z',
  updatedAt: '2026-11-06T17:00:00Z',
  user: {
    id: 'usr-worker-1',
    name: 'Staff Anton',
    email: 'anton@damaco.co.id',
    department: { id: 'dept-eng', name: 'Engineering' },
  },
  entries: [],
};

const mockTimesheetOwnAdmin: Timesheet = {
  ...mockTimesheetWaitingAdmin,
  id: 'ts-own',
  userId: 'usr-admin-1',
  user: {
    id: 'usr-admin-1',
    name: 'Admin Doni',
    email: 'doni@damaco.co.id',
    department: { id: 'dept-eng', name: 'Engineering' },
  },
};

const mockBudgetWaitingFinance: BudgetRequest = {
  id: 'br-1',
  projectId: 'proj-1',
  requestedById: 'usr-admin-1',
  type: 'awal',
  totalAmount: 50000000,
  extraAmount: null,
  newEndDate: null,
  reason: 'Alokasi Q4',
  status: 'menunggu_finance',
  submittedAt: '2026-11-01T10:00:00Z',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  project: { id: 'proj-1', name: 'ERP Core', department: { id: 'dept-eng', name: 'Engineering' } },
  requestedBy: { id: 'usr-admin-1', name: 'Admin Doni' },
  items: [],
};

describe('Kotak Masuk Persetujuan Terpadu (ApprovalsInboxPage)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  it('Admin: menampilkan 3 tab (Pengeluaran, Timesheet, Anggaran) beserta tombol aksi yang valid', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Doni'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseWaitingAdmin],
      total: 1,
      page: 1,
      limit: 50,
    });
    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({
      data: [mockTimesheetWaitingAdmin],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockResolvedValue({
      data: [mockBudgetWaitingFinance],
      total: 1,
      page: 1,
      limit: 50,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApprovalsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Kotak Masuk Persetujuan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pengeluaran/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Timesheet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anggaran/i })).toBeInTheDocument();

    // Verifikasi tombol Setujui dan Tolak muncul untuk pengeluaran orang lain
    expect(await screen.findByText('PT Vendor ABC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setujui/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tolak/i })).toBeInTheDocument();
  });

  it('Admin: tidak dapat menyetujui pengeluarannya sendiri pada kotak masuk', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Doni'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseOwnAdmin],
      total: 1,
      page: 1,
      limit: 50,
    });
    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
    });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApprovalsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Pengajuan Sendiri')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/i })).not.toBeInTheDocument();
  });

  it('Admin: tab Timesheet menampilkan tombol Setujui dan mencegah persetujuan timesheet milik sendiri', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Doni'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({
      data: [mockTimesheetWaitingAdmin, mockTimesheetOwnAdmin],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
    });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApprovalsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Beralih ke tab Timesheet
    const timesheetTab = await screen.findByRole('button', { name: /Timesheet/i });
    await user.click(timesheetTab);

    // Verifikasi baris timesheet pekerja lain dapat disetujui
    expect(await screen.findByText('Staff Anton')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setujui/i })).toBeInTheDocument();

    // Verifikasi timesheet admin sendiri ditandai nonaktif
    expect(screen.getByText('Timesheet Sendiri')).toBeInTheDocument();
  });

  it('Finance: tab Timesheet menginformasikan bahwa Finance tidak terlibat dalam timesheet', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'usr-fin-1', 'Finance Maya'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApprovalsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const timesheetTab = await screen.findByRole('button', { name: /Timesheet/i });
    await user.click(timesheetTab);

    expect(await screen.findByText(/Timesheet Diverifikasi oleh Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/tidak melibatkan Finance/i)).toBeInTheDocument();
  });

  it('Super Admin: melihat pengeluaran dalam mode Hanya Baca tanpa tombol aksi', async () => {
    useAuthStore.setState({
      accessToken: 'token-sa',
      user: mockUser('super_admin', 'usr-sa-1', 'Super Admin Ray'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseWaitingAdmin],
      total: 1,
      page: 1,
      limit: 50,
    });
    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ApprovalsInboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Hanya Baca')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verifikasi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tolak/i })).not.toBeInTheDocument();
  });
});
