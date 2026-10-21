import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProjectsPage from '@/pages/projects/ProjectsPage';
import * as apiProjects from '@/lib/api-projects';
import * as apiSuperAdmin from '@/lib/api-super-admin';
import { useAuthStore } from '@/stores/auth';
import type { ProjectItem, PaginatedResponse, User } from '@/types';

// ─── Mocks ───────────────────────────────────────────────

vi.mock('@/lib/api-projects', () => ({
  getProjectsApi: vi.fn(),
  createProjectApi: vi.fn(),
  updateProjectApi: vi.fn(),
  closeProjectApi: vi.fn(),
  deleteProjectApi: vi.fn(),
  getCostCentersForDeptApi: vi.fn(),
}));

vi.mock('@/lib/api-super-admin', () => ({
  getDepartmentsApi: vi.fn(),
  getCostCentersApi: vi.fn(),
  getProjectTypesApi: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/proyek']}>
        <Routes>
          <Route path="/proyek" element={<ProjectsPage />} />
          <Route path="/proyek/:id" element={<div>Detail Proyek</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Mock data ────────────────────────────────────────────

const mockAdmin: User = {
  id: 'usr-admin-1',
  name: 'Budi Admin',
  email: 'budi@test.com',
  role: 'admin',
  departmentId: 'dept-1',
  jobTitle: 'Project Manager',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: null,
};

const mockFinance: User = {
  id: 'usr-finance-1',
  name: 'Siti Finance',
  email: 'siti@test.com',
  role: 'finance',
  departmentId: null,
  jobTitle: 'Finance Manager',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: null,
};

const mockSuperAdmin: User = {
  id: 'usr-super-1',
  name: 'Ali Super',
  email: 'ali@test.com',
  role: 'super_admin',
  departmentId: null,
  jobTitle: 'CTO',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: null,
};

const mockProject: ProjectItem = {
  id: 'proj-1',
  name: 'Redesign Portal Internal',
  description: 'Proyek redesain portal internal perusahaan',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Engineering' },
  costCenterId: 'cc-1',
  costCenter: { id: 'cc-1', code: 'ENG-001', name: 'Engineering Ops' },
  projectTypeId: null,
  projectType: null,
  status: 'berjalan',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-06-30T00:00:00.000Z',
  progressPercent: 45,
  createdById: 'usr-admin-1',
  createdBy: { id: 'usr-admin-1', name: 'Budi Admin', email: 'budi@test.com', role: 'admin' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  deletedAt: null,
  _count: { members: 3, phases: 2, milestones: 1, tasks: 10 },
};

const mockProjectDiajukan: ProjectItem = {
  ...mockProject,
  id: 'proj-2',
  name: 'Sistem Absensi Baru',
  status: 'diajukan',
  progressPercent: 0,
};

const mockEmptyResponse: PaginatedResponse<ProjectItem> = {
  data: [],
  meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
};

const mockListResponse: PaginatedResponse<ProjectItem> = {
  data: [mockProject, mockProjectDiajukan],
  meta: { total: 2, page: 1, limit: 12, totalPages: 1 },
};

// ─── Setup ────────────────────────────────────────────────

function setupMocks() {
  vi.mocked(apiProjects.getProjectsApi).mockResolvedValue(mockListResponse);
  vi.mocked(apiSuperAdmin.getDepartmentsApi).mockResolvedValue({
    data: [{ id: 'dept-1', name: 'Engineering', headUserId: null, annualBudget: 0, isActive: true, createdAt: '', updatedAt: '', deletedAt: null }],
    meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
  });
  vi.mocked(apiSuperAdmin.getCostCentersApi).mockResolvedValue({
    data: [{ id: 'cc-1', code: 'ENG-001', name: 'Engineering Ops', departmentId: 'dept-1', isActive: true, createdAt: '', updatedAt: '' }],
    meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
  });
  vi.mocked(apiSuperAdmin.getProjectTypesApi).mockResolvedValue([]);
}

// ─── Tests ────────────────────────────────────────────────

describe('ProjectsPage – Tampilan', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('menampilkan daftar proyek dalam tampilan kartu (default)', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Redesign Portal Internal')).toBeInTheDocument();
      expect(screen.getByText('Sistem Absensi Baru')).toBeInTheDocument();
    });
  });

  it('beralih ke tampilan tabel saat tombol Tabel diklik', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    const tableBtn = screen.getByLabelText('Tampilan tabel');
    await userEvent.click(tableBtn);

    // Tabel harus punya header
    expect(screen.getByText('Nama Proyek')).toBeInTheDocument();
  });

  it('menampilkan status badge yang benar untuk setiap proyek', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Berjalan')).toBeInTheDocument();
      expect(screen.getByText('Diajukan')).toBeInTheDocument();
    });
  });

  it('menampilkan pesan kosong jika tidak ada proyek', async () => {
    vi.mocked(apiProjects.getProjectsApi).mockResolvedValue(mockEmptyResponse);
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Belum ada proyek')).toBeInTheDocument();
    });
  });
});

describe('ProjectsPage – Hak Akses Peran', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('admin: menampilkan tombol Ajukan Proyek', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ajukan proyek/i })).toBeInTheDocument();
    });
  });

  it('super_admin: menampilkan tombol Ajukan Proyek', async () => {
    useAuthStore.setState({ user: mockSuperAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ajukan proyek/i })).toBeInTheDocument();
    });
  });

  it('finance: TIDAK menampilkan tombol Ajukan Proyek (read-only)', async () => {
    useAuthStore.setState({ user: mockFinance, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));
    expect(screen.queryByRole('button', { name: /ajukan proyek/i })).not.toBeInTheDocument();
  });

  it('finance: TIDAK menampilkan menu aksi (edit/tutup/hapus) pada proyek', async () => {
    useAuthStore.setState({ user: mockFinance, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    // Tombol MoreVertical (menu aksi) tidak boleh ada
    expect(screen.queryByLabelText('Menu proyek')).not.toBeInTheDocument();
  });
});

describe('ProjectsPage – Filter & Pencarian', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('memanggil API dengan parameter pencarian saat input diisi', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    const searchInput = screen.getByPlaceholderText(/cari nama proyek/i);
    await userEvent.type(searchInput, 'portal');

    await waitFor(() => {
      expect(vi.mocked(apiProjects.getProjectsApi)).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'portal' }),
      );
    });
  });

  it('memanggil API dengan filter status yang dipilih', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    const statusSelect = screen.getByRole('combobox', { name: '' });
    // pilih status "berjalan"
    await userEvent.selectOptions(statusSelect, 'berjalan');

    await waitFor(() => {
      expect(vi.mocked(apiProjects.getProjectsApi)).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'berjalan' }),
      );
    });
  });
});

describe('ProjectsPage – Modal Ajukan Proyek (Admin)', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('admin: membuka modal saat klik Ajukan Proyek', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByRole('button', { name: /ajukan proyek/i }));
    await userEvent.click(screen.getByRole('button', { name: /ajukan proyek/i }));

    expect(screen.getByText('Ajukan Proyek Baru')).toBeInTheDocument();
  });

  it('admin: modal menampilkan departemen terkunci (read-only)', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByRole('button', { name: /ajukan proyek/i }));
    await userEvent.click(screen.getByRole('button', { name: /ajukan proyek/i }));

    // Departemen tidak boleh berupa dropdown untuk admin
    expect(screen.queryByRole('combobox', { name: /departemen/i })).not.toBeInTheDocument();
    // Harus ada label departemen
    expect(screen.getByText('Departemen')).toBeInTheDocument();
  });

  it('admin: submit form memanggil createProjectApi tanpa departmentId', async () => {
    vi.mocked(apiProjects.createProjectApi).mockResolvedValue(mockProject);
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    const { container } = renderPage(qc);

    await waitFor(() => screen.getByRole('button', { name: /ajukan proyek/i }));
    await userEvent.click(screen.getByRole('button', { name: /ajukan proyek/i }));

    // Modal terbuka
    await waitFor(() => screen.getByText('Ajukan Proyek Baru'));

    // Isi nama proyek menggunakan id spesifik modal
    const nameInput = container.querySelector('#project-name') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    await userEvent.type(nameInput, 'Proyek Tes');

    // Pilih cost center
    const ccSelect = container.querySelector('#project-cost-center') as HTMLSelectElement;
    expect(ccSelect).toBeInTheDocument();
    await userEvent.selectOptions(ccSelect, 'cc-1');

    // Submit form
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).toBeInTheDocument();
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.createProjectApi)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Proyek Tes',
          costCenterId: 'cc-1',
          departmentId: undefined,
        }),
      );
    });
  });
});

describe('ProjectsPage – Aksi Proyek', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('admin: dialog konfirmasi muncul saat klik Tutup Proyek', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    // Buka menu
    const menuBtn = screen.getAllByLabelText('Menu proyek')[0];
    await userEvent.click(menuBtn);

    const closeBtn = screen.getByText('Tutup Proyek');
    await userEvent.click(closeBtn);

    expect(screen.getByText('Tutup Proyek', { selector: 'h3' })).toBeInTheDocument();
  });

  it('admin: dialog konfirmasi muncul saat klik Hapus', async () => {
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    const menuBtns = screen.getAllByLabelText('Menu proyek');
    await userEvent.click(menuBtns[0]);

    const deleteBtn = screen.getByText('Hapus');
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Hapus Proyek')).toBeInTheDocument();
  });

  it('memanggil closeProjectApi saat konfirmasi Tutup', async () => {
    vi.mocked(apiProjects.closeProjectApi).mockResolvedValue({ ...mockProject, status: 'ditutup' });
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    await userEvent.click(screen.getAllByLabelText('Menu proyek')[0]);
    await userEvent.click(screen.getByText('Tutup Proyek'));
    await userEvent.click(screen.getByRole('button', { name: /tutup proyek/i }));

    await waitFor(() => {
      expect(vi.mocked(apiProjects.closeProjectApi)).toHaveBeenCalledWith('proj-1');
    });
  });

  it('memanggil deleteProjectApi saat konfirmasi Hapus', async () => {
    vi.mocked(apiProjects.deleteProjectApi).mockResolvedValue({ message: 'Deleted', id: 'proj-2' });
    useAuthStore.setState({ user: mockAdmin, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderPage(qc);

    await waitFor(() => screen.getByText('Redesign Portal Internal'));

    await userEvent.click(screen.getAllByLabelText('Menu proyek')[0]);
    await userEvent.click(screen.getByText('Hapus'));
    await userEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    await waitFor(() => {
      expect(vi.mocked(apiProjects.deleteProjectApi)).toHaveBeenCalledWith('proj-1');
    });
  });
});
