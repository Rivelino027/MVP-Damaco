import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Wallet,
  Clock,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Flag,
  ArrowRight,
  CheckCircle,
  EyeOff,
  Activity,
} from 'lucide-react';
import { getAdminDashboard } from '@/lib/api-dashboard';
import { useAuthStore } from '@/stores/auth';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { ProjectHealthItem } from '@/lib/api-dashboard';

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

function AbsorptionBar({ pct }: { pct: number }) {
  const isOver = pct > 100;
  const isWarn = !isOver && pct >= 80;
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5 text-xs">
        <span className="text-text-secondary font-medium">Tingkat Penyerapan</span>
        <span className={cn('font-bold', isOver ? 'text-[#B0000F]' : isWarn ? 'text-[#B56910]' : 'text-[#48742C]')}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: isOver
              ? 'linear-gradient(90deg, #E8141C 0%, #B0000F 100%)'
              : isWarn
              ? 'linear-gradient(90deg, #F29D38 0%, #B56910 100%)'
              : 'linear-gradient(90deg, #48742C 0%, #365A20 100%)',
          }}
        />
      </div>
    </div>
  );
}

function ProjectHealthRow({ project, onClick }: { project: ProjectHealthItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm cursor-pointer',
        project.isOverBudget
          ? 'border-[#B0000F]/20 bg-[#FCE4E7]/40 hover:bg-[#FCE4E7]/60'
          : project.isEarlyWarning
            ? 'border-[#F29D38]/30 bg-[#FDF0DC]/40 hover:bg-[#FDF0DC]/60'
            : 'border-slate-200/80 bg-white hover:border-primary/30',
      )}
    >
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs',
        project.isOverBudget ? 'bg-[#FCE4E7] text-[#B0000F]' :
        project.isEarlyWarning ? 'bg-[#FDF0DC] text-[#B56910]' : 'bg-emerald-50 text-[#48742C] border border-emerald-200',
      )}>
        {project.isOverBudget ? <AlertTriangle className="h-4 w-4" /> :
         project.isEarlyWarning ? <AlertTriangle className="h-4 w-4" /> :
         <CheckCircle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
        </div>
        <AbsorptionBar pct={project.absorptionPct} />
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors" />
    </button>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: getAdminDashboard,
    refetchInterval: 60_000,
  });

  const greetingText = getGreeting();
  const currentDateText = getFormattedDate();

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
          message={extractErrorMessage(error, 'Gagal memuat data dasbor Admin')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const d = data;
  const absorptionVal = Math.round(d?.absorptionPct ?? 0);
  const isOverBudget = absorptionVal > 100;
  const isEarlyWarning = !isOverBudget && absorptionVal >= 80;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {greetingText}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Ini ringkasan aktivitas dan pengendalian anggaran departemen Anda hari ini.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs w-fit">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>{currentDateText}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Anggaran Dept. */}
        <button
          onClick={() => navigate('/anggaran')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-primary border border-rose-100 shadow-2xs">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-[9px] font-bold">
              SESUAI DIPA
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Anggaran Dept.</p>
            <p className="font-heading text-2xl font-black text-text-primary mt-0.5 tracking-tight">
              {formatRupiah(d?.departmentBudget)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-text-placeholder border-t border-slate-100 pt-2 font-medium">
              <span>Sisa: {formatRupiah(d?.remainingBudget)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-text-placeholder group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </button>

        {/* Card 2: Proyek Aktif (Elevated White Card dengan aksen Crimson) */}
        <button
          onClick={() => navigate('/proyek')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-primary border border-rose-100 shadow-2xs">
              <FolderKanban className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
              Aktif Berjalan
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Proyek Aktif</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {d?.activeProjects ?? '-'}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span>di departemen Anda</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>

        {/* Card 3: Menunggu Persetujuan (Elevated White Card dengan aksen Amber) */}
        <button
          onClick={() => navigate('/persetujuan')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-400/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#B56910] border border-amber-200/60 shadow-2xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-[#8A550F]">
              Perlu Tindakan
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Menunggu Persetujuan</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {(d?.pendingApprovals?.timesheets ?? 0) + (d?.pendingApprovals?.expenses ?? 0)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span className="truncate">{d?.pendingApprovals?.timesheets ?? 0} timesheet, {d?.pendingApprovals?.expenses ?? 0} pengeluaran</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
            </div>
          </div>
        </button>

        {/* Card 4: Timesheet Menunggu (Elevated White Card dengan aksen Hijau) */}
        <button
          onClick={() => navigate('/timesheet')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-400/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#48742C] border border-emerald-200/60 shadow-2xs">
              <Clock className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#48742C]">
              Review Mingguan
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Timesheet Menunggu</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {d?.pendingApprovals?.timesheets ?? '-'}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span>perlu ditindaklanjuti</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SERAPAN ANGGARAN DEPARTEMEN DENGAN HEALTH DONUT & METRIK    */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="font-heading text-base font-bold text-slate-900">
              Serapan Anggaran Departemen
            </h2>
          </div>

          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold w-fit border',
              isOverBudget
                ? 'bg-[#FCE4E7] text-[#B0000F] border-rose-200'
                : isEarlyWarning
                ? 'bg-[#FDF0DC] text-[#8A550F] border-amber-200'
                : 'bg-emerald-50 text-[#48742C] border-emerald-200',
            )}
          >
            {absorptionVal}% terserap
          </span>
        </div>

        {/* Hidden cost strip jika biaya dirahasiakan */}
        {d?.isCostHidden ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[#F29D38]/40 bg-[#FDF0DC] p-3.5 mb-4">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#8A550F]" />
            <div>
              <p className="text-sm font-semibold text-[#8A550F]">Biaya Tenaga Kerja Disembunyikan</p>
              <p className="text-xs text-[#8A550F] mt-0.5">
                {d?.hiddenReason ?? 'Jumlah pekerja terlalu sedikit untuk ditampilkan'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Anggaran', value: formatRupiah(d?.departmentBudget), color: 'text-slate-900' },
              { label: 'Terpakai', value: d?.usedBudget != null ? formatRupiah(d.usedBudget) : '-', color: 'text-[#B56910]' },
              { label: 'Sisa', value: d?.remainingBudget != null ? formatRupiah(d.remainingBudget) : '-', color: 'text-[#48742C]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className={cn('font-heading text-lg font-black mt-0.5', color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <AbsorptionBar pct={d?.absorptionPct ?? 0} />
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* BENTO GRID: KESEHATAN PROYEK & KOTAK MASUK TINDAKAN         */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Kolom Kiri (7 Kolom): Kesehatan Proyek */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-slate-900">Kesehatan Proyek</h2>
              </div>
              <button
                onClick={() => navigate('/proyek')}
                className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Semua</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              {(d?.projectHealth ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm font-medium text-slate-400">Belum ada proyek aktif</p>
              ) : (
                (d?.projectHealth ?? []).slice(0, 5).map((p) => (
                  <ProjectHealthRow key={p.id} project={p} onClick={() => navigate(`/proyek/${p.id}`)} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan (5 Kolom): Widgets & Tindakan */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Widget Kotak Masuk Tindakan */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-slate-600" />
                <h2 className="font-heading text-base font-bold text-slate-900">Menunggu Tindakan</h2>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              {[
                { label: 'Pengeluaran', count: d?.pendingApprovals?.expenses ?? 0, to: '/persetujuan', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { label: 'Timesheet', count: d?.pendingApprovals?.timesheets ?? 0, to: '/timesheet', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Pengajuan Anggaran', count: d?.pendingApprovals?.budgetRequests ?? 0, to: '/anggaran', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              ].map(({ label, count, to, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-xs sm:text-sm hover:border-primary/40 hover:bg-white transition-all cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', count > 0 ? color : 'bg-slate-100 text-slate-400 border-slate-200')}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Widget Nominal Besar */}
          <div
            className={cn(
              'rounded-3xl border p-5 transition-all shadow-xs',
              d?.pendingLimitChange
                ? 'border-[#F29D38]/40 bg-[#FDF0DC]'
                : 'border-slate-200/80 bg-white',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Flag className={cn('h-4 w-4', d?.pendingLimitChange ? 'text-[#B56910]' : 'text-slate-600')} />
              <h2 className={cn('font-heading text-base font-bold', d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-slate-900')}>
                Nominal Besar
              </h2>
            </div>
            <p className={cn('text-xs sm:text-sm font-medium', d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-slate-500')}>
              Batas saat ini:{' '}
              <span className="font-bold text-slate-800">{formatRupiah(d?.currentLimit) ?? 'Belum ditetapkan'}</span>
            </p>
            {d?.pendingLimitChange && (
              <button
                onClick={() => navigate('/nominal-besar')}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#F29D38]/50 bg-white px-4 py-2.5 text-xs font-bold text-[#8A550F] hover:bg-[#FDF0DC] transition-colors cursor-pointer shadow-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-warning-strong" />
                Ada Usulan Menunggu Konfirmasi
              </button>
            )}
            {!d?.pendingLimitChange && (
              <button
                onClick={() => navigate('/nominal-besar')}
                className="mt-3 flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer"
              >
                <span>Kelola batas</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
