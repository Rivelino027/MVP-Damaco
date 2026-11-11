import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import UserManagementPage from '@/pages/super-admin/users/UserManagementPage';
import { PasswordDisplayDialog } from '@/pages/super-admin/users/PasswordDisplayDialog';
import { UserFormModal } from '@/pages/super-admin/users/UserFormModal';
import * as apiSuperAdmin from '@/lib/api-super-admin';
import { useAuthStore } from '@/stores/auth';
import type { DepartmentItem, SuperAdminUser, User } from '@/types';

// Mock API Super Admin
vi.mock('@/lib/api-super-admin', () => ({
  getUsersApi: vi.fn(),
  getUserApi: vi.fn(),
  createUserApi: vi.fn(),
  updateUserApi: vi.fn(),
  updateUserStatusApi: vi.fn(),
  deleteUserApi: vi.fn(),
  resetUserPasswordApi: vi.fn(),
  getDepartmentsApi: vi.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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
  jobTitle: 'Chief Technology Officer',
  avatarUrl: null,
  mustChangePassword: false,
  lastLoginAt: '2026-10-15T08:00:00.000Z',
};

const mockDepartment: DepartmentItem = {
  id: 'dept-eng',
  name: 'Engineering',
  headUserId: null,
  annualBudget: 500000000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

const mockUsersList: SuperAdminUser[] = [
  {
    id: 'usr-super-1',
    name: 'Budi Super Admin',
    email: 'budi.super@duniayamaya.com',
    role: 'super_admin',
    departmentId: null,
    jobTitle: 'Chief Technology Officer',
    avatarUrl: null,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: '2026-10-15T08:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    department: null,
  },
  {
    id: 'usr-pengguna-2',
    name: 'Siti Staff',
    email: 'siti.staff@duniayamaya.com',
    role: 'pengguna',
    departmentId: 'dept-eng',
    jobTitle: 'Frontend Engineer',
    avatarUrl: null,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: '2026-10-14T10:00:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    deletedAt: null,
    department: { id: 'dept-eng', name: 'Engineering' },
  },
];

describe('Super Admin: Manajemen Pengguna', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth('dummy-token', mockCurrentUser);

    // Default mock responses
    vi.mocked(apiSuperAdmin.getUsersApi).mockResolvedValue({
      data: mockUsersList,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(apiSuperAdmin.getDepartmentsApi).mockResolvedValue({
      data: [mockDepartment],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
  });

  describe('1. Dialog Password Sekali Tampil', () => {
    it('menampilkan kata sandi sementara, peringatan tidak ditampilkan lagi, dan tombol salin', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(
        <PasswordDisplayDialog
          open={true}
          userName="Siti Staff"
          userEmail="siti.staff@duniayamaya.com"
          password="SecretTemporaryPassword123!"
          type="reset"
          onClose={onCloseMock}
        />,
      );

      // Pastikan dialog judul dan teks peringatan tampil
      expect(screen.getByRole('heading', { name: /kata sandi sementara/i })).toBeInTheDocument();
      expect(screen.getByText(/Catat sekarang, tidak akan ditampilkan lagi/i)).toBeInTheDocument();
      expect(screen.getByTestId('generated-password')).toHaveTextContent('SecretTemporaryPassword123!');

      // Salin kata sandi
      const copyButton = screen.getByRole('button', { name: /salin/i });
      await user.click(copyButton);
      expect(writeTextMock).toHaveBeenCalledWith('SecretTemporaryPassword123!');
      expect(await screen.findByText('Tersalin!')).toBeInTheDocument();

      // Klik tombol tutup
      const closeButton = screen.getByRole('button', { name: /saya sudah mencatat & tutup/i });
      await user.click(closeButton);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('dalam UserManagementPage, kata sandi hilang dari state dan DOM setelah dialog ditutup', async () => {
      const user = userEvent.setup();
      vi.mocked(apiSuperAdmin.resetUserPasswordApi).mockResolvedValue({
        message: 'Kata sandi sementara berhasil dibuat',
        userId: 'usr-pengguna-2',
        temporaryPassword: 'TempPassword456!@#',
        mustChangePassword: true,
      });

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserManagementPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Tunggu tabel pengguna muncul
      await waitFor(() => {
        expect(screen.getByText('Siti Staff')).toBeInTheDocument();
      });

      // Klik tombol Reset Password untuk Siti Staff
      const resetButton = screen.getByRole('button', { name: /reset kata sandi siti staff/i });
      await user.click(resetButton);

      // Muncul dialog konfirmasi reset
      expect(screen.getByText('Reset Kata Sandi')).toBeInTheDocument();
      const confirmResetBtn = screen.getByRole('button', { name: /reset sekarang/i });
      await user.click(confirmResetBtn);

      // Dialog password sekali tampil muncul dengan password
      await waitFor(() => {
        expect(screen.getByTestId('generated-password')).toHaveTextContent('TempPassword456!@#');
      });

      // Tutup dialog
      const closeDialogBtn = screen.getByRole('button', { name: /saya sudah mencatat & tutup/i });
      await user.click(closeDialogBtn);

      // Verifikasi dialog ditutup dan kata sandi TIDAK LAGI ada di DOM
      await waitFor(() => {
        expect(screen.queryByTestId('generated-password')).not.toBeInTheDocument();
        expect(screen.queryByText('TempPassword456!@#')).not.toBeInTheDocument();
      });
    });
  });

  describe('2. Pencegahan Aksi Terhadap Diri Sendiri', () => {
    it('menonaktifkan tombol nonaktif dan hapus untuk akun yang sedang login dengan tooltip/title yang tepat', async () => {
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserManagementPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Budi Super Admin')).toBeInTheDocument();
        expect(screen.getByText('Siti Staff')).toBeInTheDocument();
      });

      // Akun sendiri (usr-super-1):
      const selfToggleBtn = screen.getByTestId('toggle-status-button-usr-super-1');
      const selfDeleteBtn = screen.getByTestId('delete-user-button-usr-super-1');

      expect(selfToggleBtn).toBeDisabled();
      expect(selfToggleBtn).toHaveAttribute('title', 'Anda tidak dapat menonaktifkan akun sendiri');

      expect(selfDeleteBtn).toBeDisabled();
      expect(selfDeleteBtn).toHaveAttribute('title', 'Anda tidak dapat menghapus akun sendiri');

      // Akun orang lain (usr-pengguna-2):
      const otherToggleBtn = screen.getByTestId('toggle-status-button-usr-pengguna-2');
      const otherDeleteBtn = screen.getByTestId('delete-user-button-usr-pengguna-2');

      expect(otherToggleBtn).not.toBeDisabled();
      expect(otherDeleteBtn).not.toBeDisabled();
    });
  });

  describe('3. Penanganan Error & Validasi', () => {
    it('menampilkan pesan error dari backend jika data pengguna gagal dimuat', async () => {
      vi.mocked(apiSuperAdmin.getUsersApi).mockRejectedValue(
        new Error('Koneksi ke database gagal atau otorisasi tidak valid'),
      );

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserManagementPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
        expect(screen.getByText('Koneksi ke database gagal atau otorisasi tidak valid')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
      });
    });

    it('memvalidasi keharusan departemen untuk peran Pengguna dan Admin di UserFormModal', async () => {
      const user = userEvent.setup();
      const onSubmitMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <UserFormModal
          open={true}
          userToEdit={null}
          departments={[mockDepartment]}
          onSubmit={onSubmitMock}
          onClose={onCloseMock}
        />,
      );

      // Isi Nama dan Email, biarkan peran Pengguna, kosongkan Departemen
      const nameInput = screen.getByPlaceholderText('Contoh: Ahmad Dahlan');
      const emailInput = screen.getByPlaceholderText('contoh@duniayamaya.com');
      const submitButton = screen.getByRole('button', { name: /buat pengguna/i });

      await user.type(nameInput, 'Calon Pengguna');
      await user.type(emailInput, 'calon@duniayamaya.com');
      await user.click(submitButton);

      // Harus muncul error validasi departemen
      await waitFor(() => {
        expect(screen.getByText('Departemen wajib diisi untuk peran Pengguna dan Admin')).toBeInTheDocument();
      });
      expect(onSubmitMock).not.toHaveBeenCalled();
    });

    it('menampilkan banner error jika backend menolak pembuatan akun (misal email duplikat)', async () => {
      const user = userEvent.setup();
      const onSubmitMock = vi.fn().mockRejectedValue({
        response: {
          data: {
            message: 'Email sudah digunakan',
          },
        },
      });

      render(
        <UserFormModal
          open={true}
          userToEdit={null}
          departments={[mockDepartment]}
          onSubmit={onSubmitMock}
          onClose={vi.fn()}
        />,
      );

      const nameInput = screen.getByPlaceholderText('Contoh: Ahmad Dahlan');
      const emailInput = screen.getByPlaceholderText('contoh@duniayamaya.com');
      const deptSelect = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: /buat pengguna/i });

      await user.type(nameInput, 'Pengguna Baru');
      await user.type(emailInput, 'sudah.ada@duniayamaya.com');
      await user.selectOptions(deptSelect, 'dept-eng');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Gagal:/i)).toBeInTheDocument();
        expect(screen.getByText(/Email sudah digunakan/i)).toBeInTheDocument();
      });
    });
  });
});
