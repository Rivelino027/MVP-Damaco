import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Eye,
} from 'lucide-react';
import { getExpenses } from '@/lib/api-expenses';
import { cn, extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import { Button, ErrorState, EmptyState, LoadingState } from '@/components/shared';
import { RecordPaymentModal } from '@/pages/expenses/RecordPaymentModal';
import { ExpenseDetailModal } from '@/pages/expenses/ExpenseDetailModal';
import type { Expense } from '@/types/expenses';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'siap_dibayar' | 'dibayar'>('siap_dibayar');
  const [search, setSearch] = useState('');
  const [largeAmountOnly, setLargeAmountOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['payments-list', activeTab, largeAmountOnly, page],
    queryFn: () =>
      getExpenses({
        status: activeTab,
        isLargeAmount: largeAmountOnly || undefined,
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
          e.note?.toLowerCase().includes(search.toLowerCase()) ||
          e.category?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  const handleAfterPayment = () => {
    queryClient.invalidateQueries({ queryKey: ['payments-list'] });
    setPaymentTarget(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Pembayaran & Pencairan Kas
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Finance Desk
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Pencatatan realisasi pembayaran pengeluaran tim yang telah lolos verifikasi Finance
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Hero Card */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Antrean Siap Cair</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Otorisasi Lolos
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {activeTab === 'siap_dibayar' ? total : expenses.length}
            </span>
            <span className="text-xs text-text-placeholder">transaksi menunggu</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Realisasi Kas Perusahaan</span>
            <span className="text-emerald-700 font-medium">Siap Eksekusi</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Nominal Dalam Tampilan</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-xl font-bold text-text-primary">
              {formatCurrency(
                filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
              )}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Total {filtered.length} item tersaring</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Kepatuhan Audit</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-base font-bold text-text-primary">Nomor Referensi & Bukti</span>
            <p className="text-xs text-text-placeholder mt-0.5">Wajib dicatat pada setiap transaksi cair</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <span>Sistem Kliring & Kasbon</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px">
        <button
          onClick={() => {
            setActiveTab('siap_dibayar');
            setPage(1);
          }}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all',
            activeTab === 'siap_dibayar'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <CreditCard className="h-4 w-4" />
          <span>Siap Dibayar</span>
          {activeTab === 'siap_dibayar' && total > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {total}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('dibayar');
            setPage(1);
          }}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all',
            activeTab === 'dibayar'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <CheckCircle className="h-4 w-4" />
          <span>Riwayat Sudah Dibayar</span>
          {activeTab === 'dibayar' && total > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              {total}
            </span>
          )}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari pengaju, proyek, vendor, keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <button
          onClick={() => {
            setLargeAmountOnly(!largeAmountOnly);
            setPage(1);
          }}
          className={cn(
            'h-10 flex items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer',
            largeAmountOnly
              ? 'border-[#F29D38]/50 bg-[#FDF0DC] text-[#8A550F]'
              : 'border-border bg-slate-50/50 text-text-secondary hover:border-primary/30 hover:text-text-primary hover:bg-white'
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Nominal Besar Saja</span>
        </button>

        {(search || largeAmountOnly) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setLargeAmountOnly(false);
              setPage(1);
            }}
            className="h-10 text-xs text-text-secondary hover:text-text-primary"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Memuat daftar pengeluaran..." />
          </div>
        ) : isError ? (
          <div className="py-8">
            <ErrorState
              message={extractErrorMessage(error, 'Gagal memuat daftar pembayaran')}
              onRetry={() => refetch()}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={activeTab === 'siap_dibayar' ? 'Tidak Ada Pengeluaran Siap Dibayar' : 'Belum Ada Riwayat Pembayaran'}
              description={
                search || largeAmountOnly
                  ? 'Tidak ada pengeluaran yang sesuai kriteria pencarian.'
                  : activeTab === 'siap_dibayar'
                  ? 'Semua pengeluaran yang disetujui telah dibayarkan.'
                  : 'Belum ada transaksi pembayaran kas yang tercatat.'
              }
              icon={<Receipt className="h-10 w-10 text-text-placeholder opacity-40" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="px-5 py-3.5 text-left">Pengaju & Departemen</th>
                  <th className="px-5 py-3.5 text-left">Proyek & Kategori</th>
                  <th className="px-5 py-3.5 text-left">Vendor & Keterangan</th>
                  <th className="px-5 py-3.5 text-left">Tanggal Pengajuan</th>
                  <th className="px-5 py-3.5 text-right">Nominal</th>
                  {activeTab === 'dibayar' && (
                    <th className="px-5 py-3.5 text-left">Info Pembayaran</th>
                  )}
                  <th className="px-5 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((exp) => (
                  <tr
                    key={exp.id}
                    className={cn(
                      'transition-colors hover:bg-background/60',
                      exp.isLargeAmount && 'bg-[#FDF0DC]/30'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                          {exp.requester?.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{exp.requester?.name ?? '-'}</p>
                          <p className="text-xs text-text-placeholder">{exp.requester?.department?.name ?? '-'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text-primary">{exp.project?.name ?? '-'}</p>
                      <p className="text-xs text-text-placeholder">{exp.category?.name ?? '-'}</p>
                    </td>

                    <td className="px-5 py-3.5 text-text-secondary max-w-xs">
                      <p className="font-medium text-text-primary truncate">{exp.vendor || '-'}</p>
                      {exp.note && <p className="text-xs text-text-placeholder truncate">{exp.note}</p>}
                    </td>

                    <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-heading font-bold text-text-primary">
                          {formatCurrency(exp.amount)}
                        </span>
                        {exp.isLargeAmount && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0DC] px-2 py-0.5 text-[10px] font-semibold text-[#8A550F] border border-[#F29D38]/30">
                            <AlertTriangle className="h-3 w-3" />
                            Nominal Besar
                          </span>
                        )}
                      </div>
                    </td>

                    {activeTab === 'dibayar' && (
                      <td className="px-5 py-3.5 text-text-secondary">
                        {exp.payment ? (
                          <div className="text-xs">
                            <span className="font-medium text-[#48742C] block">
                              {exp.payment.paidAt ? formatDate(exp.payment.paidAt) : '-'}
                            </span>
                            <span className="text-text-placeholder font-mono text-[10px] block">
                              Ref: {exp.payment.referenceNo || '-'}
                            </span>
                            {exp.payment.method && (
                              <span className="text-[10px] text-text-placeholder uppercase">
                                {exp.payment.method}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-placeholder">-</span>
                        )}
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          title="Lihat Detail"
                          className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>

                        {activeTab === 'siap_dibayar' && (
                          <button
                            id={`pay-btn-${exp.id}`}
                            onClick={() => setPaymentTarget(exp)}
                            className="h-8 inline-flex items-center gap-1.5 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Catat Bayar</span>
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
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-sm text-text-secondary">Total {total} pengeluaran</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary disabled:opacity-40 hover:bg-background"
              >
                Sebelumnya
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary disabled:opacity-40 hover:bg-background"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentTarget && (
        <RecordPaymentModal
          expense={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSuccess={handleAfterPayment}
        />
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onPayment={activeTab === 'siap_dibayar' ? () => {
            setPaymentTarget(selectedExpense);
            setSelectedExpense(null);
          } : undefined}
        />
      )}
    </div>
  );
}
