import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/auth';

describe('Header: Profil & Notifikasi Jujur', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: {
        id: 'usr-admin-1',
        name: 'Admin Pratama',
        email: 'pratama@damaco.co.id',
        role: 'admin',
        departmentId: 'dept-1',
        jobTitle: 'Manager',
        avatarUrl: null,
        mustChangePassword: false,
        lastLoginAt: null,
      },
    });
  });

  it('menampilkan dropdown notifikasi dengan pesan jujur "Notifikasi belum tersedia"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header onOpenMobileSidebar={() => {}} />
      </MemoryRouter>
    );

    const notifBtn = screen.getByRole('button', { name: /Notifikasi/i });
    expect(notifBtn).toBeInTheDocument();

    await user.click(notifBtn);

    expect(await screen.findByText('Notifikasi belum tersedia')).toBeInTheDocument();
    expect(screen.getByText(/Layanan backend untuk notifikasi in-app dan push belum diimplementasikan/i)).toBeInTheDocument();
  });

  it('menampilkan menu profil dengan nama, role, tombol Ubah Kata Sandi, dan Keluar', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header onOpenMobileSidebar={() => {}} />
      </MemoryRouter>
    );

    const profileBtn = screen.getByRole('button', { name: /Menu Profil/i });
    expect(profileBtn).toBeInTheDocument();

    await user.click(profileBtn);

    expect(await screen.findByText('pratama@damaco.co.id')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ubah Kata Sandi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keluar dari Akun/i })).toBeInTheDocument();
  });
});
