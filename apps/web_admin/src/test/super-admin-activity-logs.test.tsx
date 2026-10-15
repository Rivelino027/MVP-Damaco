import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import ActivityLogsPage from '@/pages/super-admin/activity-logs/ActivityLogsPage';
import { ActivityLogDetailModal } from '@/pages/super-admin/activity-logs/ActivityLogDetailModal';
import * as apiSuperAdmin from '@/lib/api-super-admin';
import { sanitizeAuditData } from '@/lib/utils';
import type { ActivityLogItem, SuperAdminUser } from '@/types';

// Mock API Super Admin
vi.mock('@/lib/api-super-admin', () => ({
  getActivityLogsApi: vi.fn(),
  getUsersApi: vi.fn(),
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

const mockUsers: SuperAdminUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Ahmad Admin',
    email: 'ahmad.admin@duniayamaya.com',
    role: 'admin',
    departmentId: 'dept-1',
    jobTitle: 'Engineering Lead',
    isActive: true,
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: '2026-10-15T08:00:00.000Z',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-finance-1',
    name: 'Siti Finance',
    email: 'siti.finance@duniayamaya.com',
    role: 'finance',
    departmentId: null,
    jobTitle: 'Finance Officer',
    isActive: true,
    avatarUrl: null,
    mustChangePassword: false,
    lastLoginAt: '2026-10-15T08:00:00.000Z',
    deletedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const mockLogs: ActivityLogItem[] = [
  {
    id: 'log-1',
    userId: 'usr-admin-1',
    action: 'CREATE_USER',
    module: 'USER_MANAGEMENT',
    entityId: 'usr-new-99',
    beforeData: null,
    afterData: {
      id: 'usr-new-99',
      name: 'Rudi Pengguna',
      email: 'rudi@duniayamaya.com',
      role: 'pengguna',
    },
    ipAddress: '192.168.1.10',
    createdAt: '2026-10-15T08:30:00.000Z',
    user: {
      id: 'usr-admin-1',
      name: 'Ahmad Admin',
      email: 'ahmad.admin@duniayamaya.com',
      role: 'admin',
    },
  },
  {
    id: 'log-2',
    userId: 'usr-finance-1',
    action: 'UPDATE_DEPARTMENT',
    module: 'DEPARTMENT_MANAGEMENT',
    entityId: 'dept-1',
    beforeData: {
      id: 'dept-1',
      name: 'Eng Dept',
      annualBudget: '400000000',
    },
    afterData: {
      id: 'dept-1',
      name: 'Engineering',
      annualBudget: '500000000',
    },
    ipAddress: '192.168.1.15',
    createdAt: '2026-10-15T09:15:00.000Z',
    user: {
      id: 'usr-finance-1',
      name: 'Siti Finance',
      email: 'siti.finance@duniayamaya.com',
      role: 'finance',
    },
  },
  {
    id: 'log-3',
    userId: null,
    action: 'SYSTEM_CLEANUP',
    module: 'AUTH',
    entityId: null,
    beforeData: { expiredTokensCount: 5 },
    afterData: null,
    ipAddress: null,
    createdAt: '2026-10-15T10:00:00.000Z',
    user: null,
  },
];

describe('Super Admin - Activity Logs Page & Audit Diff', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();

    // Setup clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    vi.mocked(apiSuperAdmin.getUsersApi).mockResolvedValue({
      data: mockUsers,
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });

    vi.mocked(apiSuperAdmin.getActivityLogsApi).mockResolvedValue({
      data: mockLogs,
      meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
    });
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivityLogsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('menampilkan tabel log aktivitas dengan kolom waktu, pelaku, modul, aksi, IP dan tombol detail', async () => {
    renderPage();

    // Verify header and security badge
    expect(
      screen.getByRole('heading', { level: 1, name: /log aktivitas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/audit append-only/i)).toBeInTheDocument();

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('Ahmad Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('Siti Finance')).toBeInTheDocument();
    expect(screen.getByText('Sistem / Anonim')).toBeInTheDocument();
    expect(screen.getByText('CREATE_USER')).toBeInTheDocument();
    expect(screen.getByText('UPDATE_DEPARTMENT')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();

    // Verify detail buttons exist
    const detailButtons = screen.getAllByRole('button', { name: /lihat detail/i });
    expect(detailButtons.length).toBe(3);
  });

  it('bisa memfilter log aktivitas berdasarkan modul', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ahmad Admin')).toBeInTheDocument();
    });

    // Select module 'USER_MANAGEMENT'
    const moduleSelect = screen.getByLabelText(/filter modul/i);
    await user.selectOptions(moduleSelect, 'USER_MANAGEMENT');

    await waitFor(() => {
      expect(apiSuperAdmin.getActivityLogsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'USER_MANAGEMENT',
          page: 1,
        }),
      );
    });
  });

  it('bisa memfilter log aktivitas berdasarkan pengguna', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ahmad Admin')).toBeInTheDocument();
    });

    // Select user 'usr-admin-1'
    const userSelect = screen.getByLabelText(/filter pengguna/i);
    await user.selectOptions(userSelect, 'usr-admin-1');

    await waitFor(() => {
      expect(apiSuperAdmin.getActivityLogsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr-admin-1',
          page: 1,
        }),
      );
    });
  });

  it('bisa memfilter berdasarkan tanggal dan mereset filter kembali ke semula', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ahmad Admin')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText(/tanggal mulai/i);
    const endDateInput = screen.getByLabelText(/tanggal akhir/i);

    await user.type(startDateInput, '2026-10-01');
    await user.type(endDateInput, '2026-10-15');

    await waitFor(() => {
      expect(apiSuperAdmin.getActivityLogsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringContaining('2026-10-01'),
          endDate: expect.stringContaining('2026-10-15'),
        }),
      );
    });

    // Click "Reset Filter"
    const resetButton = screen.getByRole('button', { name: /reset filter/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(startDateInput).toHaveValue('');
      expect(endDateInput).toHaveValue('');
      expect(apiSuperAdmin.getActivityLogsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      );
    });
  });

  it('membuka modal detail saat tombol Lihat Detail diklik dan menampilkan diff sebelum/sesudah', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('UPDATE_DEPARTMENT')).toBeInTheDocument();
    });

    // Click detail button on log-2 (UPDATE_DEPARTMENT)
    const detailButtons = screen.getAllByRole('button', { name: /lihat detail/i });
    await user.click(detailButtons[1]);

    // Modal opens
    expect(
      screen.getByRole('heading', { name: /detail log aktivitas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('log-2')).toBeInTheDocument();
    expect(screen.getByText('dept-1')).toBeInTheDocument();

    // Verify Before and After headers and contents
    expect(screen.getByText(/sebelum perubahan \(before\)/i)).toBeInTheDocument();
    expect(screen.getByText(/sesudah perubahan \(after\)/i)).toBeInTheDocument();
    expect(screen.getByText(/"name": "Eng Dept"/i)).toBeInTheDocument();
    expect(screen.getByText(/"name": "Engineering"/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /tutup modal/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /detail log aktivitas/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('menampilkan teks fallback yang informatif saat beforeData atau afterData bernilai null', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CREATE_USER')).toBeInTheDocument();
    });

    // Click detail on log-1 (CREATE_USER, beforeData is null)
    const detailButtons = screen.getAllByRole('button', { name: /lihat detail/i });
    await user.click(detailButtons[0]);

    expect(
      screen.getByText('Data baru dibuat (tidak ada riwayat sebelumnya)'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"name": "Rudi Pengguna"/i)).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByRole('button', { name: /tutup modal/i }));

    // Click detail on log-3 (afterData is null)
    await user.click(detailButtons[2]);

    expect(
      screen.getByText('Data dihapus (tidak ada riwayat sesudahnya)'),
    ).toBeInTheDocument();
  });

  it('sanitizeAuditData: kunci sensitif TETAP ada namun nilainya diganti "[disembunyikan]"', () => {
    const rawData = {
      id: 'usr-123',
      name: 'Super Secret User',
      password: 'plain_password_123',
      passwordHash: 'argon2$12345678',
      token: 'jwt.token.here',
      refreshToken: 'refresh.token.here',
      accessToken: 'access.token.here',
      secret: 'my-super-secret',
      temporaryPassword: 'temp_pass_xyz',
      initialPassword: 'init_pass_abc',
      profile: {
        bio: 'Hello world',
        nestedPassword: 'nested_should_be_masked',
      },
    };

    const sanitized = sanitizeAuditData(rawData) as Record<string, any>;

    // Kunci non-sensitif tetap apa adanya
    expect(sanitized.id).toBe('usr-123');
    expect(sanitized.name).toBe('Super Secret User');
    expect(sanitized.profile.bio).toBe('Hello world');

    // Kunci sensitif TETAP ADA (tidak dihapus)
    expect('password' in sanitized).toBe(true);
    expect('passwordHash' in sanitized).toBe(true);
    expect('token' in sanitized).toBe(true);
    expect('refreshToken' in sanitized).toBe(true);
    expect('accessToken' in sanitized).toBe(true);
    expect('secret' in sanitized).toBe(true);
    expect('temporaryPassword' in sanitized).toBe(true);
    expect('initialPassword' in sanitized).toBe(true);
    expect('nestedPassword' in sanitized.profile).toBe(true);

    // Nilainya WAJIB diganti "[disembunyikan]"
    expect(sanitized.password).toBe('[disembunyikan]');
    expect(sanitized.passwordHash).toBe('[disembunyikan]');
    expect(sanitized.token).toBe('[disembunyikan]');
    expect(sanitized.refreshToken).toBe('[disembunyikan]');
    expect(sanitized.accessToken).toBe('[disembunyikan]');
    expect(sanitized.secret).toBe('[disembunyikan]');
    expect(sanitized.temporaryPassword).toBe('[disembunyikan]');
    expect(sanitized.initialPassword).toBe('[disembunyikan]');
    expect(sanitized.profile.nestedPassword).toBe('[disembunyikan]');
  });

  it('sanitizeAuditData: immutable — objek asli tidak dimutasi', () => {
    const original = {
      id: 'usr-999',
      password: 'original_plain',
      name: 'Immutable Test',
    };
    const originalPasswordBefore = original.password;

    const sanitized = sanitizeAuditData(original) as Record<string, any>;

    // Hasil sanitasi mengandung placeholder
    expect(sanitized.password).toBe('[disembunyikan]');
    // Objek asli tidak berubah
    expect(original.password).toBe(originalPasswordBefore);
    expect(original.password).toBe('original_plain');
    // Hasil adalah objek BARU, bukan referensi yang sama
    expect(sanitized).not.toBe(original);
  });

  it('sanitizeAuditData: rekursi pada array bersarang', () => {
    const data = [
      { id: '1', token: 'tok-aaa', name: 'Alice' },
      { id: '2', password: 'pw-bbb', name: 'Bob' },
      { id: '3', name: 'Charlie', nested: { secret: 'shhh' } },
    ];

    const result = sanitizeAuditData(data) as Record<string, any>[];

    expect(result[0].id).toBe('1');
    expect(result[0].name).toBe('Alice');
    expect(result[0].token).toBe('[disembunyikan]');

    expect(result[1].id).toBe('2');
    expect(result[1].name).toBe('Bob');
    expect(result[1].password).toBe('[disembunyikan]');

    expect(result[2].name).toBe('Charlie');
    expect(result[2].nested.secret).toBe('[disembunyikan]');
  });

  it('sanitizeAuditData: aman terhadap null, undefined, dan primitif', () => {
    expect(sanitizeAuditData(null)).toBeNull();
    expect(sanitizeAuditData(undefined)).toBeUndefined();
    expect(sanitizeAuditData(42)).toBe(42);
    expect(sanitizeAuditData('plain string')).toBe('plain string');
    expect(sanitizeAuditData(true)).toBe(true);
  });

  it('ActivityLogDetailModal: nilai rahasia TIDAK pernah muncul di DOM; placeholder [disembunyikan] ditampilkan', () => {
    const sensitiveLog: ActivityLogItem = {
      id: 'log-sensitive',
      userId: 'usr-admin-1',
      action: 'UPDATE_USER',
      module: 'USER_MANAGEMENT',
      entityId: 'usr-test',
      beforeData: {
        id: 'usr-test',
        passwordHash: 'old_secret_argon2_hash',
        secret: 'super_secret_key_xyz',
        email: 'test@example.com',
      },
      afterData: {
        id: 'usr-test',
        password: 'raw_password_danger',
        refreshToken: 'refresh_tok_danger_abc',
        accessToken: 'access_tok_danger_def',
        temporaryPassword: 'temp_pw_danger_ghi',
        email: 'test_updated@example.com',
      },
      ipAddress: '127.0.0.1',
      createdAt: '2026-10-15T11:00:00.000Z',
      user: mockUsers[0],
    };

    render(
      <ActivityLogDetailModal
        open={true}
        log={sensitiveLog}
        onClose={vi.fn()}
      />,
    );

    // Data non-sensitif tampil normal
    expect(screen.getByText(/"email": "test@example.com"/i)).toBeInTheDocument();
    expect(
      screen.getByText(/"email": "test_updated@example.com"/i),
    ).toBeInTheDocument();

    // Nama kunci sensitif TETAP muncul (field terlihat oleh auditor)
    expect(screen.getByText(/"passwordHash"/i)).toBeInTheDocument();
    expect(screen.getByText(/"password"/i)).toBeInTheDocument();
    expect(screen.getByText(/"refreshToken"/i)).toBeInTheDocument();

    // Nilai rahasia TIDAK boleh muncul di mana pun
    expect(screen.queryByText(/old_secret_argon2_hash/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/super_secret_key_xyz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw_password_danger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/refresh_tok_danger_abc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/access_tok_danger_def/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/temp_pw_danger_ghi/i)).not.toBeInTheDocument();

    // Placeholder [disembunyikan] muncul (bukan 0, bukan undefined)
    const placeholders = screen.getAllByText(/\[disembunyikan\]/i);
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it('menampilkan state kosong ketika tidak ada log yang ditemukan', async () => {
    vi.mocked(apiSuperAdmin.getActivityLogsApi).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Tidak ada log aktivitas ditemukan'),
      ).toBeInTheDocument();
    });
  });
});
