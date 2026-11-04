import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Clock,
  EyeOff,
} from 'lucide-react';
import { getFinanceDashboard } from '@/lib/api-dashboard';
import { useAuthStore } from '@/stores/auth';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { DepartmentAbsorption, MonthlyCashflow } from '@/lib/api-dashboard';

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: num >= 1_000_000_000 ? 'compact' : 'standard',
  }).format(num);
}

function formatFullRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Rp 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function CashflowChart({ data }: { data: MonthlyCashflow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-text-placeholder">
        Belum ada data arus kas pengeluaran
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.flatMap((d) => [
      typeof d.totalExpenses === 'string' ? parseFloat(d.totalExpenses) || 0 : d.totalExpenses,
      typeof d.paidExpenses === 'string' ? parseFloat(d.paidExpenses) || 0 : d.paidExpenses,
    ]),
    10_000_000 // default min top scale
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-5 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#0A47B8]" />
          <span className="text-text-secondary">Total Diajukan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#48742C]" />
          <span className="text-text-secondary">Sudah Dibayar</span>
        </div>
      </div>

      <div className="relative flex h-56 items-end gap-4 border-b border-border pt-6 pb-2">
        {data.map((item) => {
          const total = typeof item.totalExpenses === 'string' ? parseFloat(item.totalExpenses) || 0 : item.totalExpenses;
          const paid = typeof item.paidExpenses === 'string' ? parseFloat(item.paidExpenses) || 0 : item.paidExpenses;
          const totalHeightPct = Math.min(100, Math.round((total / maxValue) * 100));
          const paidHeightPct = Math.min(100, Math.round((paid / maxValue) * 100));

          return (
            <div key={item.month} className="group relative flex flex-1 flex-col items-center h-full justify-end">
              {/* Tooltip on hover */}
              <div className="absolute -top-14 z-20 hidden rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] shadow-lg group-hover:flex group-hover:flex-col whitespace-nowrap pointer-events-none">
                <span className="font-semibold text-text-primary">{item.label}</span>
                <span className="text-[#0A47B8]">Diajukan: {formatRupiah(total)}</span>
                <span className="text-[#48742C]">Dibayar: {formatRupiah(paid)}</span>
              </div>

              {/* Bars */}
              <div className="flex w-full max-w-[48px] items-end justify-center gap-1.5 h-full">
                <div
                  className="w-1/2 rounded-t-md bg-[#0A47B8] transition-all duration-500 hover:brightness-110"
                  style={{ height: `${Math.max(totalHeightPct, 4)}%` }}
                />
                <div
                  className="w-1/2 rounded-t-md bg-[#48742C] transition-all duration-500 hover:brightness-110"
                  style={{ height: `${Math.max(paidHeightPct, 4)}%` }}
                />
              </div>

              {/* Month label */}
              <span className="mt-2 text-[11px] font-medium text-text-secondary truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DepartmentAbsorptionRow({ item }: { item: DepartmentAbsorption }) {
  const pct = item.absorptionPct;
  const isOver = pct > 100;
  const isWarn = !isOver && pct >= 80;
  // actual can be null when laborActual is hidden
  const actualDisplay = item.isCostHidden
    ? null
    : item.actual;

  return (
    <div className="rounded-xl border border-border bg-white p-3.5 hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-text-primary">{item.departmentName}</span>
        <span
          className={cn(
            'text-xs font-bold rounded-full px-2 py-0.5',
            isOver ? 'bg-[#FCE4E7] text-[#B0000F]' : isWarn ? 'bg-[#FDF0DC] text-[#8A550F]' : 'bg-green-50 text-[#48742C]'
          )}
        >
          {Math.round(pct)}%
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
        {item.isCostHidden ? (
          <span className="flex items-center gap-1 text-[#8A550F]">
            <EyeOff className="h-3 w-3" />
            Biaya disembunyikan
          </span>
        ) : (
          <span>Aktual: {actualDisplay != null ? formatRupiah(actualDisplay) : '-'}</span>
        )}
        <span>Anggaran: {formatRupiah(item.budgeted)}</span>
      </div>

      {item.isCostHidden && item.hiddenReason && (
        <p className="text-[10px] text-[#8A550F] mb-1.5 italic">
          {item.hiddenReason}
        </p>
      )}

      <div className="w-full bg-[#EBE3E4] rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: isOver ? '#B0000F' : isWarn ? '#F29D38' : '#48742C',
          }}
        />
      </div>
    </div>
  );
}

function getFinanceGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getFinanceDateText(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateFinancePeriodOptions(): Array<{ value: string; label: string }> {
  const now = new Date();
  const options: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Seluruh Periode' },
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    options.push({ value: val, label });
  }
  return options;
}

export default function FinanceDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Filter bulan kalender untuk agregat biaya tenaga kerja
  const [laborPeriod, setLaborPeriod] = useState<string>('all');
  const [laborPeriodOptions] = useState(generateFinancePeriodOptions);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: getFinanceDashboard,
    refetchInterval: 60_000,
  });

  const greetingText = getFinanceGreeting();
  const currentDateText = getFinanceDateText();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          message={extractErrorMessage(error, 'Gagal memuat data dasbor Keuangan')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const d = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {greetingText}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Ringkasan keuangan, verifikasi pengeluaran, dan kas perusahaan.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-1.5 text-xs text-text-secondary shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>
            {currentDateText}
          </span>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Anggaran Perusahaan',
            value: formatRupiah(d?.totalBudgetCompany),
            sub: d?.isTotalUsedHidden
              ? 'Biaya tenaga kerja disembunyikan'
              : `Terpakai: ${formatRupiah(d?.totalUsedCompany)} (${Math.round(d?.absorptionPctCompany ?? 0)}%)`,
            icon: Wallet,
            color: 'from-[#0A47B8] to-[#0A2E7F]',
            onClick: () => navigate('/anggaran'),
          },
          {
            label: 'Verifikasi Menunggu',
            value: d?.pendingVerification ?? 0,
            sub: 'Tahap 2 Finance (Pengeluaran)',
            icon: CheckSquare,
            color: 'from-[#E8141C] to-[#B0000F]',
            onClick: () => navigate('/persetujuan'),
          },
          {
            label: 'Siap Dibayar',
            value: formatRupiah(d?.readyToPay),
            sub: `${d?.readyToPayCount ?? 0} pengeluaran disetujui`,
            icon: CreditCard,
            color: 'from-[#48742C] to-[#2D5219]',
            onClick: () => navigate('/pembayaran'),
          },
          {
            label: 'Nominal Besar',
            value: d?.largeAmountPending ?? 0,
            sub: `Batas: ${formatRupiah(d?.currentLimit)}`,
            icon: DollarSign,
            color: 'from-[#F29D38] to-[#B56910]',
            onClick: () => navigate('/nominal-besar'),
          },
        ].map(({ label, value, sub, icon: Icon, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-100`} />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="relative z-10">
              <p className="font-heading text-2xl font-bold text-white">{value}</p>
              <p className="text-xs font-medium text-white/80 mt-0.5">{label}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content: Cashflow Chart & Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cashflow Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Tren Pengeluaran & Pembayaran Kas
              </h2>
            </div>
            <span className="text-xs text-text-placeholder">6 Bulan Terakhir</span>
          </div>
          <CashflowChart data={d?.monthlyCashflow ?? []} />
        </div>

        {/* Action Center & Limits */}
        <div className="flex flex-col gap-4">
          {/* Quick Pay Box */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#48742C]" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Antrean Pembayaran Kas</h3>
              </div>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-[#48742C]">
                {d?.readyToPayCount ?? 0} Item
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Total dana yang telah disetujui penuh dan siap dicatat pembayarannya:
            </p>
            <div className="my-3 rounded-xl bg-background p-3.5">
              <span className="text-xs text-text-placeholder">Total Nominal Siap Dibayar</span>
              <p className="font-heading text-xl font-bold text-[#48742C] mt-0.5">
                {formatFullRupiah(d?.readyToPay)}
              </p>
            </div>
            <button
              onClick={() => navigate('/pembayaran')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow transition-all"
            >
              Proses Pembayaran <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nominal Besar Alert */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#F29D38]" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Batas Nominal Besar</h3>
              </div>
              <span className="text-xs font-bold text-[#8A550F]">
                {formatRupiah(d?.currentLimit)}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Perubahan batas wajib diusulkan dan dikonfirmasi dua pihak (Admin & Finance).
            </p>
            <button
              onClick={() => navigate('/nominal-besar')}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-text-secondary hover:border-primary/30 hover:bg-white transition-all"
            >
              <span>Usulkan / Konfirmasi Batas</span>
              <ArrowRight className="h-3.5 w-3.5 text-text-placeholder" />
            </button>
          </div>
        </div>
      </div>

      {/* Department Breakdown & Labor Cost Aggregates */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Serapan Anggaran Per Departemen */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-secondary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Serapan Anggaran Per Departemen
              </h2>
            </div>
            <button
              onClick={() => navigate('/anggaran')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Rincian <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {(d?.departmentAbsorption ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-text-placeholder">Belum ada data departemen</p>
            ) : (
              (d?.departmentAbsorption ?? []).map((dept) => (
                <DepartmentAbsorptionRow key={dept.departmentId} item={dept} />
              ))
            )}
          </div>
        </div>

        {/* Agregat Biaya Tenaga Kerja (STRICT: aggregate only, never individual) */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Agregat Biaya Tenaga Kerja
              </h2>
            </div>
            <span className="text-[11px] rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-[#0A47B8]">
              Agregat Departemen
            </span>
          </div>

          {/* Filter Bulan Kalender */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            <select
              value={laborPeriod}
              onChange={(e) => setLaborPeriod(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter periode bulan biaya tenaga kerja"
            >
              {laborPeriodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-text-secondary mb-3">
            Total biaya tenaga kerja terakumulasi dari timesheet yang disetujui (dibulatkan &amp; diagregasikan):
          </p>
          <div className="space-y-2.5">
            {(d?.laborCostByDept ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-text-placeholder">Belum ada data biaya tenaga kerja</p>
            ) : (
              (d?.laborCostByDept ?? []).map((item) => (
                <div
                  key={item.departmentId}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 transition-all',
                    item.isCostHidden
                      ? 'border-[#F29D38]/40 bg-[#FDF0DC]'
                      : 'border-border bg-background hover:bg-white hover:border-primary/20',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      item.isCostHidden ? 'bg-[#F29D38]/20 text-[#8A550F]' : 'bg-blue-50 text-[#0A47B8]',
                    )}>
                      {item.isCostHidden ? <EyeOff className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.departmentName}</p>
                      <p className="text-[11px] text-text-placeholder">
                        {item.isCostHidden
                          ? (item.hiddenReason ?? 'Jumlah pekerja terlalu sedikit untuk ditampilkan')
                          : 'Biaya terakumulasi'}
                      </p>
                    </div>
                  </div>
                  {item.isCostHidden ? (
                    <span className="rounded-full bg-[#FDF0DC] border border-[#F29D38]/50 px-2.5 py-0.5 text-xs font-semibold text-[#8A550F]">
                      Disembunyikan
                    </span>
                  ) : (
                    <span className="font-heading text-sm font-bold text-text-primary">
                      {item.totalCost != null ? formatFullRupiah(item.totalCost) : '-'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
