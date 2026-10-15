import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { SessionInitializer } from '@/components/auth/SessionInitializer';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RoleRoute } from '@/components/guards/RoleRoute';
import ForbiddenPage from '@/pages/forbidden/ForbiddenPage';
import ChangePasswordPage from '@/pages/change-password/ChangePasswordPage';
import { recoverSession, _resetRecoveryPromise } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types';

function createMockUserData(role: User['role'], mustChangePassword = false): User {
  return {
    id: 'usr-123',
    name: 'Budi Santoso',
    email: 'budi@damaco.com',
    role,
    departmentId: 'dept-tech',
    jobTitle: 'Lead',
    avatarUrl: null,
    mustChangePassword,
    lastLoginAt: '2026-10-14T10:00:00Z',
  };
}

function TestRecoveryRouter({ initialEntries }: { initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <SessionInitializer>
        <Routes>
          <Route path="/login" element={<div>Halaman Login Mock</div>} />
          <Route path="/akses-ditolak" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/ganti-kata-sandi" element={<ChangePasswordPage />} />

            <Route
              path="/proyek"
              element={
                <RoleRoute allowedRoles={['admin', 'super_admin']}>
                  <div>Konten Halaman Proyek</div>
                </RoleRoute>
              }
            />

            <Route
              path="/sistem/pengguna"
              element={
                <RoleRoute allowedRoles={['super_admin']}>
                  <div>Konten Manajemen Pengguna</div>
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </SessionInitializer>
    </MemoryRouter>
  );
}

describe('Pemulihan Sesi Single-Flight (Session Recovery on Page Reload)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().logout();
    _resetRecoveryPromise();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().logout();
    _resetRecoveryPromise();
  });

  it('pemulihan sesi berhasil saat reload: merotasi token, memuat profil, dan membuka halaman', async () => {
    sessionStorage.setItem('refreshToken', 'old-refresh-token');

    const adminUser = createMockUserData('admin', false);

    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'fresh-access-token',
        refreshToken: 'rotated-refresh-token-1',
      },
    });

    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: adminUser,
    });

    render(<TestRecoveryRouter initialEntries={['/proyek']} />);

    // Selama proses pemulihan, layar loading tampil
    expect(screen.getByText('Memulihkan sesi...')).toBeInTheDocument();

    // Tunggu pemulihan selesai dan halaman proyek tampil
    expect(await screen.findByText('Konten Halaman Proyek')).toBeInTheDocument();

    // Verifikasi token baru dirotasi dan disimpan
    expect(sessionStorage.getItem('refreshToken')).toBe('rotated-refresh-token-1');
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token');
    expect(useAuthStore.getState().user?.email).toBe('budi@damaco.com');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('pemulihan gagal mengarah ke login dan menghapus sesi jika refresh token tidak valid', async () => {
    sessionStorage.setItem('refreshToken', 'revoked-token');

    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Invalid refresh token (401)'));

    render(<TestRecoveryRouter initialEntries={['/proyek']} />);

    expect(screen.getByText('Memulihkan sesi...')).toBeInTheDocument();

    expect(await screen.findByText('Halaman Login Mock')).toBeInTheDocument();

    // Sesi harus dibersihkan
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('pemulihan gagal mengarah ke login jika GET /auth/me gagal (misal akun nonaktif)', async () => {
    sessionStorage.setItem('refreshToken', 'valid-refresh-token');

    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'fresh-access-token',
        refreshToken: 'rotated-refresh-token',
      },
    });

    // /auth/me gagal dengan 403 akun nonaktif
    vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Akun tidak aktif (403)'));

    render(<TestRecoveryRouter initialEntries={['/proyek']} />);

    expect(await screen.findByText('Halaman Login Mock')).toBeInTheDocument();

    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('panggilan ganda hanya memicu satu /auth/refresh (single-flight)', async () => {
    sessionStorage.setItem('refreshToken', 'token-to-rotate');

    const adminUser = createMockUserData('admin');

    const axiosPostSpy = vi.spyOn(axios, 'post').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        data: {
          accessToken: 'fresh-access-token',
          refreshToken: 'rotated-refresh-token-single',
        },
      };
    });

    vi.spyOn(axios, 'get').mockResolvedValue({
      data: adminUser,
    });

    // Panggil recoverSession secara simultan
    const promise1 = recoverSession();
    const promise2 = recoverSession();
    const promise3 = recoverSession();

    const [res1, res2, res3] = await Promise.all([promise1, promise2, promise3]);

    // Hanya 1 kali pemanggilan POST /auth/refresh
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);

    // Ketiganya menerima data user yang sama
    expect(res1).toEqual(adminUser);
    expect(res2).toEqual(adminUser);
    expect(res3).toEqual(adminUser);

    // Refresh token di sessionStorage telah dirotasi
    expect(sessionStorage.getItem('refreshToken')).toBe('rotated-refresh-token-single');
  });

  it('setelah pulih, admin yang membuka rute Super Admin melihat "Akses ditolak" (bukan login)', async () => {
    sessionStorage.setItem('refreshToken', 'admin-refresh-token');

    const adminUser = createMockUserData('admin', false);

    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'token-admin',
        refreshToken: 'token-admin-rotated',
      },
    });

    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: adminUser,
    });

    render(<TestRecoveryRouter initialEntries={['/sistem/pengguna']} />);

    // Setelah pulih, user dialihkan ke Akses Ditolak oleh RoleRoute
    expect(await screen.findByText('Akses Ditolak')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    // Tidak dialihkan ke login
    expect(screen.queryByText('Halaman Login Mock')).not.toBeInTheDocument();
  });

  it('mustChangePassword tetap dipaksa ke layar ganti kata sandi setelah pemulihan', async () => {
    sessionStorage.setItem('refreshToken', 'must-change-refresh-token');

    // Pengguna dengan mustChangePassword = true
    const userMustChange = createMockUserData('admin', true);

    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'token-temp',
        refreshToken: 'token-temp-rotated',
      },
    });

    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: userMustChange,
    });

    render(<TestRecoveryRouter initialEntries={['/proyek']} />);

    // Harus dipaksa masuk ke layar ganti kata sandi
    expect(
      await screen.findByText('Anda wajib mengganti kata sandi sebelum melanjutkan.'),
    ).toBeInTheDocument();

    // Tidak boleh melihat konten proyek
    expect(screen.queryByText('Konten Halaman Proyek')).not.toBeInTheDocument();
  });
});
