import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RoleRoute } from '@/components/guards/RoleRoute';
import ForbiddenPage from '@/pages/forbidden/ForbiddenPage';
import type { User } from '@/types';

function createMockUser(role: User['role'], mustChangePassword = false): User {
  return {
    id: 'usr-test',
    name: 'Test User',
    email: `${role}@test.com`,
    role,
    departmentId: 'dept-1',
    jobTitle: 'Staff',
    avatarUrl: null,
    mustChangePassword,
    lastLoginAt: null,
  };
}

function TestRouter({ initialEntries }: { initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Halaman Login Mock</div>} />
        <Route path="/akses-ditolak" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/ganti-kata-sandi" element={<div>Halaman Ganti Kata Sandi Mock</div>} />

          {/* Rute Dasbor - Semua peran admin/finance/super_admin */}
          <Route
            path="/"
            element={
              <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                <div>Halaman Dasbor Mock</div>
              </RoleRoute>
            }
          />

          {/* Rute Khusus Admin & Super Admin */}
          <Route
            path="/proyek"
            element={
              <RoleRoute allowedRoles={['admin', 'super_admin']}>
                <div>Halaman Proyek Mock</div>
              </RoleRoute>
            }
          />

          {/* Rute Khusus Finance */}
          <Route
            path="/pembayaran"
            element={
              <RoleRoute allowedRoles={['finance']}>
                <div>Halaman Pembayaran Mock</div>
              </RoleRoute>
            }
          />

          {/* Rute Khusus Super Admin */}
          <Route
            path="/sistem/pengguna"
            element={
              <RoleRoute allowedRoles={['super_admin']}>
                <div>Halaman Manajemen Pengguna Mock</div>
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Route Guard & Kontrol Akses Berbasis Peran', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('mengarahkan pengunjung yang belum login ke /login', () => {
    render(<TestRouter initialEntries={['/']} />);
    expect(screen.getByText('Halaman Login Mock')).toBeInTheDocument();
  });

  it('mengarahkan akun dengan role "pengguna" ke /akses-ditolak', () => {
    const user = createMockUser('pengguna');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/']} />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    expect(screen.getByText('Pengguna')).toBeInTheDocument();
  });

  it('mengizinkan Admin membuka rute /proyek', () => {
    const user = createMockUser('admin');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/proyek']} />);
    expect(screen.getByText('Halaman Proyek Mock')).toBeInTheDocument();
  });

  it('mengarahkan Admin ke /akses-ditolak saat mencoba membuka rute finance (/pembayaran)', () => {
    const user = createMockUser('admin');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/pembayaran']} />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('mengarahkan Admin ke /akses-ditolak saat mencoba membuka rute sistem (/sistem/pengguna)', () => {
    const user = createMockUser('admin');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/sistem/pengguna']} />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
  });

  it('mengizinkan Finance membuka rute /pembayaran', () => {
    const user = createMockUser('finance');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/pembayaran']} />);
    expect(screen.getByText('Halaman Pembayaran Mock')).toBeInTheDocument();
  });

  it('mengarahkan Finance ke /akses-ditolak saat mencoba membuka rute admin (/proyek)', () => {
    const user = createMockUser('finance');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/proyek']} />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('mengizinkan Super Admin membuka rute sistem (/sistem/pengguna) dan proyek (/proyek)', () => {
    const user = createMockUser('super_admin');
    useAuthStore.getState().setAuth('mock-token', user);

    render(<TestRouter initialEntries={['/sistem/pengguna']} />);
    expect(screen.getByText('Halaman Manajemen Pengguna Mock')).toBeInTheDocument();
  });
});
