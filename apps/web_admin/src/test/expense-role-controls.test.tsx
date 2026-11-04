import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import ExpensesPage from '@/pages/expenses/ExpensesPage';
import { ExpenseDetailModal } from '@/pages/expenses/ExpenseDetailModal';
import { RejectExpenseModal } from '@/pages/expenses/RejectExpenseModal';
import * as apiExpenses from '@/lib/api-expenses';
import type { Expense } from '@/types/expenses';
import type { User } from '@/types';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function mockUser(role: User['role'], id: string, name: string): User {
  return {
    id,
    name,
    email: `${role}@damaco.com`,
    role,
    departmentId: 'dept-1',
    jobTitle: 'Staff',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

const mockExpense1: Expense = {
  id: 'exp-1',
  requesterId: 'usr-employee',
  projectId: 'proj-1',
  taskId: null,
  costCenterId: 'cc-1',
  categoryId: 'cat-1',
  amount: 15000000,
  expenseDate: '2026-10-15',
  vendor: 'Vendor Maju',
  note: 'Pembelian lisensi software tim',
  status: 'menunggu_admin',
  isLargeAmount: true,
  limitAtSubmission: 5000000,
  submittedAt: '2026-10-15',
  createdAt: '2026-10-15',
  updatedAt: '2026-10-15',
  requester: {
    id: 'usr-employee',
    name: 'Budi Pengaju',
    email: 'budi@damaco.com',
    department: { id: 'dept-1', name: 'IT Engineering' },
  },
  project: { id: 'proj-1', name: 'Sistem ERP' },
  category: { id: 'cat-1', name: 'Software License' },
  attachments: [
    {
      id: 'att-1',
      fileName: 'nota_pembelian_resmi.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      createdAt: '2026-10-15',
    },
  ],
};

const mockExpenseOwn: Expense = {
  ...mockExpense1,
  id: 'exp-own',
  requesterId: 'usr-admin-1', // dibuat oleh admin itu sendiri
  requester: {
    id: 'usr-admin-1',
    name: 'Admin Sendiri',
    email: 'admin@damaco.com',
    department: { id: 'dept-1', name: 'IT Engineering' },
  },
};

const mockExpenseFinanceWaiting: Expense = {
  ...mockExpense1,
  id: 'exp-fin',
  status: 'menunggu_finance',
};

const mockExpenseReadyToPay: Expense = {
  ...mockExpense1,
  id: 'exp-pay',
  status: 'siap_dibayar',
};

describe('Persetujuan Pengeluaran & Kontrol Akses Peran (Langkah 4)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  it('Admin: melihat tombol Setujui dan Tolak untuk pengeluaran menunggu_admin dari orang lain', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpense1],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Sistem ERP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setujui/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tolak/i })).toBeInTheDocument();
  });

  it('Admin: tidak dapat menyetujui pengeluarannya sendiri (tombol dinonaktifkan)', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseOwn],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Admin Sendiri')).toBeInTheDocument();
    const approveBtn = screen.getByRole('button', { name: /Setujui/i });
    expect(approveBtn).toBeDisabled();
    expect(approveBtn).toHaveAttribute(
      'title',
      'Anda tidak dapat menyetujui pengeluaran milik Anda sendiri',
    );
  });

  it('Finance: melihat tombol Verifikasi pada status menunggu_finance dan Catat Pembayaran pada siap_dibayar', async () => {
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'usr-fin-1', 'Finance Siti'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseFinanceWaiting, mockExpenseReadyToPay],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: /Verifikasi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bayar/i })).toBeInTheDocument();
  });

  it('Super Admin: hanya mode baca saja tanpa tombol aksi persetujuan', async () => {
    useAuthStore.setState({
      accessToken: 'token-sa',
      user: mockUser('super_admin', 'usr-sa', 'Super Admin'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpense1],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Hanya Baca')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verifikasi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tolak/i })).not.toBeInTheDocument();
  });

  it('Menampilkan chip Nominal Besar pada tabel pengeluaran', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpense1],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const chips = await screen.findAllByText('Nominal Besar');
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('ExpenseDetailModal: menampilkan daftar nota dan checklist Finance untuk Nominal Besar', async () => {
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'usr-fin-1', 'Finance Siti'),
    });

    vi.spyOn(apiExpenses, 'getExpenseById').mockResolvedValue(mockExpenseFinanceWaiting);
    vi.spyOn(apiExpenses, 'downloadExpenseAttachment').mockResolvedValue('blob:http://localhost/test');

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpenseDetailModal
            expense={mockExpenseFinanceWaiting}
            onClose={vi.fn()}
            onApprove={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('nota_pembelian_resmi.pdf')).toBeInTheDocument();
    expect(screen.getByText('Checklist Verifikasi Finance (Nominal Besar)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh/i })).toBeInTheDocument();
  });

  it('RejectExpenseModal: mewajibkan alasan penolakan sebelum mengirim request', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    const rejectSpy = vi.spyOn(apiExpenses, 'rejectExpenseAdmin').mockResolvedValue(mockExpense1);

    render(
      <QueryClientProvider client={queryClient}>
        <RejectExpenseModal
          expense={mockExpense1}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const submitBtn = screen.getByRole('button', { name: /Konfirmasi Tolak/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Alasan penolakan wajib diisi.')).toBeInTheDocument();
    expect(rejectSpy).not.toHaveBeenCalled();

    // Isi alasan
    const textarea = screen.getByPlaceholderText(/Jelaskan alasan penolakan/i);
    fireEvent.change(textarea, { target: { value: 'Nota tidak terbaca' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith('exp-1', { reason: 'Nota tidak terbaca' });
    });
  });

  it('Menampilkan banner error backend ketika pengeluaran tertahan karena tidak ada admin lain', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpense1],
      total: 1,
      page: 1,
      limit: 20,
    });

    vi.spyOn(apiExpenses, 'approveExpenseAdmin').mockRejectedValue({
      response: {
        data: {
          message:
            'Pengeluaran tertahan: tidak ada admin lain di departemen yang sama untuk menyetujui. Pengaju tidak dapat menyetujui pengeluarannya sendiri.',
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const approveBtn = await screen.findByRole('button', { name: /Setujui/i });
    fireEvent.click(approveBtn);

    expect(
      await screen.findByText(/Pengeluaran tertahan: tidak ada admin lain/i),
    ).toBeInTheDocument();
  });

  it('Finance: tidak dapat memverifikasi pengeluarannya sendiri pada tahap verifikasi finance', async () => {
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'usr-fin-own', 'Finance Rina'),
    });

    const mockFinanceOwnWaiting: Expense = {
      ...mockExpenseFinanceWaiting,
      requesterId: 'usr-fin-own',
      requester: {
        id: 'usr-fin-own',
        name: 'Finance Rina',
        email: 'rina@damaco.com',
        department: { id: 'dept-fin', name: 'Finance Dept' },
      },
    };

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockFinanceOwnWaiting],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Finance Rina')).toBeInTheDocument();
    // Tombol verifikasi dinonaktifkan dengan tooltip untuk diri sendiri
    const verifyBtn = screen.getByRole('button', { name: /Verifikasi/i });
    expect(verifyBtn).toBeDisabled();
    expect(verifyBtn).toHaveAttribute(
      'title',
      'Anda tidak dapat memverifikasi pengeluaran milik Anda sendiri',
    );
  });

  it('Admin: tidak melihat tombol aksi pada pengeluaran berstatus siap_dibayar', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Budi'),
    });

    vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValue({
      data: [mockExpenseReadyToPay],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Sistem ERP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bayar/i })).not.toBeInTheDocument();
  });

  it('ExpenseDetailModal: Super Admin tidak melihat tombol Setujui, Tolak, atau Catat Pembayaran', async () => {
    useAuthStore.setState({
      accessToken: 'token-sa',
      user: mockUser('super_admin', 'usr-sa', 'Super Admin'),
    });

    vi.spyOn(apiExpenses, 'getExpenseById').mockResolvedValue(mockExpenseFinanceWaiting);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpenseDetailModal
            expense={mockExpenseFinanceWaiting}
            onClose={vi.fn()}
            onApprove={vi.fn()}
            onReject={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/Super Admin tidak termasuk rantai persetujuan pengeluaran/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verifikasi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tolak/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Catat Pembayaran/i })).not.toBeInTheDocument();
  });

  it('ExpenseDetailModal: menampilkan pesan peringatan nota belum dilampirkan jika Nominal Besar tanpa berkas', async () => {
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'usr-fin-1', 'Finance Siti'),
    });

    const mockExpenseNoAttach: Expense = {
      ...mockExpenseFinanceWaiting,
      attachments: [],
    };

    vi.spyOn(apiExpenses, 'getExpenseById').mockResolvedValue(mockExpenseNoAttach);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpenseDetailModal
            expense={mockExpenseNoAttach}
            onClose={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/Peringatan: Pengeluaran Nominal Besar ini belum memiliki lampiran nota transaksi/i),
    ).toBeInTheDocument();
  });
});
