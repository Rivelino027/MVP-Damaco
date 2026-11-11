import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  Filter,
  Check,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import {
  getTeamTimesheetsApi,
  approveTimesheetApi,
  rejectTimesheetApi,
} from '@/lib/api-timesheets';
import { getProjectsApi } from '@/lib/api-projects';
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
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showLaborCost, setShowLaborCost] = useState(false);
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

  // Query projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects-filter-list'],
    queryFn: () => getProjectsApi({ limit: 100 }),
  });
  const projects = projectsData?.data ?? [];

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

  // Client-side search and project filter
  const allTimesheets = data?.data ?? [];
  const filteredTimesheets = allTimesheets.filter((t) => {
    const matchName = !searchTerm.trim() || t.user?.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchProject = projectFilter === 'all' || !t.entries || t.entries.some((e) => e.task?.project?.id === projectFilter);
    return matchName && matchProject;
  });

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Timesheet Tim
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Audit Jam Kerja
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {isSuperAdmin
                ? 'Tinjau dan kelola persetujuan laporan jam kerja seluruh departemen'
                : 'Tinjau dan setujui laporan jam kerja mingguan anggota tim departemen Anda'}
            </p>
          </div>
        </div>

        {/* Super Admin Toggle Biaya Tenaga Kerja */}
        {isSuperAdmin && (
          <Button
            variant={showLaborCost ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setShowLaborCost(!showLaborCost)}
            className="self-start sm:self-auto rounded-xl shadow-xs text-xs font-semibold"
            title="Toggle tampilan biaya per orang (Super Admin)"
          >
            <DollarSign className="h-4 w-4" />
            {showLaborCost ? 'Sembunyikan Biaya Per Orang' : 'Tampilkan Biaya Per Orang'}
          </Button>
        )}
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Antrean Persetujuan Card */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Antrean Persetujuan</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
              Admin Dept
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {allTimesheets.filter((t) => t.status === 'menunggu_admin').length}
            </span>
            <span className="text-xs text-text-placeholder">laporan menunggu</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Rantai Persetujuan</span>
            <span className="text-emerald-700 font-medium">1 Tahap Admin</span>
          </div>
        </div>

        {/* Card 2: Total Jam Kerja */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Jam Kerja</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {filteredTimesheets.reduce((acc, curr) => acc + (Number(curr.totalHours) || 0), 0)}
            </span>
            <span className="text-xs text-text-placeholder">jam tercatat</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 font-medium pt-2 border-t border-slate-100">
            <span>Dalam {filteredTimesheets.length} laporan mingguan</span>
          </div>
        </div>

        {/* Card 3: Aturan SOP */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Kerahasiaan Biaya</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-base font-bold text-text-primary">Perlindungan Tarif Per Jam</span>
            <p className="text-xs text-text-placeholder mt-0.5">Biaya per orang dibatasi server khusus Super Admin</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-600 font-medium pt-2 border-t border-slate-100">
            <span>Audit Keamanan Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama anggota tim..."
            className="h-10 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>

        {/* Filter Proyek */}
        <div className="relative min-w-[180px]">
          <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-border bg-slate-50/50 pl-9 pr-8 text-sm text-text-primary focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
            aria-label="Filter Proyek"
          >
            <option value="all">Semua Proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full appearance-none rounded-xl border border-border bg-slate-50/50 pl-9 pr-8 text-sm text-text-primary focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
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
        <div className="relative min-w-[170px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
          <input
            type="date"
            value={weekStartFilter}
            onChange={(e) => {
              setWeekStartFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-xl border border-border bg-slate-50/50 pl-9 pr-3 text-sm text-text-primary focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
            title="Pilih awal minggu (Senin)"
          />
        </div>

        {/* Reset Filter Button */}
        {(searchTerm || projectFilter !== 'all' || statusFilter !== 'all' || weekStartFilter) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setProjectFilter('all');
              setStatusFilter('all');
              setWeekStartFilter('');
              setCurrentPage(1);
            }}
            className="h-10 text-xs text-text-secondary hover:text-text-primary"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Main Table / Content */}
      <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
        {isLoading && <LoadingState message="Memuat daftar timesheet tim..." />}
        {error && <ErrorState message="Gagal memuat timesheet tim" onRetry={() => refetch()} />}

        {!isLoading && !error && filteredTimesheets.length === 0 && (
          <EmptyState
            title="Tidak Ada Timesheet"
            description={
              searchTerm || statusFilter !== 'all' || weekStartFilter || projectFilter !== 'all'
                ? 'Tidak ditemukan timesheet yang sesuai dengan kriteria filter.'
                : 'Belum ada pengajuan timesheet dari anggota tim.'
            }
            icon={<Clock className="h-8 w-8 text-text-placeholder" />}
          />
        )}

        {!isLoading && !error && filteredTimesheets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-border text-xs text-text-secondary font-semibold uppercase tracking-wider">
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
                  const isOwn = isAdmin && ts.user?.id === currentUser?.id;

                  return (
                    <tr key={ts.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-xs text-slate-700 border border-slate-200/60">
                            {ts.user?.name ? ts.user.name.slice(0, 2).toUpperCase() : 'TK'}
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-sm">
                              {ts.user?.name ?? 'Tanpa Nama'}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {ts.user?.email ?? '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-sm text-text-secondary">
                        {ts.user?.department?.name ?? '-'}
                      </td>

                      <td className="py-3.5 px-4 text-sm text-text-secondary font-medium whitespace-nowrap">
                        {formatDate(ts.weekStart)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          <Clock className="h-3 w-3 text-primary" />
                          {ts.totalHours} jam
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetail(ts.id)}
                            className="h-8 gap-1 px-2.5 text-xs font-medium rounded-lg"
                            title="Lihat Detail Timesheet"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>

                          {/* Tombol aksi persetujuan: Admin tidak boleh menyetujui miliknya sendiri */}
                          {isAwaiting && canApprove && (
                            <>
                              {isOwn ? (
                                <button
                                  disabled
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-400 cursor-not-allowed opacity-70"
                                  title="Anda tidak dapat menyetujui timesheet milik Anda sendiri"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Setujui
                                </button>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="reject"
                                    size="sm"
                                    rejectIcon
                                    onClick={() => handleOpenReject(ts.id, ts.user?.name ?? 'Pekerja')}
                                    disabled={rejectMutation.isPending || approveMutation.isPending}
                                    className="h-8 gap-1 px-2.5 text-xs font-semibold rounded-lg"
                                    title="Tolak Timesheet"
                                  >
                                    Tolak
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => approveMutation.mutate(ts.id)}
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    className="h-8 gap-1 px-2.5 text-xs font-semibold rounded-lg"
                                    title="Setujui Timesheet"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Setujui
                                  </Button>
                                </>
                              )}
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
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-slate-50/60">
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
        isSuperAdmin={isSuperAdmin && showLaborCost}
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
