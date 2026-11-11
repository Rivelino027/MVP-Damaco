import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  CreditCard,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getExpenses, approveExpenseAdmin, verifyExpenseFinance } from '@/lib/api-expenses';
import { cn, extractErrorMessage } from '@/lib/utils';
import { Button, ErrorState } from '@/components/shared';
import type { Expense, ExpenseStatus } from '@/types/expenses';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { RejectExpenseModal } from './RejectExpenseModal';
import { RecordPaymentModal } from './RecordPaymentModal';

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  menunggu_admin: 'Menunggu Admin',
  menunggu_finance: 'Menunggu Finance',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  siap_dibayar: 'Siap Dibayar',
  dibayar: 'Dibayar',
};

const STATUS_STYLES: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  menunggu_admin: 'bg-blue-50 text-blue-700',
  menunggu_finance: 'bg-orange-50 text-orange-700',
  disetujui: 'bg-green-50 text-green-700',
  ditolak: 'bg-[#FCE4E7] text-[#B0000F]',
  siap_dibayar: 'bg-purple-50 text-purple-700',
  dibayar: 'bg-green-100 text-green-800',
};

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [largeAmountFilter, setLargeAmountFilter] = useState<boolean | undefined>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isFinance = role === 'finance';
  const isSuperAdmin = role === 'super_admin';

  // Filter status default berdasarkan peran
  const defaultStatus =
    statusFilter ||
    (isAdmin ? 'menunggu_admin' : isFinance ? 'menunggu_finance' : '');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expenses', defaultStatus, largeAmountFilter, page],
    queryFn: () =>
      getExpenses({
        status: defaultStatus || undefined,
        isLargeAmount: largeAmountFilter,
        page,
        limit: 20,
      }),
  });

  const expenses = data?.data ?? [];
  const total = data?.total ?? 0;

  const filtered = search
    ? expenses.filter(
        (e) =>
          e.requester?.name?.toLowerCase().includes(search.toLowerCase()) ||
          e.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
          e.vendor?.toLowerCase().includes(search.toLowerCase()) ||
          e.category?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : expenses;

  const handleAfterAction = () => {
    setActionError(null);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setSelectedExpense(null);
    setRejectTarget(null);
    setPaymentTarget(null);
  };

  const canApproveAdmin = (expense: Expense) =>
    isAdmin && expense.status === 'menunggu_admin' && expense.requesterId !== user?.id;

  const canVerifyFinance = (expense: Expense) =>
    isFinance && expense.status === 'menunggu_finance' && expense.requesterId !== user?.id;

  const canReject = (expense: Expense) =>
    ((isAdmin && expense.status === 'menunggu_admin') ||
     (isFinance && expense.status === 'menunggu_finance')) &&
    expense.requesterId !== user?.id;

  const canRecordPayment = (expense: Expense) =>
    isFinance && expense.status === 'siap_dibayar';

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                {isFinance ? 'Verifikasi Pengeluaran' : 'Persetujuan Pengeluaran'}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                {isAdmin ? 'Admin Departemen' : isFinance ? 'Finance Desk' : 'Audit Log'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {isSuperAdmin
                ? 'Super Admin tidak termasuk rantai persetujuan pengeluaran'
                : isFinance
                ? 'Verifikasi dan catat pembayaran pengeluaran tim'
                : 'Tinjau dan setujui pengajuan pengeluaran dari tim'}
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2">
          {[
            { label: 'Menunggu', count: expenses.filter((e) => e.status === (isFinance ? 'menunggu_finance' : 'menunggu_admin')).length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Nominal Besar', count: expenses.filter((e) => e.isLargeAmount).length, color: 'bg-[#FDF0DC] text-[#8A550F] border-[#F29D38]/30' },
          ].map((chip) => (
            <div key={chip.label} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', chip.color)}>
              <span>{chip.count}</span>
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Antrean Persetujuan Card */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Antrean Persetujuan</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {isAdmin ? 'Tahap 1 Admin' : isFinance ? 'Tahap 2 Finance' : 'Monitoring'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {expenses.filter((e) => e.status === (isFinance ? 'menunggu_finance' : 'menunggu_admin')).length}
            </span>
            <span className="text-xs text-text-placeholder">item memerlukan tindakan</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Audit Rantai Persetujuan</span>
            <span className="text-emerald-700 font-medium">Aktif</span>
          </div>
        </div>

        {/* Card 2: Total Nilai Pengeluaran */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Nilai Tersaring</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-xl font-bold text-text-primary">
              {formatRupiah(
                filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
              )}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Dari {filtered.length} pengeluaran di halaman ini</span>
          </div>
        </div>

        {/* Card 3: Nominal Besar Tag */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Nominal Besar</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-text-primary">
              {expenses.filter((e) => e.isLargeAmount).length}
            </span>
            <span className="text-xs text-text-placeholder">pengeluaran</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
            <span>Wajib Nota & Alasan Tertulis</span>
          </div>
        </div>
      </div>

      {/* Banner Pesan Error Backend / Pengeluaran Tertahan */}
      {actionError && (
        <div className="flex items-start justify-between rounded-xl border border-[#B0000F]/30 bg-[#FCE4E7] p-4 text-xs text-[#B0000F]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Aksi Gagal Diproses</p>
              <p className="mt-0.5">{actionError}</p>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="rounded-md p-1 hover:bg-[#B0000F]/10 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari pengaju, proyek, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="relative min-w-[170px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 w-full appearance-none rounded-xl border border-border bg-slate-50/50 pl-9 pr-8 text-sm text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_admin">Menunggu Admin</option>
            <option value="menunggu_finance">Menunggu Finance</option>
            <option value="disetujui">Disetujui</option>
            <option value="siap_dibayar">Siap Dibayar</option>
            <option value="dibayar">Dibayar</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>

        <button
          onClick={() => { setLargeAmountFilter(largeAmountFilter ? undefined : true); setPage(1); }}
          className={cn(
            'h-10 flex items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer',
            largeAmountFilter
              ? 'border-[#F29D38]/50 bg-[#FDF0DC] text-[#8A550F]'
              : 'border-border bg-slate-50/50 text-text-secondary hover:border-primary/30 hover:text-text-primary hover:bg-white',
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Nominal Besar</span>
        </button>

        {(search || statusFilter || largeAmountFilter) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter(''); setLargeAmountFilter(undefined); setPage(1); }}
            className="h-10 text-xs text-text-secondary hover:text-text-primary"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="py-8">
            <ErrorState
              message={extractErrorMessage(error, 'Gagal memuat daftar pengeluaran')}
              onRetry={() => refetch()}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-placeholder">
            <Receipt className="h-12 w-12 opacity-30" />
            <p className="text-sm">Tidak ada pengeluaran ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Pengaju</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Proyek / Kategori</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Vendor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Tanggal</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Jumlah</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className={cn(
                      'transition-colors hover:bg-background/60',
                      expense.isLargeAmount && 'bg-[#FDF0DC]/30',
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                          {expense.requester?.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{expense.requester?.name ?? '-'}</p>
                          <p className="text-xs text-text-placeholder">{expense.requester?.department?.name ?? '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text-primary">{expense.project?.name ?? '-'}</p>
                      <p className="text-xs text-text-placeholder">{expense.category?.name ?? '-'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{expense.vendor ?? '-'}</td>
                    <td className="px-5 py-3.5 text-text-secondary">{formatDate(expense.expenseDate)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-text-primary">{formatRupiah(expense.amount)}</span>
                        {expense.isLargeAmount && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0DC] px-2 py-0.5 text-[10px] font-semibold text-[#8A550F] border border-[#F29D38]/30">
                            <AlertTriangle className="h-3 w-3" />
                            Nominal Besar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[expense.status])}>
                        {STATUS_LABELS[expense.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`expense-detail-${expense.id}`}
                          onClick={() => setSelectedExpense(expense)}
                          title="Lihat Detail"
                          className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>

                        {/* Super Admin: hanya baca, tampilkan badge informatif */}
                        {isSuperAdmin && (
                          <span
                            title="Super Admin tidak termasuk rantai persetujuan pengeluaran"
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 cursor-default select-none"
                          >
                            Hanya Baca
                          </span>
                        )}

                        {canApproveAdmin(expense) && (
                          <>
                            <ApproveButton
                              expenseId={expense.id}
                              onSuccess={handleAfterAction}
                              onError={(msg) => setActionError(msg)}
                            />
                            <button
                              id={`expense-reject-admin-${expense.id}`}
                              onClick={() => setRejectTarget(expense)}
                              title="Tolak"
                              className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary-dark hover:bg-danger-tint transition-colors shadow-2xs"
                            >
                              <X className="h-3.5 w-3.5" />
                              Tolak
                            </button>
                          </>
                        )}

                        {canVerifyFinance(expense) && (
                          <>
                            <VerifyButton
                              expenseId={expense.id}
                              onSuccess={handleAfterAction}
                              onError={(msg) => setActionError(msg)}
                            />
                            <button
                              id={`expense-reject-finance-${expense.id}`}
                              onClick={() => setRejectTarget(expense)}
                              title="Tolak"
                              className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary-dark hover:bg-danger-tint transition-colors shadow-2xs"
                            >
                              <X className="h-3.5 w-3.5" />
                              Tolak
                            </button>
                          </>
                        )}

                        {/* Admin yang mengajukan sendiri: nonaktif dengan tooltip */}
                        {isAdmin && expense.status === 'menunggu_admin' && expense.requesterId === user?.id && (
                          <button
                            disabled
                            title="Anda tidak dapat menyetujui pengeluaran milik Anda sendiri"
                            className="h-8 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400 cursor-not-allowed opacity-75"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Setujui
                          </button>
                        )}

                        {/* Finance yang mengajukan sendiri: nonaktif dengan tooltip */}
                        {isFinance && expense.status === 'menunggu_finance' && expense.requesterId === user?.id && (
                          <button
                            disabled
                            title="Anda tidak dapat memverifikasi pengeluaran milik Anda sendiri"
                            className="h-8 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400 cursor-not-allowed opacity-75"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Verifikasi
                          </button>
                        )}

                        {canRecordPayment(expense) && (
                          <button
                            id={`expense-payment-${expense.id}`}
                            onClick={() => setPaymentTarget(expense)}
                            className="h-8 inline-flex items-center gap-1.5 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Bayar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-slate-50/60">
            <p className="text-xs text-text-secondary">
              Total <span className="font-semibold text-text-primary">{total}</span> pengeluaran
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onApprove={canApproveAdmin(selectedExpense) || canVerifyFinance(selectedExpense) ? handleAfterAction : undefined}
          onReject={canReject(selectedExpense) ? () => { setRejectTarget(selectedExpense); setSelectedExpense(null); } : undefined}
          onPayment={canRecordPayment(selectedExpense) ? () => { setPaymentTarget(selectedExpense); setSelectedExpense(null); } : undefined}
        />
      )}

      {rejectTarget && (
        <RejectExpenseModal
          expense={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={handleAfterAction}
        />
      )}

      {paymentTarget && (
        <RecordPaymentModal
          expense={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSuccess={handleAfterAction}
        />
      )}
    </div>
  );
}

// ── Tombol inline approve (admin) ──
function ApproveButton({
  expenseId,
  onSuccess,
  onError,
}: {
  expenseId: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}) {
  const mutation = useMutation({
    mutationFn: () => approveExpenseAdmin(expenseId),
    onSuccess,
    onError: (err: unknown) => {
      onError?.(extractErrorMessage(err, 'Gagal menyetujui pengeluaran'));
    },
  });
  return (
    <button
      id={`expense-approve-admin-${expenseId}`}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="h-8 inline-flex items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" />
      {mutation.isPending ? 'Memproses...' : 'Setujui'}
    </button>
  );
}

// ── Tombol inline verify (finance) ──
function VerifyButton({
  expenseId,
  onSuccess,
  onError,
}: {
  expenseId: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}) {
  const mutation = useMutation({
    mutationFn: () => verifyExpenseFinance(expenseId),
    onSuccess,
    onError: (err: unknown) => {
      onError?.(extractErrorMessage(err, 'Gagal memverifikasi pengeluaran'));
    },
  });
  return (
    <button
      id={`expense-verify-finance-${expenseId}`}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="h-8 inline-flex items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" />
      {mutation.isPending ? 'Memproses...' : 'Verifikasi'}
    </button>
  );
}
