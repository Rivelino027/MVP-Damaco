import { useQuery } from '@tanstack/react-query';
import { X, Check, Calendar, Clock, AlertTriangle, User, Building, FileText } from 'lucide-react';
import { getTimesheetDetailApi } from '@/lib/api-timesheets';
import { Button, StatusBadge, LoadingState, ErrorState } from '@/components/shared';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type { TimesheetStatus } from '@/types';

interface TimesheetDetailModalProps {
  isOpen: boolean;
  timesheetId: string | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, name: string) => void;
  canApprove: boolean;
  isSuperAdmin: boolean;
  isActionLoading?: boolean;
}

export default function TimesheetDetailModal({
  isOpen,
  timesheetId,
  onClose,
  onApprove,
  onReject,
  canApprove,
  isSuperAdmin,
  isActionLoading = false,
}: TimesheetDetailModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'admin';

  const { data: timesheet, isLoading, error, refetch } = useQuery({
    queryKey: ['timesheet-detail', timesheetId],
    queryFn: () => getTimesheetDetailApi(timesheetId!),
    enabled: isOpen && !!timesheetId,
  });

  if (!isOpen) return null;

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

  const badgeProps = timesheet ? mapStatusToBadge(timesheet.status) : { status: 'menunggu' as const, label: '' };
  const entries = timesheet?.entries ?? [];
  const hasCostAmount = isSuperAdmin && entries.some((e) => e.costAmount !== undefined && e.costAmount !== null);
  const isOwnSubmission = isAdmin && timesheet && (timesheet.userId === currentUser?.id || timesheet.user?.id === currentUser?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-text-primary tracking-tight">
                Detail Timesheet Mingguan
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Rincian jam kerja dan aktivitas tugas anggota tim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && <LoadingState message="Memuat detail timesheet..." />}
          {error && <ErrorState message="Gagal memuat detail timesheet" onRetry={() => refetch()} />}

          {timesheet && (
            <>
              {/* Info Karyawan & Periode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border bg-slate-50/60 p-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Nama Karyawan:</span>
                    <strong className="text-text-primary font-semibold">
                      {timesheet.user?.name ?? '-'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>Departemen:</span>
                    <strong className="text-text-primary font-semibold">
                      {timesheet.user?.department?.name ?? '-'}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Minggu Kerja:</span>
                    <strong className="text-text-primary font-semibold">
                      {formatDate(timesheet.weekStart)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>Status:</span>
                    <StatusBadge status={badgeProps.status} label={badgeProps.label} />
                  </div>
                </div>
              </div>

              {/* Alasan Penolakan Jika Ditolak */}
              {timesheet.status === 'ditolak' && (
                <div className="rounded-xl border border-danger/30 bg-danger-tint p-4 text-xs text-danger flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Timesheet Ditolak</strong>
                    <p>
                      {timesheet.approvalHistory?.find((h) => h.status === 'ditolak')?.reason ??
                        'Timesheet ini telah ditolak oleh Admin.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tabel Entri Harian */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rincian Entri Tugas ({entries.length})
                </h4>

                {entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-text-placeholder">
                    Tidak ada rincian entri tugas pada timesheet ini.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/80 border-b border-border text-text-secondary font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Task & Proyek</th>
                          <th className="py-2.5 px-3">Catatan</th>
                          <th className="py-2.5 px-3 text-right">Jam</th>
                          {hasCostAmount && <th className="py-2.5 px-3 text-right">Biaya (Rp)</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 whitespace-nowrap text-text-secondary">
                              {formatDate(entry.workDate)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-text-primary block">
                                {entry.task?.title ?? 'Tugas'}
                              </span>
                              {entry.task?.project && (
                                <span className="text-[11px] text-text-secondary">
                                  {entry.task.project.name}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-text-secondary max-w-xs truncate">
                              {entry.description || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-text-primary">
                              {entry.hours} jam
                            </td>
                            {hasCostAmount && (
                              <td className="py-2.5 px-3 text-right font-medium text-text-primary">
                                {entry.costAmount != null ? formatCurrency(entry.costAmount) : '-'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50/80 border-t border-border font-bold text-text-primary">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 text-right text-text-secondary font-semibold">
                            Total Jam Kerja:
                          </td>
                          <td className="py-2.5 px-3 text-right text-sm text-primary">
                            {timesheet.totalHours} jam
                          </td>
                          {hasCostAmount && <td className="py-2.5 px-3"></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-slate-50/40">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isActionLoading}>
            Tutup
          </Button>

          {timesheet && canApprove && timesheet.status === 'menunggu_admin' && (
            <div className="flex items-center gap-2.5">
              {isOwnSubmission ? (
                <button
                  type="button"
                  disabled
                  className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-75"
                  title="Anda tidak dapat menyetujui timesheet milik Anda sendiri"
                >
                  Persetujuan Sendiri Tidak Diizinkan
                </button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="reject"
                    size="md"
                    rejectIcon
                    onClick={() => onReject(timesheet.id, timesheet.user?.name ?? 'Pekerja')}
                    disabled={isActionLoading}
                  >
                    Tolak
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => onApprove(timesheet.id)}
                    disabled={isActionLoading}
                  >
                    <Check className="h-4 w-4" />
                    {isActionLoading ? 'Memproses...' : 'Setujui Timesheet'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
