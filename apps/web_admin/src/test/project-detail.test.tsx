import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProjectDetailPage from '@/pages/projects/ProjectDetailPage';
import * as apiProjects from '@/lib/api-projects';
import { useAuthStore } from '@/stores/auth';
import type { ProjectDetail, User } from '@/types';

// ─── Mocks ───────────────────────────────────────────────

vi.mock('@/lib/api-projects', () => ({
  getProjectApi: vi.fn(),
  updateProjectApi: vi.fn(),
  closeProjectApi: vi.fn(),
  deleteProjectApi: vi.fn(),
  getProjectMembersApi: vi.fn(),
  addProjectMemberApi: vi.fn(),
  removeProjectMemberApi: vi.fn(),
  createPhaseApi: vi.fn(),
  updatePhaseApi: vi.fn(),
  deletePhaseApi: vi.fn(),
  createMilestoneApi: vi.fn(),
  updateMilestoneApi: vi.fn(),
  deleteMilestoneApi: vi.fn(),
}));

vi.mock('@/lib/api-super-admin', () => ({
  getDepartmentsApi: vi.fn(),
  getCostCentersApi: vi.fn(),
  getProjectTypesApi: vi.fn(),
  getUsersApi: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────

const mockAdminUser: User = {
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

const mockFinanceUser: User = {
  id: 'usr-finance-1',
  name: 'Siti Finance',
  email: 'siti@test.com',
  role: 'finance',
  departmentId: null,
  jobTitle: 'Finance Officer',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: null,
};

const mockDetail: ProjectDetail = {
  id: 'proj-123',
  name: 'Sistem Informasi ERP',
  description: 'Implementasi ERP untuk seluruh departemen',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Information Technology' },
  costCenterId: 'cc-1',
  costCenter: { id: 'cc-1', code: 'IT-001', name: 'IT Infrastructure' },
  projectTypeId: null,
  projectType: null,
  status: 'berjalan',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  progressPercent: 60,
  createdById: 'usr-admin-1',
  createdBy: { id: 'usr-admin-1', name: 'Budi Admin', email: 'budi@test.com', role: 'admin' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  deletedAt: null,
  members: [
    {
      id: 'pm-1',
      projectId: 'proj-123',
      userId: 'usr-dev-1',
      addedById: 'usr-admin-1',
      createdAt: '2026-01-02T00:00:00.000Z',
      user: {
        id: 'usr-dev-1',
        name: 'Andi Developer',
        email: 'andi@test.com',
        role: 'pengguna',
        jobTitle: 'Frontend Engineer',
        avatarUrl: null,
      },
    },
  ],
  phases: [
    {
      id: 'phase-1',
      projectId: 'proj-123',
      name: 'Fase 1: Desain & Arsitektur',
      sortOrder: 1,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      milestones: [
        {
          id: 'ms-1',
          projectId: 'proj-123',
          phaseId: 'phase-1',
          name: 'Persetujuan Desain UI',
          dueDate: '2026-02-15T00:00:00.000Z',
          isDone: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
  milestones: [
    {
      id: 'ms-general',
      projectId: 'proj-123',
      phaseId: null,
      name: 'Kickoff Meeting Umum',
      dueDate: '2026-01-05T00:00:00.000Z',
      isDone: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderDetailPage(qc: QueryClient, initialRoute = '/proyek/proj-123') {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/proyek" element={<div>Halaman Daftar Proyek</div>} />
          <Route path="/proyek/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────

describe('ProjectDetailPage – Ringkasan & Navigasi', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockDetail);
  });

  it('menampilkan detail ringkasan proyek (nama, deskripsi, progress, metadata)', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Sistem Informasi ERP')).toBeInTheDocument();
      expect(screen.getByText('Implementasi ERP untuk seluruh departemen')).toBeInTheDocument();
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('tombol Kembali mengarahkan kembali ke daftar proyek', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));

    const backBtn = screen.getByRole('button', { name: /kembali ke proyek/i });
    await userEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Halaman Daftar Proyek')).toBeInTheDocument();
    });
  });
});

describe('ProjectDetailPage – Tab Anggota Tim (Role Control)', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockDetail);
  });

  it('admin: menampilkan daftar anggota dan tombol Tambah Anggota', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Andi Developer'));

    expect(screen.getByText('andi@test.com')).toBeInTheDocument();
    expect(screen.getByText(/frontend engineer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah anggota/i })).toBeInTheDocument();
  });

  it('finance: TIDAK menampilkan tombol Tambah Anggota dan tombol hapus anggota (read-only)', async () => {
    useAuthStore.setState({ user: mockFinanceUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Andi Developer'));

    expect(screen.queryByRole('button', { name: /tambah anggota/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/keluarkan andi developer/i)).not.toBeInTheDocument();
  });

  it('admin: dialog konfirmasi muncul saat klik tombol hapus anggota dan memanggil removeProjectMemberApi', async () => {
    vi.mocked(apiProjects.removeProjectMemberApi).mockResolvedValue({ message: 'Removed' });
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Andi Developer'));

    const removeBtn = screen.getByLabelText(/keluarkan andi developer/i);
    await userEvent.click(removeBtn);

    // Dialog konfirmasi muncul
    expect(screen.getByText('Keluarkan Anggota')).toBeInTheDocument();

    // Klik konfirmasi
    const confirmBtn = screen.getByRole('button', { name: /^keluarkan$/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.removeProjectMemberApi)).toHaveBeenCalledWith('proj-123', 'usr-dev-1');
    });
  });
});

describe('ProjectDetailPage – Tab Fase & Milestone', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockDetail);
  });

  it('berpindah ke tab Fase & Milestone saat tab diklik', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));

    const tabFase = screen.getByRole('button', { name: /fase & milestone/i });
    await userEvent.click(tabFase);

    await waitFor(() => {
      expect(screen.getByText('Fase 1: Desain & Arsitektur')).toBeInTheDocument();
      expect(screen.getByText('Persetujuan Desain UI')).toBeInTheDocument();
      expect(screen.getByText('Kickoff Meeting Umum')).toBeInTheDocument();
    });
  });

  it('admin: centang milestone memanggil updateMilestoneApi dengan status baru', async () => {
    vi.mocked(apiProjects.updateMilestoneApi).mockResolvedValue({
      id: 'ms-1',
      projectId: 'proj-123',
      phaseId: 'phase-1',
      name: 'Persetujuan Desain UI',
      dueDate: '2026-02-15T00:00:00.000Z',
      isDone: true,
      createdAt: '',
      updatedAt: '',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));
    await userEvent.click(screen.getByRole('button', { name: /fase & milestone/i }));

    await waitFor(() => screen.getByText('Persetujuan Desain UI'));

    // Checkbox tombol tandai selesai
    const checkBtn = screen.getByLabelText('Tandai selesai');
    await userEvent.click(checkBtn);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.updateMilestoneApi)).toHaveBeenCalledWith('proj-123', 'ms-1', {
        isDone: true,
      });
    });
  });

  it('finance: tombol Tambah Fase dan Tambah Milestone TIDAK ditampilkan', async () => {
    useAuthStore.setState({ user: mockFinanceUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));
    await userEvent.click(screen.getByRole('button', { name: /fase & milestone/i }));

    await waitFor(() => screen.getByText('Fase 1: Desain & Arsitektur'));

    expect(screen.queryByRole('button', { name: /tambah fase/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tambah milestone/i })).not.toBeInTheDocument();
  });
});

describe('ProjectDetailPage – Aksi Tutup & Hapus Proyek', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockDetail);
  });

  it('admin: dialog Tutup Proyek muncul dan memanggil closeProjectApi', async () => {
    vi.mocked(apiProjects.closeProjectApi).mockResolvedValue({
      ...mockDetail,
      status: 'ditutup',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    const { container } = renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));

    const closeBtn = container.querySelector('#btn-close-detail-project') as HTMLButtonElement;
    expect(closeBtn).toBeInTheDocument();
    await userEvent.click(closeBtn);

    expect(screen.getByText('Tutup Proyek', { selector: 'h3' })).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /tutup proyek/i });
    // Tombol terakhir adalah konfirmasi di dalam dialog
    await userEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.closeProjectApi)).toHaveBeenCalledWith('proj-123');
    });
  });

  it('admin: dialog Hapus Proyek muncul dan memanggil deleteProjectApi', async () => {
    vi.mocked(apiProjects.deleteProjectApi).mockResolvedValue({
      message: 'Deleted',
      id: 'proj-123',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    const { container } = renderDetailPage(qc);

    await waitFor(() => screen.getByText('Sistem Informasi ERP'));

    const deleteBtn = container.querySelector('#btn-delete-detail-project') as HTMLButtonElement;
    expect(deleteBtn).toBeInTheDocument();
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Hapus Proyek', { selector: 'h3' })).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /^hapus$/i });
    // Tombol terakhir adalah konfirmasi di dalam dialog
    await userEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.deleteProjectApi)).toHaveBeenCalledWith('proj-123');
    });
  });
});
