import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProjectKanbanPage from '@/pages/projects/ProjectKanbanPage';
import { ToastContainer } from '@/components/shared';
import * as apiProjects from '@/lib/api-projects';
import { useAuthStore } from '@/stores/auth';
import type { TaskItem, ProjectDetail, User, PaginatedResponse } from '@/types';

// ─── Mocks ───────────────────────────────────────────────

vi.mock('@/lib/api-projects', () => ({
  getProjectApi: vi.fn(),
  getTasksApi: vi.fn(),
  getTaskApi: vi.fn(),
  createTaskApi: vi.fn(),
  updateTaskApi: vi.fn(),
  updateTaskStatusApi: vi.fn(),
  deleteTaskApi: vi.fn(),
  createChecklistApi: vi.fn(),
  updateChecklistApi: vi.fn(),
  deleteChecklistApi: vi.fn(),
  createCommentApi: vi.fn(),
  deleteCommentApi: vi.fn(),
  getAttachmentsApi: vi.fn(),
  uploadAttachmentApi: vi.fn(),
  downloadAttachmentApi: vi.fn(),
  deleteAttachmentApi: vi.fn(),
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

const mockProjectDetail: ProjectDetail = {
  id: 'proj-123',
  name: 'Sistem Informasi ERP',
  description: 'Proyek ERP',
  departmentId: 'dept-1',
  department: { id: 'dept-1', name: 'Information Technology' },
  costCenterId: 'cc-1',
  costCenter: { id: 'cc-1', code: 'IT-001', name: 'IT Infrastructure' },
  projectTypeId: null,
  projectType: null,
  status: 'berjalan',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  progressPercent: 50,
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
        jobTitle: 'Developer',
        avatarUrl: null,
      },
    },
  ],
  phases: [
    {
      id: 'phase-1',
      projectId: 'proj-123',
      name: 'Fase 1: Desain',
      sortOrder: 1,
      startDate: null,
      endDate: null,
      createdAt: '',
      updatedAt: '',
    },
  ],
  milestones: [],
};

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    projectId: 'proj-123',
    phaseId: 'phase-1',
    title: 'Buat Wireframe UI',
    description: 'Wireframe untuk layar dasbor dan proyek',
    status: 'belum_mulai',
    priority: 'tinggi',
    assigneeId: 'usr-dev-1',
    assignee: {
      id: 'usr-dev-1',
      name: 'Andi Developer',
      email: 'andi@test.com',
      avatarUrl: null,
    },
    dueDate: '2026-03-01T00:00:00.000Z',
    estimatedHours: 12,
    actualHours: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: {
      checklists: 2,
      comments: 1,
      attachments: 0,
    },
  },
  {
    id: 'task-2',
    projectId: 'proj-123',
    phaseId: null,
    title: 'Setup Database Migration',
    description: 'Migrasi database MariaDB',
    status: 'dikerjakan',
    priority: 'sedang',
    assigneeId: null,
    assignee: null,
    dueDate: null,
    estimatedHours: 6,
    actualHours: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: {
      checklists: 0,
      comments: 0,
      attachments: 1,
    },
  },
];

const mockTaskPaginated: PaginatedResponse<TaskItem> = {
  data: mockTasks,
  meta: { total: 2, page: 1, limit: 200, totalPages: 1 },
};

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderKanbanPage(qc: QueryClient, initialRoute = '/proyek/proj-123/task') {
  return render(
    <QueryClientProvider client={qc}>
      <ToastContainer />
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/proyek/:id" element={<div>Halaman Detail Proyek</div>} />
          <Route path="/proyek/:id/task" element={<ProjectKanbanPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────

describe('ProjectKanbanPage – Tampilan Papan & Kartu', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockProjectDetail);
    vi.mocked(apiProjects.getTasksApi).mockResolvedValue(mockTaskPaginated);
  });

  it('menampilkan 4 kolom papan Kanban dengan nama kolom yang benar', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Belum Mulai')).toBeInTheDocument();
      expect(screen.getByText('Dikerjakan')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Selesai')).toBeInTheDocument();
    });
  });

  it('menampilkan kartu task pada kolom yang sesuai', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => {
      expect(screen.getByText('Buat Wireframe UI')).toBeInTheDocument();
      expect(screen.getByText('Setup Database Migration')).toBeInTheDocument();
      expect(screen.getAllByText('Andi Developer').length).toBeGreaterThan(0);
    });
  });

  it('tombol Kembali mengarahkan ke halaman detail proyek', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));

    const backBtn = screen.getByLabelText(/kembali ke detail proyek/i);
    await userEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Halaman Detail Proyek')).toBeInTheDocument();
    });
  });
});

describe('ProjectKanbanPage – Kontrol Peran & Perubahan Status', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockProjectDetail);
    vi.mocked(apiProjects.getTasksApi).mockResolvedValue(mockTaskPaginated);
  });

  it('admin: menampilkan tombol Tambah Task dan tombol geser status pada kartu', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));

    expect(screen.getByRole('button', { name: /^tambah task$/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Kolom berikutnya').length).toBeGreaterThan(0);
  });

  it('finance: TIDAK menampilkan tombol Tambah Task dan tombol geser status (read-only)', async () => {
    useAuthStore.setState({ user: mockFinanceUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));

    expect(screen.queryByRole('button', { name: /tambah task/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kolom berikutnya')).not.toBeInTheDocument();
  });

  it('admin: klik tombol geser status memanggil updateTaskStatusApi ke status berikutnya', async () => {
    vi.mocked(apiProjects.updateTaskStatusApi).mockResolvedValue({
      ...mockTasks[0],
      status: 'dikerjakan',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    const { container } = renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));

    const nextBtn = container.querySelector('#btn-next-status-task-1') as HTMLButtonElement;
    expect(nextBtn).toBeInTheDocument();
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.updateTaskStatusApi)).toHaveBeenCalledWith('task-1', 'dikerjakan');
    });
  });
});

describe('ProjectKanbanPage – Modal Detail & Kolaborasi Task', () => {
  beforeEach(() => {
    vi.mocked(apiProjects.getProjectApi).mockResolvedValue(mockProjectDetail);
    vi.mocked(apiProjects.getTasksApi).mockResolvedValue(mockTaskPaginated);
    vi.mocked(apiProjects.getTaskApi).mockResolvedValue({
      ...mockTasks[0],
      checklists: [
        { id: 'cl-1', taskId: 'task-1', text: 'Sketsa di Figma', isDone: false, createdAt: '' },
      ],
      comments: [
        {
          id: 'cm-1',
          taskId: 'task-1',
          userId: 'usr-admin-1',
          body: 'Segera selesaikan minggu ini ya',
          createdAt: '2026-01-02T00:00:00.000Z',
          user: { id: 'usr-admin-1', name: 'Budi Admin', avatarUrl: null },
        },
      ],
      attachments: [],
    } as any);
  });

  it('klik kartu membuka modal detail task dan menampilkan checklist serta komentar', async () => {
    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));

    // Klik kartu task 1
    await userEvent.click(screen.getByText('Buat Wireframe UI'));

    // Modal terbuka
    await waitFor(() => {
      expect(screen.getByText('Sketsa di Figma')).toBeInTheDocument();
    });

    // Pindah ke tab komentar
    const tabComment = screen.getByRole('button', { name: /komentar/i });
    await userEvent.click(tabComment);

    await waitFor(() => {
      expect(screen.getByText('Segera selesaikan minggu ini ya')).toBeInTheDocument();
    });
  });

  it('admin: centang checklist memanggil updateChecklistApi', async () => {
    vi.mocked(apiProjects.updateChecklistApi).mockResolvedValue({
      id: 'cl-1',
      taskId: 'task-1',
      text: 'Sketsa di Figma',
      isDone: true,
      createdAt: '',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));
    await userEvent.click(screen.getByText('Buat Wireframe UI'));

    await waitFor(() => screen.getByText('Sketsa di Figma'));

    // Klik item checklist untuk toggle
    await userEvent.click(screen.getByText('Sketsa di Figma'));

    await waitFor(() => {
      expect(vi.mocked(apiProjects.updateChecklistApi)).toHaveBeenCalledWith('task-1', 'cl-1', {
        isDone: true,
      });
    });
  });

  it('admin: menambah checklist memanggil createChecklistApi', async () => {
    vi.mocked(apiProjects.createChecklistApi).mockResolvedValue({
      id: 'cl-2',
      taskId: 'task-1',
      text: 'Review prototipe',
      isDone: false,
      createdAt: '',
    });

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));
    await userEvent.click(screen.getByText('Buat Wireframe UI'));

    await waitFor(() => screen.getByPlaceholderText(/tambah butir checklist baru/i));

    const input = screen.getByPlaceholderText(/tambah butir checklist baru/i);
    await userEvent.type(input, 'Review prototipe');

    const addBtn = screen.getByRole('button', { name: /^tambah$/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(vi.mocked(apiProjects.createChecklistApi)).toHaveBeenCalledWith(
        'task-1',
        'Review prototipe',
      );
    });
  });

  it('validasi ukuran berkas lampiran: tolak file 11 MB tanpa panggil API dan terima file 1 MB', async () => {
    vi.mocked(apiProjects.uploadAttachmentApi).mockResolvedValue({
      id: 'att-1',
      taskId: 'task-1',
      originalName: 'file-1mb.pdf',
      mimeType: 'application/pdf',
      size: 1024 * 1024,
      uploadedById: 'usr-admin-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(apiProjects.getAttachmentsApi).mockResolvedValue([]);

    useAuthStore.setState({ user: mockAdminUser, isAuthenticated: true, accessToken: 'tok' });
    const qc = createQC();
    renderKanbanPage(qc);

    await waitFor(() => screen.getByText('Buat Wireframe UI'));
    await userEvent.click(screen.getByText('Buat Wireframe UI'));

    // Pindah ke tab lampiran
    const tabAttachment = screen.getByRole('button', { name: /lampiran/i });
    await userEvent.click(tabAttachment);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // 1. File 11 MB (> 10 MB): tolak, tampilkan pesan error, jangan panggil API unggah
    const file11MB = new File(['x'], 'file-11mb.pdf', { type: 'application/pdf' });
    Object.defineProperty(file11MB, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file11MB] } });

    // Pesan error tampil
    expect(await screen.findByText('Ukuran file melebihi 10 MB')).toBeInTheDocument();
    // API unggah TIDAK dipanggil
    expect(vi.mocked(apiProjects.uploadAttachmentApi)).not.toHaveBeenCalled();

    // 2. File 1 MB (<= 10 MB): terima dan panggil API unggah
    const file1MB = new File(['x'], 'file-1mb.pdf', { type: 'application/pdf' });
    Object.defineProperty(file1MB, 'size', { value: 1 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file1MB] } });

    await waitFor(() => {
      expect(vi.mocked(apiProjects.uploadAttachmentApi)).toHaveBeenCalledWith('task-1', file1MB);
    });
  });
});
