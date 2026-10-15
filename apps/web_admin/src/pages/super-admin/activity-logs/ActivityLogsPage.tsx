import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  RefreshCw,
  RotateCcw,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  RoleBadge,
} from '@/components/shared';
import { getActivityLogsApi, getUsersApi } from '@/lib/api-super-admin';
import { extractErrorMessage, formatDateTime } from '@/lib/utils';
import type { ActivityLogItem, ActivityLogQueryParams } from '@/types';
import { ActivityLogDetailModal } from './ActivityLogDetailModal';

const columnHelper = legacyCreateColumnHelper<ActivityLogItem>();

const MODULE_LIST = [
  { value: 'all', label: 'Semua Modul' },
  { value: 'USER_MANAGEMENT', label: 'Manajemen Pengguna' },
  { value: 'DEPARTMENT_MANAGEMENT', label: 'Departemen' },
  { value: 'COST_CENTER_MANAGEMENT', label: 'Cost Center' },
  { value: 'MASTER_DATA', label: 'Master Data' },
  { value: 'AUTH', label: 'Autentikasi' },
  { value: 'EXPENSE', label: 'Pengeluaran' },
  { value: 'APPROVAL', label: 'Persetujuan' },
];

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [activeLog, setActiveLog] = useState<ActivityLogItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch users for user filter dropdown
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['super-admin-users-all-lookup'],
    queryFn: () => getUsersApi({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const usersList = useMemo(() => usersData?.data ?? [], [usersData]);

  // Query params for activity logs
  const queryParams: ActivityLogQueryParams = useMemo(() => {
    const params: ActivityLogQueryParams = {
      page,
      limit,
    };
    if (selectedUserId && selectedUserId !== 'all') {
      params.userId = selectedUserId;
    }
    if (selectedModule && selectedModule !== 'all') {
      params.module = selectedModule;
    }
    if (startDate) {
      params.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      params.endDate = new Date(`${endDate}T23:59:59.999Z`).toISOString();
    }
    return params;
  }, [page, limit, selectedUserId, selectedModule, startDate, endDate]);

  const {
    data: logsResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['activity-logs', queryParams],
    queryFn: () => getActivityLogsApi(queryParams),
  });

  const logs = useMemo(() => logsResponse?.data ?? [], [logsResponse]);
  const meta = logsResponse?.meta;

  const hasActiveFilters =
    selectedUserId !== 'all' ||
    selectedModule !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const handleResetFilters = () => {
    setSelectedUserId('all');
    setSelectedModule('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleOpenDetail = (log: ActivityLogItem) => {
    setActiveLog(log);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setActiveLog(null);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (
      act.includes('CREATE') ||
      act.includes('ADD') ||
      act.includes('LOGIN_SUCCESS') ||
      act.includes('REACTIVATE')
    ) {
      return 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RESET')) {
      return 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]';
    }
    if (
      act.includes('DELETE') ||
      act.includes('REMOVE') ||
      act.includes('DEACTIVATE') ||
      act.includes('LOGIN_FAILED')
    ) {
      return 'bg-[#FCE4E7] text-[#B0000F] border-[#F7C3C7]';
    }
    return 'bg-muted/70 text-text-primary border-border';
  };

  const columns = useMemo<LegacyColumnDef<ActivityLogItem, any>[]>(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'Waktu',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">
              {formatDateTime(info.getValue())}
            </span>
            <span className="text-[11px] text-text-secondary font-mono">
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        header: 'Pelaku',
        cell: (info) => {
          const user = info.getValue();
          if (!user) {
            return (
              <span className="text-xs text-text-secondary italic">
                Sistem / Anonim
              </span>
            );
          }
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">
                {user.name}
              </span>
              <span className="text-xs text-text-secondary">{user.email}</span>
              <div>
                <RoleBadge role={user.role} className="text-[10px] px-2 py-0.5" />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('module', {
        header: 'Modul',
        cell: (info) => {
          const mod = info.getValue();
          const found = MODULE_LIST.find((m) => m.value === mod);
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-primary">
                {found ? found.label : mod}
              </span>
              <span className="text-[11px] font-mono text-text-secondary">{mod}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('action', {
        header: 'Aksi',
        cell: (info) => {
          const action = info.getValue();
          return (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-[var(--radius-input)] text-xs font-semibold border ${getActionBadgeClass(
                action,
              )}`}
            >
              {action}
            </span>
          );
        },
      }),
      columnHelper.accessor('ipAddress', {
        header: 'Alamat IP',
        cell: (info) => (
          <span className="text-xs font-mono text-text-secondary">
            {info.getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const log = info.row.original;
          return (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenDetail(log)}
                className="inline-flex items-center gap-1.5 text-xs h-8 px-2.5"
                title="Lihat Detail Log"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Lihat Detail</span>
              </Button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const table = useLegacyTable({
    data: logs,
    columns,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Log Aktivitas
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium bg-navy text-white">
              Audit Append-Only
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Riwayat lengkap audit sistem untuk transparansi, kepatuhan, dan
            investigasi keamanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs h-9"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Security Info Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-[var(--radius-card)] bg-surface border border-border">
        <Shield className="h-4 w-4 text-navy shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Semua aksi penting (perubahan data, persetujuan, akses biaya per jam, dan login)
          dicatat secara permanen. Data rahasia seperti hash kata sandi dan token tidak
          pernah dicatat.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Filter Pengguna */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Pengguna Pelaku
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter pengguna"
                disabled={isLoadingUsers}
                className="w-full h-10 pl-9 pr-8 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:bg-background"
              >
                <option value="all">Semua Pengguna</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Modul */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Modul Sistem
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter modul"
                className="w-full h-10 pl-9 pr-8 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {MODULE_LIST.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tanggal Mulai */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="Tanggal mulai"
              className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Tanggal Akhir */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              aria-label="Tanggal akhir"
              className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Reset Action */}
          <div className="md:col-span-2 flex items-center justify-end">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs h-10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-[var(--radius-card)] bg-surface shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Memuat riwayat log aktivitas sistem..." />
          </div>
        ) : isError ? (
          <div className="py-12 px-6">
            <ErrorState
              message={extractErrorMessage(
                error,
                'Gagal memuat riwayat log aktivitas',
              )}
              onRetry={() => refetch()}
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 px-6">
            <EmptyState
              title="Tidak ada log aktivitas ditemukan"
              description={
                hasActiveFilters
                  ? 'Tidak ada catatan audit yang cocok dengan filter yang dipilih. Silakan atur ulang filter.'
                  : 'Belum ada catatan aktivitas yang tercatat pada sistem.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Hapus Semua Filter</span>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-border bg-background/60"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 align-middle">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-background/50">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Menampilkan baris per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 rounded-[var(--radius-input)] border border-border bg-white text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="hidden sm:inline">
                | Total <strong className="text-text-primary">{meta.total}</strong>{' '}
                log (Halaman {meta.page} dari {meta.totalPages || 1})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary sm:hidden">
                Hal {meta.page} / {meta.totalPages || 1}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1 || isLoading}
                className="h-8 px-2.5 inline-flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page >= (meta.totalPages || 1) || isLoading}
                className="h-8 px-2.5 inline-flex items-center gap-1 text-xs"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Diff */}
      <ActivityLogDetailModal
        open={isDetailOpen}
        log={activeLog}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
