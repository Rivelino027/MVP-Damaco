import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Download,
  Printer,
  Search,
  Filter,
  CreditCard,
  Building2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { getExpenses } from '@/lib/api-expenses';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { Expense } from '@/types/expenses';

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Rp 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function getFinancialReportFilename(): string {
  return `Laporan_Keuangan_Pengeluaran_BudgetFlow_${new Date().toISOString().slice(0, 10)}.csv`;
}

export default function FinancialReportsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['financial-reports', statusFilter],
    queryFn: () => getExpenses({ limit: 100 }),
  });

  const expenses = data?.data || [];

  const filteredExpenses = expenses.filter((e: Expense) => {
    const matchSearch =
      (e.note || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.project?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.requester?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalAmount = filteredExpenses.reduce((acc, e) => {
    const val = typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0;
    return acc + val;
  }, 0);

  const paidExpenses = filteredExpenses.filter((e) => e.status === 'dibayar');
  const paidAmount = paidExpenses.reduce((acc, e) => {
    const val = typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0;
    return acc + val;
  }, 0);

  const readyToPayExpenses = filteredExpenses.filter((e) => e.status === 'siap_dibayar');
  const readyToPayAmount = readyToPayExpenses.reduce((acc, e) => {
    const val = typeof e.amount === 'string' ? parseFloat(e.amount) || 0 : e.amount || 0;
    return acc + val;
  }, 0);

  // CSV Export handler
  const exportToCSV = () => {
    const headers = [
      'Tanggal',
      'Keterangan',
      'Vendor',
      'Proyek',
      'Pengaju',
      'Kategori',
      'Nominal (Rp)',
      'Status',
      'Tanggal Bayar',
      'Referensi Pembayaran',
    ];
    const rows = filteredExpenses.map((e) => [
      `"${e.expenseDate || '-'}"`,
      `"${(e.note || '-').replace(/"/g, '""')}"`,
      `"${(e.vendor || '-').replace(/"/g, '""')}"`,
      `"${e.project?.name || '-'}"`,
      `"${e.requester?.name || '-'}"`,
      `"${e.category?.name || '-'}"`,
      `"${e.amount || 0}"`,
      `"${e.status}"`,
      `"${e.payment?.paidAt ? new Date(e.payment.paidAt).toLocaleDateString('id-ID') : '-'}"`,
      `"${e.payment?.referenceNo || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      getFinancialReportFilename()
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Laporan Realisasi Keuangan & Kas</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Rekapitulasi pencairan kas pengeluaran, status pembayaran, dan bukti pertanggungjawaban dana.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Total Pengeluaran Terfilter</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="font-heading text-2xl font-bold text-text-primary mt-2">{formatRupiah(totalAmount)}</p>
          <p className="text-[11px] text-text-placeholder mt-0.5">{filteredExpenses.length} transaksi</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Sudah Dicairkan (Dibayar)</span>
            <CheckCircle className="h-4 w-4 text-[#48742C]" />
          </div>
          <p className="font-heading text-2xl font-bold text-[#48742C] mt-2">{formatRupiah(paidAmount)}</p>
          <p className="text-[11px] text-text-placeholder mt-0.5">{paidExpenses.length} transaksi lunas</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Siap Dicairkan (Siap Dibayar)</span>
            <Clock className="h-4 w-4 text-[#F29D38]" />
          </div>
          <p className="font-heading text-2xl font-bold text-[#8A550F] mt-2">{formatRupiah(readyToPayAmount)}</p>
          <p className="text-[11px] text-text-placeholder mt-0.5">{readyToPayExpenses.length} transaksi menunggu kasir</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari keterangan, vendor, proyek, atau pengaju..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-placeholder" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-secondary focus:border-primary focus:bg-white focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="dibayar">Lunas (Dibayar)</option>
            <option value="siap_dibayar">Siap Dibayar</option>
            <option value="menunggu_finance">Menunggu Finance</option>
            <option value="menunggu_admin">Menunggu Admin</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Rincian Pengeluaran Kas & Status Realisasi
          </h2>
          <span className="text-xs text-text-placeholder">{filteredExpenses.length} data ditampilkan</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="py-8">
            <ErrorState
              message={extractErrorMessage(error, 'Gagal memuat data laporan keuangan')}
              onRetry={() => refetch()}
            />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-10 w-10 text-text-placeholder mb-2" />
            <p className="text-sm font-medium text-text-primary">Tidak ada transaksi yang cocok</p>
            <p className="text-xs text-text-placeholder mt-0.5">Ubah filter status atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Keterangan & Proyek</th>
                  <th className="py-3 px-4">Pengaju</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Info Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-text-primary text-sm">{exp.note || exp.vendor || 'Pengeluaran'}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mt-0.5">
                        <Building2 className="h-3 w-3 text-text-placeholder" />
                        <span>{exp.project?.name || 'Umum'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      <span className="font-medium text-text-primary">{exp.requester?.name || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px]">
                        {exp.category?.name || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-heading font-bold text-text-primary">
                      {formatRupiah(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          exp.status === 'dibayar'
                            ? 'bg-green-50 text-[#48742C]'
                            : exp.status === 'siap_dibayar'
                              ? 'bg-blue-50 text-[#0A47B8]'
                              : exp.status === 'ditolak'
                                ? 'bg-[#FCE4E7] text-[#B0000F]'
                                : 'bg-[#FDF0DC] text-[#8A550F]'
                        )}
                      >
                        {exp.status === 'dibayar'
                          ? 'Lunas (Dibayar)'
                          : exp.status === 'siap_dibayar'
                            ? 'Siap Dibayar'
                            : exp.status === 'ditolak'
                              ? 'Ditolak'
                              : exp.status === 'menunggu_finance'
                                ? 'Menunggu Finance'
                                : 'Menunggu Admin'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {exp.status === 'dibayar' && exp.payment ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-[#48742C]">
                            {exp.payment.paidAt ? new Date(exp.payment.paidAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                          <span className="text-text-placeholder font-mono text-[10px]">
                            Ref: {exp.payment.referenceNo || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-placeholder">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
