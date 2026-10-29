import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import FinanceDashboard from '@/pages/dashboard/FinanceDashboard';
import SuperAdminDashboard from '@/pages/dashboard/SuperAdminDashboard';
import ExpensesPage from '@/pages/expenses/ExpensesPage';
import NominalBesarPage from '@/pages/expenses/NominalBesarPage';
import BudgetRequestsPage from '@/pages/budgets/BudgetRequestsPage';
import ProjectBudgetTab from '@/pages/projects/ProjectBudgetTab';
import FinancialReportsPage from '@/pages/reports/FinancialReportsPage';
import * as apiDashboard from '@/lib/api-dashboard';
import * as apiExpenses from '@/lib/api-expenses';
import * as apiLimits from '@/lib/api-limits';
import * as apiBudgets from '@/lib/api-budgets';
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

function mockUser(role: User['role'], name: string): User {
  return {
    id: `usr-${role}`,
    name,
    email: `${role}@perusahaan.com`,
    role,
    departmentId: role === 'super_admin' ? null : 'dept-it',
    jobTitle: 'Staff',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

describe('Penanganan Error State Tanpa Penelanan Data (Langkah 1)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      mustChangePassword: false,
      user: null,
    });
    vi.clearAllMocks();
  });

  it('AdminDashboard menampilkan ErrorState saat getAdminDashboard gagal dan tidak menampilkan angka bawaan', async () => {
    useAuthStore.setState({ user: mockUser('admin', 'Budi Admin') });
    vi.spyOn(apiDashboard, 'getAdminDashboard').mockRejectedValue(new Error('Koneksi database backend terputus'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Koneksi database backend terputus/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();

    // Pastikan nilai bawaan / angka palsu tidak tampil
    expect(screen.queryByText('Total Anggaran Departemen')).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 5.000.000')).not.toBeInTheDocument();
  });

  it('FinanceDashboard menampilkan ErrorState saat getFinanceDashboard gagal dan tidak menampilkan angka bawaan', async () => {
    useAuthStore.setState({ user: mockUser('finance', 'Siti Finance') });
    vi.spyOn(apiDashboard, 'getFinanceDashboard').mockRejectedValue(new Error('Internal server error 500'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FinanceDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Internal server error 500/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();

    // Pastikan angka palsu tidak tampil
    expect(screen.queryByText('Total Anggaran Perusahaan')).not.toBeInTheDocument();
  });

  it('SuperAdminDashboard menampilkan ErrorState saat getSuperAdminDashboard gagal', async () => {
    useAuthStore.setState({ user: mockUser('super_admin', 'Agus SuperAdmin') });
    vi.spyOn(apiDashboard, 'getSuperAdminDashboard').mockRejectedValue(new Error('Network error saat fetch dasbor super admin'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SuperAdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Network error saat fetch dasbor super admin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });

  it('ExpensesPage menampilkan ErrorState saat getExpenses gagal dan tidak menampilkan teks "Tidak ada pengeluaran"', async () => {
    useAuthStore.setState({ user: mockUser('admin', 'Budi Admin') });
    vi.spyOn(apiExpenses, 'getExpenses').mockRejectedValue(new Error('Gagal mengambil daftar transaksi pengeluaran'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExpensesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Gagal mengambil daftar transaksi pengeluaran/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();

    // Pastikan TIDAK menelan error sebagai daftar kosong
    expect(screen.queryByText('Tidak ada pengeluaran ditemukan')).not.toBeInTheDocument();
  });

  it('NominalBesarPage menampilkan ErrorState saat getCurrentLimit gagal dan TIDAK menampilkan batas bawaan 5.000.000', async () => {
    useAuthStore.setState({ user: mockUser('admin', 'Budi Admin') });
    vi.spyOn(apiLimits, 'getCurrentLimit').mockRejectedValue(new Error('Gagal memuat batas approval limit'));
    vi.spyOn(apiLimits, 'getLimitHistory').mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Gagal memuat batas approval limit/i)).toBeInTheDocument();

    // Sangat penting: jangan sampai menampilkan fallback palsu Rp 5.000.000 saat API gagal
    expect(screen.queryByText('Rp 5.000.000')).not.toBeInTheDocument();
  });

  it('NominalBesarPage menampilkan ErrorState pada riwayat saat getLimitHistory gagal', async () => {
    useAuthStore.setState({ user: mockUser('admin', 'Budi Admin') });
    vi.spyOn(apiLimits, 'getCurrentLimit').mockResolvedValue({
      id: 'lim-1',
      amount: 10000000,
      status: 'berlaku',
      effectiveFrom: '2026-01-01',
      confirmedAt: '2026-01-01',
    });
    vi.spyOn(apiLimits, 'getLimitHistory').mockRejectedValue(new Error('Gagal memuat riwayat audit limit'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Batas saat ini tampil
    expect(await screen.findByText('Rp 10.000.000')).toBeInTheDocument();
    // Bagian riwayat menampilkan error state
    expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Gagal memuat riwayat audit limit/i)).toBeInTheDocument();
    expect(screen.queryByText('Belum ada riwayat perubahan batas')).not.toBeInTheDocument();
  });

  it('BudgetRequestsPage menampilkan ErrorState saat getBudgetRequests gagal dan tidak menampilkan teks "Tidak ada pengajuan"', async () => {
    useAuthStore.setState({ user: mockUser('finance', 'Siti Finance') });
    vi.spyOn(apiBudgets, 'getBudgetRequests').mockRejectedValue(new Error('Gagal memuat data pengajuan anggaran'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <BudgetRequestsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Gagal memuat data pengajuan anggaran/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();

    // Pastikan TIDAK menelan error sebagai daftar kosong
    expect(screen.queryByText('Tidak ada pengajuan anggaran ditemukan')).not.toBeInTheDocument();
  });

  it('ProjectBudgetTab menampilkan ErrorState saat getBudgetSummary gagal', async () => {
    useAuthStore.setState({ user: mockUser('admin', 'Budi Admin') });
    vi.spyOn(apiBudgets, 'getActiveBudget').mockResolvedValue(null);
    vi.spyOn(apiBudgets, 'getBudgetSummary').mockRejectedValue(new Error('Gagal sinkronisasi ringkasan anggaran proyek'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectBudgetTab projectId="proj-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Gagal sinkronisasi ringkasan anggaran proyek/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });

  it('FinancialReportsPage menampilkan ErrorState saat getExpenses gagal', async () => {
    useAuthStore.setState({ user: mockUser('finance', 'Siti Finance') });
    vi.spyOn(apiExpenses, 'getExpenses').mockRejectedValue(new Error('Koneksi timeout ke server'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FinancialReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Terjadi Kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/Koneksi timeout ke server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
    expect(screen.queryByText('Tidak ada transaksi yang cocok')).not.toBeInTheDocument();
  });
});
