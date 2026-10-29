import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  AlertTriangle,
  Plus,
  CheckCircle,
  XCircle,
  History,
  Info,
  Lock,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getCurrentLimit, getLimitHistory, proposeLimit, confirmLimit } from '@/lib/api-limits';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { LimitChangeRequest, LimitChangeStatus } from '@/types/expenses';

const CHANGE_STATUS_LABELS: Record<LimitChangeStatus, string> = {
  diusulkan: 'Diusulkan',
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  berlaku: 'Berlaku',
  ditolak: 'Ditolak',
};

const CHANGE_STATUS_STYLES: Record<LimitChangeStatus, string> = {
  diusulkan: 'bg-blue-50 text-blue-700',
  menunggu_konfirmasi: 'bg-orange-50 text-orange-700',
  berlaku: 'bg-green-50 text-green-700',
  ditolak: 'bg-[#FCE4E7] text-[#B0000F]',
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

function ProposeModal({ onClose, currentAmount, onSuccess }: { onClose: () => void; currentAmount: number; onSuccess: () => void }) {
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => proposeLimit({ newAmount: parseFloat(newAmount.replace(/\D/g, '')), reason: reason || undefined }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => setError('Gagal mengusulkan. Coba lagi.'),
  });

  const handleAmountInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    const num = parseInt(digits);
    if (!isNaN(num)) {
      setNewAmount(num.toLocaleString('id-ID'));
    } else {
      setNewAmount('');
    }
  };

  const handleSubmit = () => {
    const num = parseFloat(newAmount.replace(/\D/g, ''));
    if (!num || num <= 0) { setError('Masukkan nominal yang valid.'); return; }
    if (num === currentAmount) { setError('Batas baru harus berbeda dari batas saat ini.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Usulkan Perubahan Batas</h2>
        <p className="text-sm text-text-secondary mb-5">
          Batas saat ini: <span className="font-semibold text-text-primary">{formatRupiah(currentAmount)}</span>
        </p>

        <div className="rounded-xl border border-blue-200 bg-[#E8F1FD] p-3 mb-5">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0A47B8]" />
            <p className="text-xs text-[#0A47B8]">
              Perubahan batas memerlukan konfirmasi dari peran berbeda (Admin dan Finance). Batas baru berlaku setelah dikonfirmasi.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="new-limit-amount" className="block text-sm font-medium text-text-primary mb-1.5">
              Batas Baru (Rp) <span className="text-[#B0000F]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-secondary">Rp</span>
              <input
                id="new-limit-amount"
                type="text"
                inputMode="numeric"
                value={newAmount}
                onChange={(e) => handleAmountInput(e.target.value)}
                placeholder="5.000.000"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="limit-reason" className="block text-sm font-medium text-text-primary mb-1.5">
              Alasan Perubahan <span className="text-text-placeholder text-xs">(opsional)</span>
            </label>
            <textarea
              id="limit-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan perubahan batas..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1 text-xs text-[#B0000F]">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Batal</button>
          <button
            id="confirm-propose-limit"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="rounded-xl gradient-primary px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            {mutation.isPending ? 'Mengusulkan...' : 'Ajukan Usulan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ request, onClose, onSuccess }: { request: LimitChangeRequest; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => confirmLimit(request.id, { decision: 'berlaku' }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => setError('Gagal mengonfirmasi. Coba lagi.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => confirmLimit(request.id, { decision: 'ditolak', reason: reason || undefined }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => setError('Gagal menolak. Coba lagi.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Konfirmasi Perubahan Batas</h2>
        <p className="text-sm text-text-secondary mb-5">Diusulkan oleh {request.proposer?.name} ({request.proposerRole})</p>

        <div className="rounded-xl border border-border bg-background p-4 mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Batas Lama</span>
            <span className="font-semibold text-text-primary">{formatRupiah(request.oldAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Batas Baru</span>
            <span className="font-semibold text-primary">{formatRupiah(request.newAmount)}</span>
          </div>
          {request.reason && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-text-placeholder">Alasan: <span className="text-text-secondary">{request.reason}</span></p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="confirm-limit-reason" className="block text-sm font-medium text-text-primary mb-1.5">
            Catatan (opsional saat menyetujui, wajib saat menolak)
          </label>
          <textarea
            id="confirm-limit-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          {error && <p className="mt-1 flex items-center gap-1 text-xs text-[#B0000F]"><AlertTriangle className="h-3 w-3" />{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            id="confirm-limit-reject"
            onClick={() => { if (!reason.trim()) { setError('Alasan wajib diisi saat menolak.'); return; } rejectMutation.mutate(); }}
            disabled={rejectMutation.isPending || approveMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-[#B0000F] hover:bg-[#FCE4E7] disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            {rejectMutation.isPending ? 'Menolak...' : 'Tolak'}
          </button>
          <button
            id="confirm-limit-approve"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl gradient-primary px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            {approveMutation.isPending ? 'Mengonfirmasi...' : 'Konfirmasi Berlaku'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NominalBesarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<LimitChangeRequest | null>(null);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isFinance = role === 'finance';
  const isSuperAdmin = role === 'super_admin';
  const canPropose = isAdmin || isFinance;

  const {
    data: currentLimit,
    isLoading: limitLoading,
    isError: isLimitError,
    error: limitError,
    refetch: refetchLimit,
  } = useQuery({
    queryKey: ['approval-limit'],
    queryFn: getCurrentLimit,
  });

  const {
    data: history = [],
    isLoading: historyLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['limit-history'],
    queryFn: getLimitHistory,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['approval-limit'] });
    queryClient.invalidateQueries({ queryKey: ['limit-history'] });
  };

  // Cari usulan yang menunggu konfirmasi dan bukan milik user sendiri
  const pendingConfirmation = history.find(
    (r) =>
      r.status === 'menunggu_konfirmasi' &&
      r.proposedBy !== user?.id &&
      ((isAdmin && r.proposerRole === 'finance') || (isFinance && r.proposerRole === 'admin')),
  );

  // Cari usulan yang diajukan oleh user sendiri yang sedang menunggu konfirmasi
  const myPendingProposal = history.find(
    (r) => r.status === 'menunggu_konfirmasi' && r.proposedBy === user?.id,
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">Nominal Besar</h1>
            <p className="text-sm text-text-secondary">Batas penanda pengeluaran nominal besar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-text-secondary">
              <Lock className="h-3.5 w-3.5 text-text-placeholder" />
              <span>Mode Baca Saja</span>
            </div>
          )}

          {canPropose && (
            <button
              id="btn-propose-limit"
              onClick={() => setShowProposeModal(true)}
              className="flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Usulkan Perubahan
            </button>
          )}
        </div>
      </div>

      {/* Batas saat ini */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF0DC]">
            <Flag className="h-4 w-4 text-[#B56910]" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">Batas Saat Ini</h2>
        </div>

        {limitLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isLimitError ? (
          <ErrorState
            message={extractErrorMessage(limitError, 'Gagal memuat batas Nominal Besar')}
            onRetry={() => refetchLimit()}
          />
        ) : (
          <>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-text-placeholder mb-1">Batas Nominal Besar</p>
                <p className="font-heading text-4xl font-bold text-text-primary">
                  {currentLimit ? formatRupiah(currentLimit.amount) : <span className="text-text-placeholder text-2xl">Belum ditetapkan</span>}
                </p>
              </div>
              {currentLimit && (
                <div className="border-l border-border pl-6">
                  <p className="text-xs text-text-placeholder mb-1">Berlaku sejak</p>
                  <p className="text-sm font-medium text-text-secondary">{formatDate(currentLimit.effectiveFrom)}</p>
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#E8F1FD] border border-blue-200 p-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#0A47B8]" />
                <p className="text-xs text-[#0A47B8]">
                  Super Admin hanya dapat membaca batas ini (baca saja). Perubahan batas harus diusulkan oleh Admin dan dikonfirmasi oleh Finance, atau sebaliknya.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Usulan Anda Sedang Menunggu Konfirmasi */}
      {myPendingProposal && (
        <div className="rounded-2xl border border-blue-200 bg-[#E8F1FD] p-5">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#0A47B8]" />
            <div>
              <p className="font-semibold text-[#0A2E7F]">Usulan Anda Menunggu Konfirmasi</p>
              <p className="text-sm text-[#0A2E7F] mt-0.5">
                Anda telah mengusulkan perubahan batas menjadi{' '}
                <span className="font-semibold">{formatRupiah(myPendingProposal.newAmount)}</span>. Menunggu konfirmasi dari pihak{' '}
                <span className="font-semibold">{myPendingProposal.proposerRole === 'admin' ? 'Finance' : 'Admin'}</span>.
                Anda tidak dapat mengonfirmasi usulan Anda sendiri.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menunggu konfirmasi */}
      {pendingConfirmation && (
        <div className="rounded-2xl border border-[#F29D38]/40 bg-[#FDF0DC] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B56910]" />
              <div>
                <p className="font-semibold text-[#8A550F]">Menunggu Konfirmasi Anda</p>
                <p className="text-sm text-[#8A550F] mt-0.5">
                  {pendingConfirmation.proposer?.name} ({pendingConfirmation.proposerRole}) mengusulkan perubahan batas dari{' '}
                  <span className="font-semibold">{formatRupiah(pendingConfirmation.oldAmount)}</span> menjadi{' '}
                  <span className="font-semibold">{formatRupiah(pendingConfirmation.newAmount)}</span>.
                </p>
              </div>
            </div>
            <button
              id="btn-confirm-limit"
              onClick={() => setConfirmTarget(pendingConfirmation)}
              className="shrink-0 rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Tinjau & Konfirmasi
            </button>
          </div>
        </div>
      )}

      {/* Riwayat perubahan */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <History className="h-4 w-4 text-text-secondary" />
          <h2 className="font-heading text-base font-semibold text-text-primary">Riwayat Perubahan Batas</h2>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isHistoryError ? (
          <div className="py-6">
            <ErrorState
              message={extractErrorMessage(historyError, 'Gagal memuat riwayat perubahan batas')}
              onRetry={() => refetchHistory()}
            />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-placeholder">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">Belum ada riwayat perubahan batas</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {history.map((req) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-4 hover:bg-background/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    req.status === 'berlaku' ? 'bg-green-100 text-green-700' :
                    req.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                    'bg-orange-50 text-orange-700',
                  )}>
                    {req.status === 'berlaku' ? <CheckCircle className="h-4 w-4" /> :
                     req.status === 'ditolak' ? <XCircle className="h-4 w-4" /> :
                     <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{formatRupiah(req.newAmount)}</span>
                      <span className="text-xs text-text-placeholder">(dari {formatRupiah(req.oldAmount)})</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Diusulkan oleh {req.proposer?.name ?? '-'} • {formatDate(req.createdAt)}
                    </p>
                    {req.confirmer && (
                      <p className="text-xs text-text-placeholder mt-0.5">
                        Dikonfirmasi oleh {req.confirmer.name} • {formatDate(req.decidedAt)}
                      </p>
                    )}
                    {req.reason && (
                      <p className="mt-1 text-xs italic text-text-placeholder">{req.reason}</p>
                    )}
                  </div>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', CHANGE_STATUS_STYLES[req.status])}>
                  {CHANGE_STATUS_LABELS[req.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProposeModal && (
        <ProposeModal
          onClose={() => setShowProposeModal(false)}
          currentAmount={currentLimit ? Number(currentLimit.amount) : 0}
          onSuccess={handleSuccess}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          request={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
