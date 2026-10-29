import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, CreditCard, AlertTriangle, Calendar } from 'lucide-react';
import { recordPayment } from '@/lib/api-expenses';
import type { Expense, PaymentMethod } from '@/types/expenses';

interface Props {
  expense: Expense;
  onClose: () => void;
  onSuccess: () => void;
}

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

export function RecordPaymentModal({ expense, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [paidAt, setPaidAt] = useState(today);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment(expense.id, {
        method,
        referenceNo: referenceNo.trim() || undefined,
        paidAt,
      }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: () => {
      setError('Gagal mencatat pembayaran. Coba lagi.');
    },
  });

  const handleSubmit = () => {
    if (!paidAt) {
      setError('Tanggal pembayaran wajib diisi.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary">Catat Pembayaran</h2>
              <p className="text-xs text-text-placeholder">#{expense.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-placeholder hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-xl border border-border bg-background p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">Jumlah yang akan dibayarkan</p>
          <p className="font-heading text-2xl font-bold text-text-primary">{formatRupiah(expense.amount)}</p>
          <p className="mt-1 text-xs text-text-placeholder">{expense.requester?.name} • {expense.project?.name}</p>
        </div>

        <div className="space-y-4">
          {/* Metode pembayaran */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Metode Pembayaran <span className="text-[#B0000F]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['transfer', 'tunai'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  id={`payment-method-${m}`}
                  onClick={() => setMethod(m)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-all ${
                    method === m
                      ? 'border-primary bg-[#FCE4E7] text-primary'
                      : 'border-border bg-white text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {m === 'transfer' ? 'Transfer Bank' : 'Tunai'}
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal pembayaran */}
          <div>
            <label htmlFor="paidAt" className="block text-sm font-medium text-text-primary mb-1.5">
              <Calendar className="inline h-4 w-4 mr-1 text-text-secondary" />
              Tanggal Pembayaran <span className="text-[#B0000F]">*</span>
            </label>
            <input
              id="paidAt"
              type="date"
              value={paidAt}
              max={today}
              onChange={(e) => { setPaidAt(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Nomor referensi (opsional, wajib jika transfer) */}
          <div>
            <label htmlFor="referenceNo" className="block text-sm font-medium text-text-primary mb-1.5">
              Nomor Referensi {method === 'transfer' ? <span className="text-[#B0000F]">*</span> : <span className="text-text-placeholder">(opsional)</span>}
            </label>
            <input
              id="referenceNo"
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder={method === 'transfer' ? 'Nomor transaksi transfer...' : 'Nomor kwitansi (opsional)...'}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
          >
            Batal
          </button>
          <button
            id="confirm-record-payment"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 rounded-xl gradient-primary px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {mutation.isPending ? 'Menyimpan...' : 'Tandai Dibayar'}
          </button>
        </div>
      </div>
    </div>
  );
}
