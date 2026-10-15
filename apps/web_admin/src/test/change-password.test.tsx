import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChangePasswordPage from '@/pages/change-password/ChangePasswordPage';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import * as api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types';

vi.mock('@/lib/api', () => ({
  changePasswordApi: vi.fn(),
  logoutApi: vi.fn(),
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

function createMockUser(mustChangePassword = false): User {
  return {
    id: 'usr-1',
    name: 'Admin User',
    email: 'admin@perusahaan.com',
    role: 'admin',
    departmentId: 'dept-1',
    jobTitle: 'Manager',
    avatarUrl: null,
    mustChangePassword,
    lastLoginAt: null,
  };
}

describe('Layar Ganti Kata Sandi (ChangePasswordPage) & Pemaksaan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('menampilkan peringatan wajib ganti kata sandi jika mustChangePassword = true', () => {
    const user = createMockUser(true);
    useAuthStore.getState().setAuth('token-123', user);

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Anda wajib mengganti kata sandi sebelum melanjutkan.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /keluar dari akun/i }),
    ).toBeInTheDocument();
  });

  it('memvalidasi aturan form: minimal 10 karakter dan konfirmasi cocok', async () => {
    const user = createMockUser(false);
    useAuthStore.getState().setAuth('token-123', user);
    const userEvt = userEvent.setup();

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    );

    await userEvt.type(screen.getByLabelText(/kata sandi lama/i), 'OldPass123');
    await userEvt.type(screen.getByLabelText(/^kata sandi baru/i), 'short');
    await userEvt.type(screen.getByLabelText(/konfirmasi kata sandi baru/i), 'different');
    await userEvt.click(screen.getByRole('button', { name: /^ganti kata sandi$/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Kata sandi baru minimal 10 karakter'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Konfirmasi kata sandi tidak cocok'),
      ).toBeInTheDocument();
    });
  });

  it('menolak jika kata sandi baru sama dengan kata sandi lama', async () => {
    const user = createMockUser(false);
    useAuthStore.getState().setAuth('token-123', user);
    const userEvt = userEvent.setup();

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    );

    await userEvt.type(screen.getByLabelText(/kata sandi lama/i), 'SamePassword123');
    await userEvt.type(screen.getByLabelText(/^kata sandi baru/i), 'SamePassword123');
    await userEvt.type(screen.getByLabelText(/konfirmasi kata sandi baru/i), 'SamePassword123');
    await userEvt.click(screen.getByRole('button', { name: /^ganti kata sandi$/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Kata sandi baru tidak boleh sama dengan kata sandi lama'),
      ).toBeInTheDocument();
    });
  });

  it('berhasil mengganti kata sandi, mereset mustChangePassword, dan mengarahkan ke dasbor', async () => {
    const user = createMockUser(true);
    useAuthStore.getState().setAuth('token-123', user);
    const userEvt = userEvent.setup();

    vi.mocked(api.changePasswordApi).mockResolvedValueOnce({
      message: 'Kata sandi berhasil diperbarui',
      mustChangePassword: false,
    });

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    );

    await userEvt.type(screen.getByLabelText(/kata sandi lama/i), 'OldPassword123');
    await userEvt.type(screen.getByLabelText(/^kata sandi baru/i), 'NewStrongPassword2026!');
    await userEvt.type(
      screen.getByLabelText(/konfirmasi kata sandi baru/i),
      'NewStrongPassword2026!',
    );
    await userEvt.click(screen.getByRole('button', { name: /^ganti kata sandi$/i }));

    await waitFor(() => {
      expect(api.changePasswordApi).toHaveBeenCalledWith({
        oldPassword: 'OldPassword123',
        newPassword: 'NewStrongPassword2026!',
      });
      expect(useAuthStore.getState().mustChangePassword).toBe(false);
      expect(mockedNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('ProtectedRoute memaksa pengguna dengan mustChangePassword = true untuk diarahkan ke /ganti-kata-sandi', () => {
    const user = createMockUser(true);
    useAuthStore.getState().setAuth('token-123', user);

    render(
      <MemoryRouter initialEntries={['/proyek']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/ganti-kata-sandi" element={<div>Layar Wajib Ganti Password</div>} />
            <Route path="/proyek" element={<div>Halaman Proyek</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Layar Wajib Ganti Password')).toBeInTheDocument();
    expect(screen.queryByText('Halaman Proyek')).not.toBeInTheDocument();
  });
});
