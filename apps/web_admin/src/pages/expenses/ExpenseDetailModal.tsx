import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  Building2,
  Tag,
  Calendar,
  FileText,
  User,
  Paperclip,
  Download,
  Lock,
} from 'lucide-react';
import {
  getExpenseById,
  approveExpenseAdmin,
  verifyExpenseFinance,
  downloadExpenseAttachment,
} from '@/lib/api-expenses';
import { useAuthStore } from '@/stores/auth';
import { cn, extractErrorMessage } from '@/lib/utils';
import type { Expense, ExpenseStatus, ExpenseApprovalHistory } from '@/types/expenses';

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  menunggu_admin: 'Menunggu Admin',
  menunggu_finance: 'Menunggu Finance',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  siap_dibayar: 'Siap Dibayar',
  dibayar: 'Dibayar',
};

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ApprovalChain({ history }: { history: ExpenseApprovalHistory[] }) {
  const steps = [
    { stepOrder: 1, role: 'admin', label: 'Admin' },
    { stepOrder: 2, role: 'finance', label: 'Finance' },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const record = history.find((h) => h.stepOrder === step.stepOrder);
        const isApproved = record?.status === 'disetujui';
        const isRejected = record?.status === 'ditolak';
        const isPending = !record || record.status === 'menunggu';

        return (
          <div key={step.stepOrder} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isApproved && 'bg-green-100 text-green-700',
                  isRejected && 'bg-[#FCE4E7] text-[#B0000F]',
                  isPending && 'bg-gray-100 text-gray-400',
                )}
              >
                {isApproved ? <CheckCircle className="h-4 w-4" /> : isRejected ? <XCircle className="h-4 w-4" /> : step.stepOrder}
              </div>
              <span className="text-[10px] font-medium text-text-secondary">{step.label}</span>
              {record?.actedAt && (
                <span className="text-[9px] text-text-placeholder">
                  {new Date(record.actedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('h-0.5 w-10 mx-1', isApproved ? 'bg-green-400' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  expense: Expense;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPayment?: () => void;
}

export function ExpenseDetailModal({ expense, onClose, onApprove, onReject, onPayment }: Props) {
  const { user } = useAuthStore();
  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isFinance = role === 'finance';

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['expense-detail', expense.id],
    queryFn: () => getExpenseById(expense.id),
  });

  const exp = detail ?? expense;
  const history = exp.approvalHistory ?? [];
  const isRequester = exp.requesterId === user?.id;

  const canApproveAdmin = isAdmin && exp.status === 'menunggu_admin' && !isRequester;
  const canVerifyFinance = isFinance && exp.status === 'menunggu_finance' && !isRequester;
  const canReject =
    ((isAdmin && exp.status === 'menunggu_admin') ||
     (isFinance && exp.status === 'menunggu_finance')) &&
    !isRequester;
  const canRecordPayment = isFinance && exp.status === 'siap_dibayar';

  const approveMutation = useMutation({
    mutationFn: () =>
      isFinance ? verifyExpenseFinance(exp.id) : approveExpenseAdmin(exp.id),
    onSuccess: () => {
      setActionError(null);
      onApprove?.();
    },
    onError: (err: unknown) => {
      setActionError(extractErrorMessage(err, 'Gagal memproses persetujuan'));
    },
  });

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      setDownloadingId(attachmentId);
      setActionError(null);
      const url = await downloadExpenseAttachment(exp.id, attachmentId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Gagal mengunduh berkas nota'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary">Detail Pengeluaran</h2>
              <p className="text-xs text-text-placeholder">#{exp.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {exp.isLargeAmount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0DC] px-3 py-1 text-xs font-semibold text-[#8A550F] border border-[#F29D38]/30">
                <AlertTriangle className="h-3 w-3" />
                Nominal Besar
              </span>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-y-auto p-6 space-y-6">
            {/* Amount hero */}
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Jumlah Pengajuan</p>
              <p className="font-heading text-3xl font-bold text-text-primary">{formatRupiah(exp.amount)}</p>
              <div className="mt-2 flex justify-center">
                <span className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  exp.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                  exp.status === 'dibayar' || exp.status === 'disetujui' ? 'bg-green-50 text-green-700' :
                  'bg-blue-50 text-blue-700'
                )}>
                  {STATUS_LABELS[exp.status]}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: User, label: 'Pengaju', value: exp.requester?.name ?? '-' },
                { icon: Building2, label: 'Departemen', value: exp.requester?.department?.name ?? '-' },
                { icon: Receipt, label: 'Proyek', value: exp.project?.name ?? '-' },
                { icon: Tag, label: 'Kategori', value: exp.category?.name ?? '-' },
                { icon: Building2, label: 'Cost Center', value: exp.costCenter ? `${exp.costCenter.code} – ${exp.costCenter.name}` : '-' },
                { icon: Calendar, label: 'Tanggal Pengeluaran', value: formatDate(exp.expenseDate) },
                { icon: Receipt, label: 'Vendor', value: exp.vendor ?? '-' },
                { icon: Calendar, label: 'Diajukan', value: formatDate(exp.submittedAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FCE4E7]">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-placeholder">{label}</p>
                    <p className="text-sm font-medium text-text-primary">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Catatan */}
            {exp.note && (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-text-secondary" />
                  <p className="text-sm font-semibold text-text-primary">Catatan Pengaju</p>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{exp.note}</p>
              </div>
            )}

            {/* Checklist Finance untuk Nominal Besar */}
            {exp.isLargeAmount && role === 'finance' && exp.status === 'menunggu_finance' && (
              <div className="rounded-xl border border-[#F29D38]/40 bg-[#FDF0DC] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-[#B56910]" />
                  <p className="text-sm font-semibold text-[#8A550F]">Checklist Verifikasi Finance (Nominal Besar)</p>
                </div>
                <div className="space-y-2">
                  {[
                    'Nota / bukti fisik sah telah diperiksa dan sesuai nominal',
                    'Alasan pengajuan dan peruntukan biaya telah diverifikasi',
                    'Pengeluaran tidak terindikasi pemecahan transaksi (split transaction)',
                  ].map((item) => (
                    <label key={item} className="flex items-start gap-2 text-sm text-[#8A550F] cursor-pointer">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#F29D38] text-[#B56910] focus:ring-[#F29D38]" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Flag pengeluaran dipecah */}
            {(exp.flags ?? []).length > 0 && (
              <div className="rounded-xl border border-[#F29D38]/40 bg-[#FDF0DC] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-[#B56910]" />
                  <p className="text-sm font-semibold text-[#8A550F]">Peringatan Sistem</p>
                </div>
                {exp.flags!.map((flag) => (
                  <p key={flag.id} className="text-sm text-[#8A550F]">
                    {flag.flagType === 'terindikasi_dipecah'
                      ? 'Terindikasi pemecahan pengeluaran dari vendor/kategori yang sama dalam 7 hari.'
                      : 'Vendor baru terdeteksi.'}
                  </p>
                ))}
              </div>
            )}

            {/* Lampiran / Nota */}
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-text-secondary" />
                  <p className="text-sm font-semibold text-text-primary">Daftar Nota & Lampiran</p>
                </div>
                {(exp.attachments ?? []).length > 0 && (
                  <span className="text-xs font-medium text-text-secondary">
                    {exp.attachments!.length} berkas
                  </span>
                )}
              </div>

              {(exp.attachments ?? []).length === 0 ? (
                <div className="py-2">
                  <p className="text-xs text-text-placeholder italic">
                    {exp.isLargeAmount
                      ? 'Peringatan: Pengeluaran Nominal Besar ini belum memiliki lampiran nota transaksi.'
                      : 'Tidak ada lampiran nota.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {exp.attachments!.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-white p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 mr-3">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate font-medium text-text-primary">{att.fileName}</span>
                        <span className="text-[11px] text-text-placeholder shrink-0">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.id, att.fileName)}
                        disabled={downloadingId === att.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-primary hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === att.id ? 'Mengunduh...' : 'Unduh'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pesan Kesalahan Aksi Backend */}
            {actionError && (
              <div className="rounded-xl border border-[#B0000F]/30 bg-[#FCE4E7] p-4 text-xs text-[#B0000F] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Aksi Tidak Dapat Diproses</p>
                  <p className="mt-0.5">{actionError}</p>
                </div>
              </div>
            )}

            {/* Rantai Persetujuan */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-4 text-sm font-semibold text-text-primary">Rantai Persetujuan</p>
              <div className="flex items-center gap-4">
                {/* Pengaju */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FCE4E7]">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-text-secondary">Pengaju</span>
                  <span className="text-[9px] text-text-placeholder">{exp.requester?.name?.split(' ')[0] ?? '-'}</span>
                </div>
                <div className="h-0.5 flex-1 bg-border" />
                <ApprovalChain history={history} />
              </div>
            </div>

            {/* Info pembayaran */}
            {exp.payment && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-green-700" />
                  <p className="text-sm font-semibold text-green-800">Informasi Pembayaran</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-green-600">Jumlah Dibayar</p>
                    <p className="font-semibold text-green-800">{formatRupiah(exp.payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Metode</p>
                    <p className="font-semibold text-green-800 capitalize">{exp.payment.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Tanggal Bayar</p>
                    <p className="font-semibold text-green-800">{formatDate(exp.payment.paidAt)}</p>
                  </div>
                  {exp.payment.referenceNo && (
                    <div>
                      <p className="text-xs text-green-600">Nomor Referensi</p>
                      <p className="font-semibold text-green-800">{exp.payment.referenceNo}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div>
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Lock className="h-3.5 w-3.5 text-text-placeholder" />
                <span>Super Admin tidak termasuk rantai persetujuan pengeluaran</span>
              </div>
            )}
            {isRequester && (
              <div className="flex items-center gap-1.5 text-xs text-[#B56910]">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Anda adalah pengaju pengeluaran ini dan tidak dapat menyetujui pengajuan sendiri.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canReject && onReject && (
              <button
                id={`modal-expense-reject-${exp.id}`}
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl border border-[#EBE3E4] bg-white px-4 py-2 text-sm font-medium text-[#B0000F] hover:bg-[#FCE4E7] transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Tolak
              </button>
            )}

            {(canApproveAdmin || canVerifyFinance) && (
              <button
                id={`modal-expense-approve-${exp.id}`}
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                {approveMutation.isPending
                  ? 'Memproses...'
                  : canVerifyFinance
                  ? 'Verifikasi'
                  : 'Setujui'}
              </button>
            )}

            {canRecordPayment && onPayment && (
              <button
                id={`modal-expense-payment-${exp.id}`}
                onClick={onPayment}
                className="flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                Catat Pembayaran
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
