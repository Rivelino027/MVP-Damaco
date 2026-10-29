import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import {
  getTeamTimesheetsApi,
  approveTimesheetApi,
  rejectTimesheetApi,
} from '@/lib/api-timesheets';
import {
  Button,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  toast,
} from '@/components/shared';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import TimesheetDetailModal from './TimesheetDetailModal';
import RejectTimesheetModal from './RejectTimesheetModal';
import type { TimesheetStatus } from '@/types';

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const canApprove = isAdmin || isSuperAdmin;

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [weekStartFilter, setWeekStartFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rejectModalData, setRejectModalData] = useState<{
    isOpen: boolean;
    timesheetId: string;
    workerName: string;
  }>({
    isOpen: false,
    timesheetId: '',
    workerName: '',
  });

  // Query team timesheets
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['team-timesheets', statusFilter, weekStartFilter, currentPage],
    queryFn: () =>
      getTeamTimesheetsApi({
        status: statusFilter === 'all' ? undefined : statusFilter,
        weekStart: weekStartFilter || undefined,
        page: currentPage,
        limit: pageSize,
      }),
  });

  // Mutations for Approve and Reject
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTimesheetApi(id),
    onSuccess: () => {
      toast.success('Timesheet berhasil disetujui');
      queryClient.invalidateQueries({ queryKey: ['team-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet-detail'] });
      setIsDetailOpen(false);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal menyetujui timesheet'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectTimesheetApi(id, reason),
    onSuccess: () => {
      toast.success('Timesheet berhasil ditolak');
      queryClient.invalidateQueries({ queryKey: ['team-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet-detail'] });
      setRejectModalData({ isOpen: false, timesheetId: '', workerName: '' });
      setIsDetailOpen(false);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal menolak timesheet'));
    },
  });

  const handleOpenDetail = (id: string) => {
    setSelectedTimesheetId(id);
    setIsDetailOpen(true);
  };

  const handleOpenReject = (id: string, workerName: string) => {
    setRejectModalData({
      isOpen: true,
      timesheetId: id,
      workerName,
    });
  };

  const mapStatusToBadge = (status: TimesheetStatus) => {
    switch (status) {
      case 'draft':
        return { status: 'draft' as const, label: 'Draft' };
      case 'menunggu_admin':
        return { status: 'menunggu' as const, label: 'Menunggu Admin' };
      case 'disetujui':
        return { status: 'disetujui' as const, label: 'Disetujui' };
      case 'ditolak':
        return { status: 'ditolak' as const, label: 'Ditolak' };
      default:
        return { status: 'menunggu' as const, label: status };
    }
  };

  // Client-side search filter for worker name
  const allTimesheets = data?.data ?? [];
  const filteredTimesheets = searchTerm.trim()
    ? allTimesheets.filter((t) =>
        t.user?.name.toLowerCase().includes(searchTerm.toLowerCase().trim()),
      )
    : allTimesheets;

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-primary" />
            Timesheet Tim
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isSuperAdmin
              ? 'Tinjau dan kelola persetujuan laporan jam kerja seluruh departemen'
              : 'Tinjau dan setujui laporan jam kerja mingguan anggota tim departemen Anda'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama anggota tim..."
            className="w-full rounded-[var(--radius-input)] border border-border bg-white pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-secondary shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[var(--radius-input)] border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Status"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu_admin">Menunggu Admin</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Filter Week Start */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary shrink-0" />
          <input
            type="date"
            value={weekStartFilter}
            onChange={(e) => {
              setWeekStartFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[var(--radius-input)] border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            title="Pilih awal minggu (Senin)"
          />
          {weekStartFilter && (
            <button
              onClick={() => setWeekStartFilter('')}
              className="text-xs text-text-secondary hover:text-text-primary underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="rounded-[var(--radius-card)] border border-border bg-white shadow-xs overflow-hidden">
        {isLoading && <LoadingState message="Memuat daftar timesheet tim..." />}
        {error && <ErrorState message="Gagal memuat timesheet tim" onRetry={() => refetch()} />}

        {!isLoading && !error && filteredTimesheets.length === 0 && (
          <EmptyState
            title="Tidak Ada Timesheet"
            description={
              searchTerm || statusFilter !== 'all' || weekStartFilter
                ? 'Tidak ditemukan timesheet yang sesuai dengan kriteria filter.'
                : 'Belum ada pengajuan timesheet dari anggota tim.'
            }
            icon={<Clock className="h-8 w-8 text-text-placeholder" />}
          />
        )}

        {!isLoading && !error && filteredTimesheets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#FBF7F7] border-b border-border text-xs text-text-secondary font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Anggota Tim</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Minggu Kerja</th>
                  <th className="py-3 px-4 text-center">Total Jam</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTimesheets.map((ts) => {
                  const badgeProps = mapStatusToBadge(ts.status);
                  const isAwaiting = ts.status === 'menunggu_admin';

                  return (
                    <tr key={ts.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-tint font-bold text-xs text-navy border border-blue/20">
                            {ts.user?.name ? ts.user.name.slice(0, 2).toUpperCase() : 'TK'}
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary">
                              {ts.user?.name ?? 'Tanpa Nama'}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {ts.user?.email ?? '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-text-secondary">
                        {ts.user?.department?.name ?? '-'}
                      </td>

                      <td className="py-3.5 px-4 text-text-secondary font-medium whitespace-nowrap">
                        {formatDate(ts.weekStart)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF7F7] border border-border px-2.5 py-0.5 text-xs font-semibold text-text-primary">
                          <Clock className="h-3 w-3 text-primary" />
                          {ts.totalHours} jam
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(ts.id)}
                            className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-neutral-50 transition-colors"
                            title="Lihat Detail Timesheet"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </button>

                          {isAwaiting && canApprove && (
                            <>
                              <button
                                onClick={() => handleOpenReject(ts.id, ts.user?.name ?? 'Pekerja')}
                                disabled={rejectMutation.isPending || approveMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-[#B0000F] hover:bg-[#FCE4E7] transition-colors disabled:opacity-50"
                                title="Tolak Timesheet"
                              >
                                <X className="h-3.5 w-3.5" />
                                Tolak
                              </button>
                              <button
                                onClick={() => approveMutation.mutate(ts.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-[var(--radius-button)] bg-gradient-to-r from-[#E8141C] to-[#B0000F] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-50"
                                title="Setujui Timesheet"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Setujui
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && !error && filteredTimesheets.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-[#FBF7F7]">
            <p className="text-xs text-text-secondary">
              Halaman <span className="font-semibold text-text-primary">{currentPage}</span> dari{' '}
              <span className="font-semibold text-text-primary">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TimesheetDetailModal
        isOpen={isDetailOpen}
        timesheetId={selectedTimesheetId}
        onClose={() => setIsDetailOpen(false)}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id, name) => handleOpenReject(id, name)}
        canApprove={canApprove}
        isSuperAdmin={isSuperAdmin}
        isActionLoading={approveMutation.isPending || rejectMutation.isPending}
      />

      <RejectTimesheetModal
        isOpen={rejectModalData.isOpen}
        timesheetId={rejectModalData.timesheetId}
        workerName={rejectModalData.workerName}
        onClose={() =>
          setRejectModalData({ isOpen: false, timesheetId: '', workerName: '' })
        }
        onConfirm={async (id, reason) => {
          await rejectMutation.mutateAsync({ id, reason });
        }}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
