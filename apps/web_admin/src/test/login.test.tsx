import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/login/LoginPage';
import * as api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AxiosError, type AxiosResponse } from 'axios';

// Mock api module
vi.mock('@/lib/api', () => ({
  loginApi: vi.fn(),
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

function createAxiosError(status: number, message: string) {
  const error = new AxiosError(message);
  error.response = {
    status,
    data: { message, statusCode: status },
    statusText: 'Error',
    headers: {},
    config: { headers: {} as never },
  } as AxiosResponse;
  return error;
}

describe('Halaman Login (LoginPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('menampilkan form login dengan elemen lengkap sesuai panduan desain', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Masuk ke Akun')).toBeInTheDocument();
    expect(screen.getByText('Khusus Admin, Finance & Super Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Kata Sandi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
    expect(
      screen.getByText('Peran Anda ditentukan oleh akun yang diberikan administrator.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('© PT. Dunia Maya Communica').length).toBeGreaterThan(0);
  });

  it('menampilkan info saat tombol Lupa kata sandi diklik', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const forgotBtn = screen.getByRole('button', { name: /lupa kata sandi/i });
    await user.click(forgotBtn);

    expect(
      screen.getByText('Hubungi Super Admin untuk reset kata sandi Anda.'),
    ).toBeInTheDocument();
  });

  it('menampilkan pesan error "Email atau kata sandi salah" pada error 401', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockRejectedValueOnce(
      createAxiosError(401, 'Email atau kata sandi salah'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'admin@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'WrongPassword123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email atau kata sandi salah');
    });
  });

  it('menampilkan pesan error "Akun tidak aktif, hubungi administrator" pada 403 nonaktif', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockRejectedValueOnce(
      createAxiosError(403, 'Akun tidak aktif, hubungi administrator'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'inactive@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'Password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Akun tidak aktif, hubungi administrator',
      );
    });
  });

  it('menampilkan pesan banner "Akun Pengguna tidak dapat masuk ke Web Admin" pada 403 peran pengguna', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockRejectedValueOnce(
      createAxiosError(403, 'Akun Pengguna tidak dapat masuk ke Web Admin'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'pengguna@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'Password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Akun Pengguna tidak dapat masuk ke Web Admin',
      );
    });
  });

  it('menampilkan pesan error rate limit pada 429', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockRejectedValueOnce(
      createAxiosError(429, 'Too Many Requests'),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'test@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'Password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Terlalu banyak percobaan login',
      );
    });
  });

  it('berhasil login dan mengarahkan ke dasbor jika mustChangePassword = false', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockResolvedValueOnce({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      mustChangePassword: false,
      user: {
        id: 'usr-1',
        name: 'Admin User',
        email: 'admin@perusahaan.com',
        role: 'admin',
        departmentId: 'dep-1',
        jobTitle: 'Manager',
        avatarUrl: null,
        mustChangePassword: false,
        lastLoginAt: null,
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'admin@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'Password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('fake-access-token');
      expect(sessionStorage.getItem('refreshToken')).toBe('fake-refresh-token');
      expect(mockedNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('berhasil login dan mengarahkan ke /ganti-kata-sandi jika mustChangePassword = true', async () => {
    const user = userEvent.setup();
    vi.mocked(api.loginApi).mockResolvedValueOnce({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      mustChangePassword: true,
      user: {
        id: 'usr-2',
        name: 'New Admin',
        email: 'newadmin@perusahaan.com',
        role: 'admin',
        departmentId: 'dep-1',
        jobTitle: 'Admin',
        avatarUrl: null,
        mustChangePassword: true,
        lastLoginAt: null,
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'newadmin@perusahaan.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'TempPassword16!');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/ganti-kata-sandi', { replace: true });
    });
  });
});
