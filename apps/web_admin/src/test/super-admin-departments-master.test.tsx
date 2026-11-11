import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import DepartmentCostCenterPage from '@/pages/super-admin/departments/DepartmentCostCenterPage';
import MasterDataPage from '@/pages/super-admin/master-data/MasterDataPage';
import { DepartmentFormModal } from '@/pages/super-admin/departments/DepartmentFormModal';
import { CostCenterFormModal } from '@/pages/super-admin/departments/CostCenterFormModal';
import { ExpenseCategoryFormModal } from '@/pages/super-admin/master-data/ExpenseCategoryFormModal';
import * as apiSuperAdmin from '@/lib/api-super-admin';
import { toast } from '@/components/shared';
import { useAuthStore } from '@/stores/auth';
import type { CostCenterItem, DepartmentItem, ExpenseCategoryItem, ProjectTypeItem, User } from '@/types';

// Mock apiSuperAdmin
vi.mock('@/lib/api-super-admin', () => ({
  getDepartmentsApi: vi.fn(),
  getDepartmentApi: vi.fn(),
  createDepartmentApi: vi.fn(),
  updateDepartmentApi: vi.fn(),
  deleteDepartmentApi: vi.fn(),
  getCostCentersApi: vi.fn(),
  getCostCenterApi: vi.fn(),
  createCostCenterApi: vi.fn(),
  updateCostCenterApi: vi.fn(),
  deleteCostCenterApi: vi.fn(),
  getExpenseCategoriesApi: vi.fn(),
  createExpenseCategoryApi: vi.fn(),
  updateExpenseCategoryApi: vi.fn(),
  deleteExpenseCategoryApi: vi.fn(),
  getProjectTypesApi: vi.fn(),
  createProjectTypeApi: vi.fn(),
  updateProjectTypeApi: vi.fn(),
  deleteProjectTypeApi: vi.fn(),
  getUsersApi: vi.fn(),
}));

// Mock toast
vi.mock('@/components/shared/toast-utils', () => {
  const toastMock = vi.fn();
  (toastMock as any).success = vi.fn();
  (toastMock as any).error = vi.fn();
  (toastMock as any).warning = vi.fn();
  (toastMock as any).info = vi.fn();
  return {
    toast: toastMock,
    registerToastListener: vi.fn(),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

const mockCurrentUser: User = {
  id: 'usr-super-1',
  name: 'Budi Super Admin',
  email: 'budi.super@duniayamaya.com',
  role: 'super_admin',
  departmentId: null,
  jobTitle: 'CTO',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: '2026-10-15T08:00:00.000Z',
};

const mockDepartmentItem: DepartmentItem = {
  id: 'dept-eng',
  name: 'Engineering',
  headUserId: 'usr-admin-1',
  annualBudget: 750000000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  headUser: { id: 'usr-admin-1', name: 'Rina Manajer', email: 'rina@duniayamaya.com' },
  _count: { users: 12, costCenters: 3, projects: 5 },
};

const mockCostCenterItem: CostCenterItem = {
  id: 'cc-eng-01',
  code: 'CC-ENG-001',
  name: 'Core Platform Engineering',
  departmentId: 'dept-eng',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  department: { id: 'dept-eng', name: 'Engineering' },
  _count: { projects: 4, expenses: 15 },
};

const mockExpenseCategories: ExpenseCategoryItem[] = [
  {
    id: 'cat-mat',
    code: 'MAT',
    name: 'Material & Hardware',
    color: '#E8141C',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-ops',
    code: 'OPS',
    name: 'Operasional Kantor',
    color: '#0A47B8',
    isActive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockProjectTypes: ProjectTypeItem[] = [
  {
    id: 'pt-web',
    name: 'Pengembangan Web & Aplikasi',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('Super Admin: Departemen, Cost Center, dan Master Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth('token-test', mockCurrentUser);

    vi.mocked(apiSuperAdmin.getDepartmentsApi).mockResolvedValue({
      data: [mockDepartmentItem],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(apiSuperAdmin.getCostCentersApi).mockResolvedValue({
      data: [mockCostCenterItem],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(apiSuperAdmin.getExpenseCategoriesApi).mockResolvedValue(mockExpenseCategories);
    vi.mocked(apiSuperAdmin.getProjectTypesApi).mockResolvedValue(mockProjectTypes);
    vi.mocked(apiSuperAdmin.getUsersApi).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 1 },
    });
  });

  describe('1. Penanganan Error Pada Penghapusan yang Ditolak Backend', () => {
    it('menampilkan pesan error jika backend menolak penghapusan departemen yang sedang digunakan', async () => {
      const user = userEvent.setup();
      vi.mocked(apiSuperAdmin.deleteDepartmentApi).mockRejectedValue({
        response: {
          data: {
            message: 'Departemen sedang digunakan oleh pengguna atau proyek.',
          },
        },
      });

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DepartmentCostCenterPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Tunggu data departemen muncul
      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      // Klik tombol hapus pada departemen
      const deleteBtn = screen.getByTestId('delete-dept-dept-eng');
      await user.click(deleteBtn);

      // Dialog konfirmasi muncul
      expect(screen.getByRole('heading', { name: /hapus departemen/i })).toBeInTheDocument();

      // Klik konfirmasi Hapus Departemen
      const confirmBtn = screen.getByRole('button', { name: /^hapus departemen$/i });
      await user.click(confirmBtn);

      // Pastikan deleteDepartmentApi dipanggil dan toast error menampilkan pesan backend
      await waitFor(() => {
        expect(apiSuperAdmin.deleteDepartmentApi).toHaveBeenCalledWith('dept-eng');
        expect(toast.error).toHaveBeenCalledWith('Departemen sedang digunakan oleh pengguna atau proyek.');
      });
    });

    it('menampilkan pesan error jika backend menolak penghapusan cost center yang sedang digunakan', async () => {
      const user = userEvent.setup();
      vi.mocked(apiSuperAdmin.deleteCostCenterApi).mockRejectedValue({
        response: {
          data: {
            message: 'Cost center sedang digunakan oleh proyek atau pengeluaran.',
          },
        },
      });

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DepartmentCostCenterPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Beralih ke tab Cost Center
      const ccTab = screen.getByRole('button', { name: /cost center/i });
      await user.click(ccTab);

      // Tunggu cost center muncul
      await waitFor(() => {
        expect(screen.getByText('CC-ENG-001')).toBeInTheDocument();
      });

      // Klik hapus cost center
      const deleteBtn = screen.getByTestId('delete-cc-cc-eng-01');
      await user.click(deleteBtn);

      // Konfirmasi hapus
      const confirmBtn = screen.getByRole('button', { name: /^hapus cost center$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(apiSuperAdmin.deleteCostCenterApi).toHaveBeenCalledWith('cc-eng-01');
        expect(toast.error).toHaveBeenCalledWith('Cost center sedang digunakan oleh proyek atau pengeluaran.');
      });
    });
  });

  describe('2. Validasi Form Departemen & Cost Center', () => {
    it('memvalidasi nama departemen di DepartmentFormModal', async () => {
      const user = userEvent.setup();
      const onSubmitMock = vi.fn();

      render(
        <DepartmentFormModal
          open={true}
          departmentToEdit={null}
          users={[]}
          onSubmit={onSubmitMock}
          onClose={vi.fn()}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /buat departemen/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Nama departemen minimal 2 karakter')).toBeInTheDocument();
      });
      expect(onSubmitMock).not.toHaveBeenCalled();
    });

    it('memvalidasi kode dan departemen di CostCenterFormModal', async () => {
      const user = userEvent.setup();
      const onSubmitMock = vi.fn();

      render(
        <CostCenterFormModal
          open={true}
          costCenterToEdit={null}
          departments={[mockDepartmentItem]}
          onSubmit={onSubmitMock}
          onClose={vi.fn()}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /buat cost center/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Kode cost center minimal 2 karakter')).toBeInTheDocument();
        expect(screen.getByText('Nama cost center minimal 2 karakter')).toBeInTheDocument();
        expect(screen.getByText('Departemen wajib dipilih')).toBeInTheDocument();
      });
      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });

  describe('3. Master Data: Kategori Biaya & Jenis Proyek', () => {
    it('menampilkan daftar kategori biaya dan memungkinkan filter status di MasterDataPage', async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MasterDataPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Material & Hardware')).toBeInTheDocument();
        expect(screen.getByText('Operasional Kantor')).toBeInTheDocument();
      });

      // Filter status: Aktif saja
      const statusSelect = screen.getByLabelText(/filter status kategori/i);
      await user.selectOptions(statusSelect, 'true');

      // Hanya kategori aktif yang muncul
      expect(screen.getByText('Material & Hardware')).toBeInTheDocument();
      expect(screen.queryByText('Operasional Kantor')).not.toBeInTheDocument();
    });

    it('memvalidasi form kategori biaya di ExpenseCategoryFormModal', async () => {
      const user = userEvent.setup();
      const onSubmitMock = vi.fn();

      render(
        <ExpenseCategoryFormModal
          open={true}
          categoryToEdit={null}
          onSubmit={onSubmitMock}
          onClose={vi.fn()}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /buat kategori/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Kode kategori minimal 2 karakter')).toBeInTheDocument();
        expect(screen.getByText('Nama kategori minimal 2 karakter')).toBeInTheDocument();
      });
      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });
});
