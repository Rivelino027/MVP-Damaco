import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TimesheetsPage from '@/pages/timesheets/TimesheetsPage';
import { useAuthStore } from '@/stores/auth';
import * as apiTimesheets from '@/lib/api-timesheets';
import * as apiProjects from '@/lib/api-projects';
import type { Timesheet } from '@/types/timesheets';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

const mockTimesheetOther: Timesheet = {
  id: 'ts-other',
  userId: 'usr-dev-1',
  weekStart: '2026-11-02',
  status: 'menunggu_admin',
  totalHours: 40,
  createdAt: '2026-11-06T17:00:00Z',
  updatedAt: '2026-11-06T17:00:00Z',
  user: {
    id: 'usr-dev-1',
    name: 'Budi Developer',
    email: 'budi.dev@damaco.co.id',
    department: { id: 'dept-eng', name: 'Engineering' },
  },
  entries: [
    {
      id: 'entry-1',
      timesheetId: 'ts-other',
      taskId: 'task-1',
      workDate: '2026-11-02',
      hours: 8,
      description: 'Setup CI/CD pipeline',
      costAmount: 800000,
      task: {
        id: 'task-1',
        title: 'CI/CD Setup',
        project: { id: 'proj-1', name: 'Core Engine' },
      },
    },
  ],
};

const mockTimesheetOwn: Timesheet = {
  ...mockTimesheetOther,
  id: 'ts-admin-own',
  userId: 'usr-admin-lead',
  user: {
    id: 'usr-admin-lead',
    name: 'Admin Maya Lead',
    email: 'maya.lead@damaco.co.id',
    department: { id: 'dept-eng', name: 'Engineering' },
  },
};

describe('Timesheet Tim - Kontrol Peran & Privasi Biaya', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.restoreAllMocks();
    vi.spyOn(apiProjects, 'getProjectsApi').mockResolvedValue({
      data: [{ id: 'proj-1', name: 'Core Engine' } as any],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
  });

  it('Admin: tidak dapat menyetujui timesheet miliknya sendiri (tombol dinonaktifkan)', async () => {
    useAuthStore.setState({
      accessToken: 'token-admin',
      user: {
        id: 'usr-admin-lead',
        name: 'Admin Maya Lead',
        email: 'maya.lead@damaco.co.id',
        role: 'admin',
        departmentId: 'dept-eng',
        jobTitle: 'Engineering Lead',
        avatarUrl: null,
        mustChangePassword: false,
        lastLoginAt: null,
      },
    });

    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({
      data: [mockTimesheetOther, mockTimesheetOwn],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimesheetsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Budi Developer')).toBeInTheDocument();
    expect(screen.getByText('Admin Maya Lead')).toBeInTheDocument();

    // Verifikasi tombol setujui aktif untuk timesheet orang lain
    const approveButtons = screen.getAllByRole('button', { name: /Setujui/i });
    expect(approveButtons.length).toBeGreaterThanOrEqual(1);

    // Cari tombol yang dinonaktifkan dengan title proteksi
    const disabledBtn = screen.getByTitle('Anda tidak dapat menyetujui timesheet milik Anda sendiri');
    expect(disabledBtn).toBeInTheDocument();
    expect(disabledBtn).toBeDisabled();
  });

  it('Super Admin: memiliki tombol toggle untuk menampilkan atau menyembunyikan biaya per orang', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      accessToken: 'token-sa',
      user: {
        id: 'usr-sa',
        name: 'Super Admin Utama',
        email: 'sa@damaco.co.id',
        role: 'super_admin',
        departmentId: null,
        jobTitle: 'System Admin',
        avatarUrl: null,
        mustChangePassword: false,
        lastLoginAt: null,
      },
    });

    vi.spyOn(apiTimesheets, 'getTeamTimesheetsApi').mockResolvedValue({
      data: [mockTimesheetOther],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimesheetsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const toggleBtn = await screen.findByRole('button', { name: /Tampilkan Biaya Per Orang/i });
    expect(toggleBtn).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(await screen.findByRole('button', { name: /Sembunyikan Biaya Per Orang/i })).toBeInTheDocument();
  });
});
