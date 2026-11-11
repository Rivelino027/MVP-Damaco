import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, XCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { rejectExpenseAdmin, rejectExpenseFinance } from '@/lib/api-expenses';
import { extractErrorMessage } from '@/lib/utils';
import type { Expense } from '@/types/expenses';

interface Props {
  expense: Expense;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectExpenseModal({ expense, onClose, onSuccess }: Props) {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const rejectFn = user?.role === 'finance' ? rejectExpenseFinance : rejectExpenseAdmin;

  const mutation = useMutation({
    mutationFn: () => rejectFn(expense.id, { reason }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      setError(extractErrorMessage(err, 'Gagal menolak pengeluaran. Coba lagi.'));
    },
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
              <h2 className="font-heading text-base font-bold text-text-primary">Tolak Pengeluaran</h2>
              <p className="text-xs text-text-placeholder">#{expense.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-placeholder hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        {expense.isLargeAmount && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#FDF0DC] border border-[#F29D38]/30 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B56910]" />
            <p className="text-xs text-[#8A550F]">
              Ini adalah Nominal Besar. Pastikan alasan penolakan jelas dan terdokumentasi.
            </p>
          </div>
        )}

        <div className="mb-2">
          <p className="text-sm text-text-secondary mb-1">
            Pengaju: <span className="font-medium text-text-primary">{expense.requester?.name}</span>
          </p>
          <p className="text-sm text-text-secondary">
            Proyek: <span className="font-medium text-text-primary">{expense.project?.name}</span>
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="reject-expense-reason" className="block text-sm font-medium text-text-primary mb-1.5">
            Alasan Penolakan <span className="text-[#B0000F]">*</span>
          </label>
          <textarea
            id="reject-expense-reason"
            rows={4}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Jelaskan alasan penolakan agar pengaju dapat memperbaiki pengajuan..."
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
            id="confirm-reject-expense"
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
