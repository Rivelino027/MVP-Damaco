import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import FinanceDashboard from '@/pages/dashboard/FinanceDashboard';
import ProjectBudgetTab from '@/pages/projects/ProjectBudgetTab';
import * as apiDashboard from '@/lib/api-dashboard';
import * as apiBudgets from '@/lib/api-budgets';
import type { AdminDashboard as IAdminDashboard, FinanceDashboard as IFinanceDashboard } from '@/lib/api-dashboard';
import type { BudgetSummary } from '@/types/budgets';
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
    email: `${role}@damaco.com`,
    role,
    departmentId: 'dept-1',
    jobTitle: 'Staff',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

describe('Penanganan Biaya Tersembunyi (Hidden Cost) & Filter Bulan (Langkah 3)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  it('AdminDashboard: menampilkan strip Biaya Tenaga Kerja Disembunyikan dan tidak menampilkan angka 0 saat isCostHidden=true', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'Admin Budi'),
    });

    const mockAdminData: IAdminDashboard = {
      activeProjects: 3,
      earlyWarningProjects: [],
      departmentBudget: 150000000,
      usedBudget: null, // disembunyikan
      remainingBudget: null,
      absorptionPct: 45,
      isCostHidden: true,
      hiddenReason: 'jumlah pekerja terlalu sedikit untuk ditampilkan',
      pendingApprovals: { timesheets: 2, expenses: 1, budgetRequests: 0 },
      pendingLimitChange: false,
      currentLimit: 5000000,
      projectHealth: [],
    };

    vi.spyOn(apiDashboard, 'getAdminDashboard').mockResolvedValue(mockAdminData);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Biaya Tenaga Kerja Disembunyikan')).toBeInTheDocument();
    expect(screen.getByText(/jumlah pekerja terlalu sedikit untuk ditampilkan/i)).toBeInTheDocument();
    // Pastikan tidak menampilkan 'Rp 0' sebagai angka terpakai palsu
    expect(screen.queryByText('Rp 0')).not.toBeInTheDocument();
  });

  it('FinanceDashboard: menampilkan strip Disembunyikan pada agregat biaya tenaga kerja saat isCostHidden=true', async () => {
    useAuthStore.setState({
      accessToken: 'token-finance',
      user: mockUser('finance', 'Finance Siti'),
    });

    const mockFinanceData: IFinanceDashboard = {
      totalBudgetCompany: 500000000,
      totalUsedCompany: null,
      isTotalUsedHidden: true,
      absorptionPctCompany: 35,
      pendingVerification: 4,
      readyToPay: 25000000,
      readyToPayCount: 2,
      largeAmountPending: 1,
      currentLimit: 5000000,
      monthlyCashflow: [],
      departmentAbsorption: [
        {
          departmentId: 'dept-1',
          departmentName: 'Teknologi Informasi',
          budgeted: 200000000,
          actual: null,
          absorptionPct: 25,
          laborActual: null,
          isCostHidden: true,
          hiddenReason: 'Pekerja kurang dari ambang privasi',
        },
      ],
      laborCostByDept: [
        {
          departmentId: 'dept-1',
          departmentName: 'Teknologi Informasi',
          totalCost: null,
          isCostHidden: true,
          hiddenReason: 'Jumlah pekerja kurang dari batas privasi',
        },
      ],
    };

    vi.spyOn(apiDashboard, 'getFinanceDashboard').mockResolvedValue(mockFinanceData);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FinanceDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Agregat Biaya Tenaga Kerja')).toBeInTheDocument();
    expect(screen.getByText('Disembunyikan')).toBeInTheDocument();
    expect(screen.getByText('Biaya disembunyikan')).toBeInTheDocument();
    // Memastikan ada dropdown filter bulan kalender
    expect(screen.getByLabelText(/Filter periode bulan biaya tenaga kerja/i)).toBeInTheDocument();
  });

  it('ProjectBudgetTab: menampilkan strip Disembunyikan pada realisasi dan banner privasi', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'Admin Budi'),
    });

    const mockSummary: BudgetSummary = {
      projectId: 'proj-1',
      totalBudgeted: 100000000,
      totalActual: null,
      laborActual: null,
      isCostHidden: true,
      hiddenReason: 'Jumlah pekerja proyek kurang dari 2 orang',
      absorptionPct: null,
      progressPct: 40,
      isEarlyWarning: false,
      isOverBudget: false,
      categories: [],
      budget: {
        id: 'b-1',
        projectId: 'proj-1',
        version: 1,
        status: 'aktif',
        totalAmount: 100000000,
        isBaseline: false,
        lockedAt: null,
        approvedBy: null,
        createdAt: '',
      },
    };

    vi.spyOn(apiBudgets, 'getActiveBudget').mockResolvedValue(mockSummary.budget!);
    vi.spyOn(apiBudgets, 'getBudgetSummary').mockResolvedValue(mockSummary);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectBudgetTab projectId="proj-1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Biaya Tenaga Kerja Disembunyikan')).toBeInTheDocument();
    expect(screen.getByText(/Jumlah pekerja proyek kurang dari 2 orang/i)).toBeInTheDocument();
    // Memastikan card Realisasi menampilkan teks Disembunyikan, bukan Rp 0
    const hiddenLabels = screen.getAllByText('Disembunyikan');
    expect(hiddenLabels.length).toBeGreaterThanOrEqual(1);
  });
});
