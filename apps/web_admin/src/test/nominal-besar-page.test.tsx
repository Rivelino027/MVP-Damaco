import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import NominalBesarPage from '@/pages/expenses/NominalBesarPage';
import * as apiLimits from '@/lib/api-limits';
import type { LimitChangeRequest } from '@/types/expenses';
import type { User } from '@/types';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function mockUser(role: User['role'], id: string, name: string): User {
  return {
    id,
    name,
    email: `${role}@damaco.com`,
    role,
    departmentId: 'dept-1',
    jobTitle: 'Staff',
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

const mockLimitHistory: LimitChangeRequest[] = [
  {
    id: 'req-1',
    oldAmount: 5000000,
    newAmount: 10000000,
    reason: 'Penyesuaian inflasi proyek besar',
    proposedBy: 'usr-admin-1',
    proposerRole: 'admin',
    confirmedBy: 'usr-fin-1',
    confirmerRole: 'finance',
    status: 'berlaku',
    createdAt: '2026-09-01T10:00:00Z',
    decidedAt: '2026-09-02T11:00:00Z',
    proposer: { id: 'usr-admin-1', name: 'Admin Doni' },
    confirmer: { id: 'usr-fin-1', name: 'Finance Rina' },
  },
  {
    id: 'req-2',
    oldAmount: 10000000,
    newAmount: 15000000,
    reason: 'Kebutuhan procurement Q4',
    proposedBy: 'usr-admin-1',
    proposerRole: 'admin',
    confirmedBy: null,
    confirmerRole: null,
    status: 'menunggu_konfirmasi',
    createdAt: '2026-10-20T10:00:00Z',
    decidedAt: null,
    proposer: { id: 'usr-admin-1', name: 'Admin Doni' },
    confirmer: null,
  },
];

describe('Halaman Nominal Besar (Langkah 5)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
    vi.spyOn(apiLimits, 'getCurrentLimit').mockResolvedValue({
      id: 'lim-1',
      amount: 10000000,
      effectiveFrom: '2026-09-02T11:00:00Z',
      status: 'berlaku',
      confirmedAt: '2026-09-02T11:00:00Z',
    });
  });

  it('Super Admin: melihat batas dalam mode baca saja dengan indikator gembok', async () => {
    useAuthStore.setState({
      accessToken: 'token-sa',
      user: mockUser('super_admin', 'usr-sa', 'Super Admin'),
    });

    vi.spyOn(apiLimits, 'getLimitHistory').mockResolvedValue(mockLimitHistory);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Mode Baca Saja')).toBeInTheDocument();
    expect(
      await screen.findByText(/Super Admin hanya dapat membaca batas ini \(baca saja\)/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usulkan Perubahan/i })).not.toBeInTheDocument();
  });

  it('Finance: melihat tombol konfirmasi jika usulan diajukan oleh Admin (peran lain)', async () => {
    useAuthStore.setState({
      accessToken: 'token-fin',
      user: mockUser('finance', 'usr-fin-2', 'Finance Sarah'),
    });

    vi.spyOn(apiLimits, 'getLimitHistory').mockResolvedValue(mockLimitHistory);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Menunggu Konfirmasi Anda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tinjau & Konfirmasi/i })).toBeInTheDocument();
  });

  it('Pengusul sendiri (Admin Doni): tidak melihat tombol konfirmasi untuk usulannya sendiri', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: mockUser('admin', 'usr-admin-1', 'Admin Doni'),
    });

    vi.spyOn(apiLimits, 'getLimitHistory').mockResolvedValue(mockLimitHistory);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Menunggu konfirmasi peran lain')).toBeInTheDocument();
    expect(
      screen.getByText(/Anda tidak dapat mengonfirmasi usulan Anda sendiri/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tinjau & Konfirmasi/i })).not.toBeInTheDocument();
  });

  it('Riwayat perubahan batas: menampilkan nama pengusul, pengonfirmasi, dan status', async () => {
    useAuthStore.setState({
      accessToken: 'token-fin',
      user: mockUser('finance', 'usr-fin-2', 'Finance Sarah'),
    });

    vi.spyOn(apiLimits, 'getLimitHistory').mockResolvedValue(mockLimitHistory);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NominalBesarPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Riwayat Perubahan Batas')).toBeInTheDocument();
    const proposers = await screen.findAllByText(/Diusulkan oleh Admin Doni/i);
    expect(proposers.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Dikonfirmasi oleh Finance Rina/i)).toBeInTheDocument();
  });
});
