import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import FinanceDashboard from '@/pages/dashboard/FinanceDashboard';
import SuperAdminDashboard from '@/pages/dashboard/SuperAdminDashboard';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import FinancialReportsPage from '@/pages/reports/FinancialReportsPage';
import RoleMatrixPage from '@/pages/super-admin/roles/RoleMatrixPage';
import SystemSettingsPage from '@/pages/super-admin/settings/SystemSettingsPage';
import * as apiDashboard from '@/lib/api-dashboard';
import * as apiExpenses from '@/lib/api-expenses';
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
    jobTitle: 'Lead',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

describe('Finance & Super Admin Dashboard & Modules', () => {
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

  describe('1. Finance Dashboard (FinanceDashboard.tsx)', () => {
    it('menampilkan elemen KPI, arus kas, antrean pembayaran, dan agregat tenaga kerja', async () => {
      useAuthStore.setState({ user: mockUser('finance', 'Siti Finance') });

      vi.spyOn(apiDashboard, 'getFinanceDashboard').mockResolvedValueOnce({
        totalBudgetCompany: '500000000',
        totalUsedCompany: '150000000',
        absorptionPctCompany: 30,
        pendingVerification: 4,
        largeAmountPending: 2,
        readyToPay: '25000000',
        readyToPayCount: 3,
        currentLimit: '5000000',
        departmentAbsorption: [
          { departmentId: 'd1', departmentName: 'IT Dev', budgeted: 200000000, actual: 80000000, absorptionPct: 40 },
        ],
        monthlyCashflow: [
          { month: '2026-03', label: 'Mar 2026', totalExpenses: 50000000, paidExpenses: 30000000 },
        ],
        laborCostByDept: [
          { departmentId: 'd1', departmentName: 'IT Dev', totalCost: '45000000' },
        ],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <FinanceDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verifikasi salam
      expect(await screen.findByRole('heading', { level: 1, name: /Siti/i })).toBeInTheDocument();

      // Verifikasi KPI Cards
      expect(screen.getByText('Total Anggaran Perusahaan')).toBeInTheDocument();
      expect(screen.getByText('Verifikasi Menunggu')).toBeInTheDocument();
      expect(screen.getByText('Siap Dibayar')).toBeInTheDocument();
      expect(screen.getByText('Nominal Besar')).toBeInTheDocument();

      // Verifikasi Antrean Pembayaran & Tombol Proses
      expect(screen.getByText('Antrean Pembayaran Kas')).toBeInTheDocument();
      expect(screen.getByText('Proses Pembayaran')).toBeInTheDocument();

      // Verifikasi Privasi: Agregat Biaya Tenaga Kerja tampil tanpa rincian perorangan
      expect(screen.getByText('Agregat Biaya Tenaga Kerja')).toBeInTheDocument();
      expect(screen.getByText('Agregat Departemen')).toBeInTheDocument();
      expect(screen.getAllByText('IT Dev').length).toBeGreaterThanOrEqual(1);

      // Verifikasi Grafik Arus Kas
      expect(screen.getByText('Tren Pengeluaran & Pembayaran Kas')).toBeInTheDocument();
      expect(screen.getAllByText('Mar 2026').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Super Admin Dashboard (SuperAdminDashboard.tsx)', () => {
    it('menampilkan KPI global, kesehatan proyek, log aktivitas, dan badge Hanya Baca pada Nominal Besar', async () => {
      useAuthStore.setState({ user: mockUser('super_admin', 'Budi SuperAdmin') });

      vi.spyOn(apiDashboard, 'getSuperAdminDashboard').mockResolvedValueOnce({
        totalBudgetCompany: '1000000000',
        totalUsedCompany: '350000000',
        absorptionPctCompany: 35,
        activeProjects: 8,
        totalUsers: 24,
        pendingBudgetDecisions: 2,
        currentLimit: '5000000',
        pendingLimitChange: false,
        departmentAbsorption: [
          { departmentId: 'd1', departmentName: 'Operasional', budgeted: 300000000, actual: 120000000, absorptionPct: 40 },
        ],
        projectHealth: [
          {
            id: 'p1',
            name: 'Migrasi ERP Core',
            status: 'berjalan',
            progressPercent: 50,
            absorptionPct: 45,
            isEarlyWarning: false,
            isOverBudget: false,
            department: { id: 'd1', name: 'IT' },
          },
        ],
        recentActivities: [
          {
            id: 'act1',
            action: 'login',
            module: 'auth',
            createdAt: new Date().toISOString(),
            user: { id: 'u1', name: 'Budi SuperAdmin' },
          },
        ],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SuperAdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verifikasi salam
      expect(await screen.findByRole('heading', { level: 1, name: /Budi/i })).toBeInTheDocument();

      // Verifikasi KPI Cards
      expect(screen.getByText('Total Anggaran Perusahaan')).toBeInTheDocument();
      expect(screen.getByText('Proyek Aktif (Semua Dept)')).toBeInTheDocument();
      expect(screen.getByText('Total Pengguna')).toBeInTheDocument();
      expect(screen.getByText('Keputusan Anggaran Menunggu')).toBeInTheDocument();

      // Verifikasi Kepatuhan Aturan Bisnis: Batas Nominal Besar berbadge Hanya Baca
      expect(screen.getByText('Batas Nominal Besar')).toBeInTheDocument();
      expect(screen.getByText('Hanya Baca')).toBeInTheDocument();

      // Verifikasi Kesehatan Proyek & Administrasi Sistem
      expect(screen.getByText('Kesehatan Seluruh Proyek')).toBeInTheDocument();
      expect(screen.getByText('Migrasi ERP Core')).toBeInTheDocument();
      expect(screen.getByText('Administrasi Sistem')).toBeInTheDocument();
      expect(screen.getByText('Kelola Biaya Per Jam (Labor Cost)')).toBeInTheDocument();
      expect(screen.getByText('Aktivitas Terkini')).toBeInTheDocument();
    });
  });

  describe('3. Router Dasbor Dinamis (DashboardPage.tsx)', () => {
    it('mengarahkan pengguna finance ke FinanceDashboard', async () => {
      useAuthStore.setState({ user: mockUser('finance', 'Dewi Finance') });
      vi.spyOn(apiDashboard, 'getFinanceDashboard').mockResolvedValueOnce({
        totalBudgetCompany: 0,
        totalUsedCompany: 0,
        absorptionPctCompany: 0,
        pendingVerification: 0,
        largeAmountPending: 0,
        readyToPay: 0,
        readyToPayCount: 0,
        currentLimit: 5000000,
        departmentAbsorption: [],
        monthlyCashflow: [],
        laborCostByDept: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByRole('heading', { level: 3, name: /Antrean Pembayaran Kas/i })).toBeInTheDocument();
    });

    it('mengarahkan pengguna super_admin ke SuperAdminDashboard', async () => {
      useAuthStore.setState({ user: mockUser('super_admin', 'Agus SuperAdmin') });
      vi.spyOn(apiDashboard, 'getSuperAdminDashboard').mockResolvedValueOnce({
        totalBudgetCompany: 0,
        totalUsedCompany: 0,
        absorptionPctCompany: 0,
        activeProjects: 0,
        totalUsers: 0,
        pendingBudgetDecisions: 0,
        currentLimit: 5000000,
        pendingLimitChange: false,
        departmentAbsorption: [],
        projectHealth: [],
        recentActivities: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByRole('heading', { level: 3, name: /Administrasi Sistem/i })).toBeInTheDocument();
    });
  });

  describe('4. Halaman Khusus Peran: Laporan Keuangan, Matriks Peran, dan Pengaturan Sistem', () => {
    it('FinancialReportsPage (Finance): menampilkan rekap pembayaran kas dan tombol ekspor', async () => {
      vi.spyOn(apiExpenses, 'getExpenses').mockResolvedValueOnce({
        data: [
          {
            id: 'exp1',
            requesterId: 'u1',
            projectId: 'p1',
            taskId: null,
            costCenterId: 'cc1',
            categoryId: 'c1',
            amount: 7500000,
            expenseDate: '2026-04-10',
            vendor: 'PT Vendor Solusi',
            note: 'Pembelian lisensi software',
            status: 'dibayar',
            isLargeAmount: true,
            limitAtSubmission: 5000000,
            submittedAt: '2026-04-10T08:00:00Z',
            createdAt: '2026-04-10T08:00:00Z',
            updatedAt: '2026-04-11T08:00:00Z',
            payment: {
              id: 'pay1',
              expenseId: 'exp1',
              paidBy: 'u2',
              paidAt: '2026-04-11T10:00:00Z',
              method: 'transfer',
              referenceNo: 'TRF-20260411-001',
              amount: 7500000,
              createdAt: '2026-04-11T10:00:00Z',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <FinancialReportsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByText('Laporan Realisasi Keuangan & Kas')).toBeInTheDocument();
      expect(await screen.findByText('Pembelian lisensi software')).toBeInTheDocument();
      expect(screen.getByText('Ekspor CSV / Excel')).toBeInTheDocument();
      expect(screen.getByText('Cetak / PDF')).toBeInTheDocument();
    });

    it('RoleMatrixPage (Super Admin): menampilkan matriks hak akses 4 peran secara read-only', () => {
      render(
        <MemoryRouter>
          <RoleMatrixPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Peran & Hak Akses')).toBeInTheDocument();
      expect(screen.getByText('Matriks Hak Akses Fitur (Read-Only)')).toBeInTheDocument();
      expect(screen.getByText('Satu akun = satu peran.')).toBeInTheDocument();
    });

    it('SystemSettingsPage (Super Admin): menampilkan parameter privasi biaya tenaga kerja dan sesi', () => {
      render(
        <MemoryRouter>
          <SystemSettingsPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Pengaturan Sistem')).toBeInTheDocument();
      expect(screen.getByText('Privasi Biaya Tenaga Kerja (Labor Cost Privacy)')).toBeInTheDocument();
      expect(screen.getByText('Ambang Batas Minimum Pekerja')).toBeInTheDocument();
      expect(screen.getByText('Keamanan Sesi & Otentikasi')).toBeInTheDocument();
    });
  });
});
