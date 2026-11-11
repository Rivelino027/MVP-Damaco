import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { rejectBudgetRequest } from '@/lib/api-budgets';
import type { BudgetRequest } from '@/types/budgets';

interface Props {
  request: BudgetRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectBudgetModal({ request, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => rejectBudgetRequest(request.id, { reason }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: () => setError('Gagal menolak pengajuan. Coba lagi.'),
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Alasan penolakan wajib diisi.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCE4E7]">
              <XCircle className="h-5 w-5 text-[#B0000F]" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary">Tolak Pengajuan Anggaran</h2>
              <p className="text-xs text-text-placeholder">#{request.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-placeholder hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">{request.project?.name}</p>
          </div>
          <p className="text-sm text-text-secondary">
            Pengaju: <span className="font-medium">{request.requestedBy?.name}</span>
          </p>
          <p className="text-sm text-text-secondary">
            Jenis: <span className="font-medium">{request.type === 'awal' ? 'Pengajuan Awal' : 'Perubahan Anggaran'}</span>
          </p>
        </div>

        <div>
          <label htmlFor="reject-budget-reason" className="block text-sm font-medium text-text-primary mb-1.5">
            Alasan Penolakan <span className="text-[#B0000F]">*</span>
          </label>
          <textarea
            id="reject-budget-reason"
            rows={4}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Jelaskan alasan penolakan secara jelas..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          {error && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-[#B0000F]">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
          >
            Batal
          </button>
          <button
            id="confirm-reject-budget"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-[#B0000F] hover:bg-[#FCE4E7] disabled:opacity-60 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            {mutation.isPending ? 'Memproses...' : 'Konfirmasi Tolak'}
          </button>
        </div>
      </div>
    </div>
  );
}
