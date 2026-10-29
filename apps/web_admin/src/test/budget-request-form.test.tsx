import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { BudgetRequestFormModal } from '@/pages/budgets/BudgetRequestFormModal';
import ProjectBudgetTab from '@/pages/projects/ProjectBudgetTab';
import * as apiBudgets from '@/lib/api-budgets';
import * as apiSuperAdmin from '@/lib/api-super-admin';
import * as apiProjects from '@/lib/api-projects';
import type { Budget, BudgetSummary } from '@/types/budgets';
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

describe('Formulir Pengajuan Anggaran (Langkah 6)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();

    vi.spyOn(apiSuperAdmin, 'getExpenseCategoriesApi').mockResolvedValue([
      { id: 'cat-dev', code: 'DEV', name: 'Software Development', color: '#0A47B8', isActive: true, createdAt: '', updatedAt: '' },
      { id: 'cat-infra', code: 'INFRA', name: 'Cloud Infrastructure', color: '#48742C', isActive: true, createdAt: '', updatedAt: '' },
    ]);

    vi.spyOn(apiProjects, 'getProjectApi').mockResolvedValue({
      id: 'proj-1',
      name: 'Proyek Migrasi Cloud',
      description: '',
      departmentId: 'dept-1',
      costCenterId: 'cc-1',
      projectTypeId: null,
      status: 'berjalan',
      priority: 'tinggi',
      progress: 40,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      department: { id: 'dept-1', name: 'IT' },
      costCenter: { id: 'cc-1', code: 'CC-01', name: 'Tech' },
      projectType: null,
      createdBy: { id: 'usr-1', name: 'Creator', email: '', role: 'admin' },
      _count: { members: 3, phases: 1, milestones: 1, tasks: 2 },
      phases: [{ id: 'ph-1', name: 'Fase Persiapan', order: 1 }],
    } as any);
  });

  it('Menampilkan visual alur 4 langkah persetujuan anggaran pada modal formulir', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Proyek'),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BudgetRequestFormModal
          projectId="proj-1"
          projectName="Proyek Migrasi Cloud"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Alur 4 Langkah Persetujuan Anggaran')).toBeInTheDocument();
    expect(screen.getByText('Pengajuan')).toBeInTheDocument();
    expect(screen.getByText('Kelayakan')).toBeInTheDocument();
    expect(screen.getByText('Persetujuan')).toBeInTheDocument();
    expect(screen.getByText('Baseline')).toBeInTheDocument();
  });

  it('Memvalidasi pemilihan kategori dan nominal sebelum pengajuan anggaran', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Proyek'),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BudgetRequestFormModal
          projectId="proj-1"
          projectName="Proyek Migrasi Cloud"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await screen.findByText('Rincian Alokasi Kategori & Fase');

    const submitBtn = screen.getByRole('button', { name: /Kirim Pengajuan/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Kategori pada item baris ke-1 wajib dipilih/i)).toBeInTheDocument();
  });

  it('Memvalidasi keharusan alasan pada jenis perubahan anggaran', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Proyek'),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BudgetRequestFormModal
          projectId="proj-1"
          projectName="Proyek Migrasi Cloud"
          defaultType="perubahan"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await screen.findByText('Rincian Alokasi Kategori & Fase');
    await screen.findByRole('option', { name: /Software Development/i });

    // Pilih kategori
    const catSelect = screen.getByLabelText(/Kategori \*/i);
    fireEvent.change(catSelect, { target: { value: 'cat-dev' } });

    // Masukkan nominal
    const amountInput = screen.getByLabelText(/Nominal Alokasi \(Rp\) \*/i);
    fireEvent.change(amountInput, { target: { value: '25000000' } });

    const submitBtn = screen.getByRole('button', { name: /Kirim Pengajuan/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Alasan perubahan wajib diisi pada pengajuan jenis perubahan/i),
    ).toBeInTheDocument();
  });

  it('Berhasil mengajukan anggaran dan memanggil createBudgetRequestApi dengan benar', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Proyek'),
    });

    const createSpy = vi.spyOn(apiBudgets, 'createBudgetRequestApi').mockResolvedValue({
      id: 'req-new',
    } as any);

    const onSuccessMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <BudgetRequestFormModal
          projectId="proj-1"
          projectName="Proyek Migrasi Cloud"
          defaultType="awal"
          onClose={vi.fn()}
          onSuccess={onSuccessMock}
        />
      </QueryClientProvider>,
    );

    await screen.findByText('Rincian Alokasi Kategori & Fase');
    await screen.findByRole('option', { name: /Software Development/i });

    const catSelect = screen.getByLabelText(/Kategori \*/i);
    fireEvent.change(catSelect, { target: { value: 'cat-dev' } });

    const amountInput = screen.getByLabelText(/Nominal Alokasi \(Rp\) \*/i);
    fireEvent.change(amountInput, { target: { value: '50000000' } });

    const submitBtn = screen.getByRole('button', { name: /Kirim Pengajuan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        projectId: 'proj-1',
        type: 'awal',
        reason: undefined,
        newEndDate: undefined,
        items: [
          {
            categoryId: 'cat-dev',
            phaseId: null,
            newAmount: 50000000,
            oldAmount: undefined,
          },
        ],
        submitNow: true,
      });
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('ProjectBudgetTab: menampilkan banner anggaran terkunci baseline dengan alasan', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Proyek'),
    });

    const mockActiveBudget: Budget = {
      id: 'b-1',
      projectId: 'proj-1',
      version: 1,
      status: 'aktif',
      totalAmount: 100000000,
      isBaseline: true,
      lockedAt: '2026-02-01T00:00:00Z',
      approvedBy: 'usr-sa',
      createdAt: '2026-02-01T00:00:00Z',
    };

    const mockSummary: BudgetSummary = {
      projectId: 'proj-1',
      totalBudgeted: 100000000,
      totalActual: 20000000,
      laborActual: 10000000,
      isCostHidden: false,
      hiddenReason: null,
      absorptionPct: 20,
      progressPct: 30,
      isEarlyWarning: false,
      isOverBudget: false,
      categories: [],
      budget: mockActiveBudget,
    };

    vi.spyOn(apiBudgets, 'getActiveBudget').mockResolvedValue(mockActiveBudget);
    vi.spyOn(apiBudgets, 'getBudgetSummary').mockResolvedValue(mockSummary);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectBudgetTab projectId="proj-1" canEdit={true} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Anggaran Terkunci sebagai Baseline/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Alokasi ini berstatus baca saja karena telah ditetapkan sebagai acuan dasar/i),
    ).toBeInTheDocument();
  });
});
