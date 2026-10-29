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
      <div className="flex justify-between mb-1 text-xs">
        <span className="text-text-secondary">Serapan</span>
        <span className={cn('font-semibold', isOver ? 'text-[#B0000F]' : isWarn ? 'text-[#B56910]' : 'text-[#48742C]')}>
          {Math.round(pct)}%
        </span>
      </div>
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

function ProjectHealthRow({ project, onClick }: { project: ProjectHealthItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm',
        project.isOverBudget
          ? 'border-[#B0000F]/20 bg-[#FCE4E7]/30'
          : project.isEarlyWarning
            ? 'border-[#F29D38]/30 bg-[#FDF0DC]/30'
            : 'border-border bg-white hover:border-primary/20',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
        project.isOverBudget ? 'bg-[#FCE4E7] text-[#B0000F]' :
        project.isEarlyWarning ? 'bg-[#FDF0DC] text-[#B56910]' : 'bg-[#FCE4E7] text-primary',
      )}>
        {project.isOverBudget ? <AlertTriangle className="h-4 w-4" /> :
         project.isEarlyWarning ? <AlertTriangle className="h-4 w-4" /> :
         <CheckCircle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
        <div className="mt-1">
          <AbsorptionBar pct={project.absorptionPct} />
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-placeholder" />
    </button>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: getAdminDashboard,
    refetchInterval: 60_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Ini ringkasan aktivitas departemen Anda hari ini.</p>
        </div>
        <div className="text-right text-xs text-text-placeholder">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Proyek Aktif',
            value: d?.activeProjects ?? '-',
            icon: FolderKanban,
            sub: 'di departemen Anda',
            color: 'from-[#E8141C] to-[#B0000F]',
            onClick: () => navigate('/proyek'),
          },
          {
            label: 'Anggaran Dept.',
            value: formatRupiah(d?.departmentBudget),
            icon: Wallet,
            sub: `Sisa ${formatRupiah(d?.remainingBudget)}`,
            color: 'from-[#0A47B8] to-[#0A2E7F]',
            onClick: () => navigate('/anggaran'),
          },
          {
            label: 'Menunggu Persetujuan',
            value: (d?.pendingApprovals?.timesheets ?? 0) + (d?.pendingApprovals?.expenses ?? 0),
            icon: CheckSquare,
            sub: `${d?.pendingApprovals?.timesheets ?? 0} timesheet, ${d?.pendingApprovals?.expenses ?? 0} pengeluaran`,
            color: 'from-[#F29D38] to-[#B56910]',
            onClick: () => navigate('/persetujuan'),
          },
          {
            label: 'Timesheet Menunggu',
            value: d?.pendingApprovals?.timesheets ?? '-',
            icon: Clock,
            sub: 'perlu ditindaklanjuti',
            color: 'from-[#48742C] to-[#2D5219]',
            onClick: () => navigate('/timesheet'),
          },
        ].map(({ label, value, icon: Icon, sub, color, onClick }) => (
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

      {/* Serapan anggaran dept */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-text-secondary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">Serapan Anggaran Departemen</h2>
          </div>
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            (d?.absorptionPct ?? 0) > 100 ? 'bg-[#FCE4E7] text-[#B0000F]' :
            (d?.absorptionPct ?? 0) >= 80 ? 'bg-[#FDF0DC] text-[#8A550F]' :
            'bg-green-50 text-green-700',
          )}>
            {Math.round(d?.absorptionPct ?? 0)}% terserap
          </span>
        </div>

        {/* Hidden cost strip for usedBudget */}
        {d?.isCostHidden ? (
          <div className="flex items-start gap-3 rounded-xl border border-[#F29D38]/40 bg-[#FDF0DC] p-3 mb-4">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#8A550F]" />
            <div>
              <p className="text-sm font-semibold text-[#8A550F]">Biaya Tenaga Kerja Disembunyikan</p>
              <p className="text-xs text-[#8A550F] mt-0.5">
                {d?.hiddenReason ?? 'Jumlah pekerja terlalu sedikit untuk ditampilkan'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total Anggaran', value: formatRupiah(d?.departmentBudget), color: 'text-text-primary' },
              { label: 'Terpakai', value: d?.usedBudget != null ? formatRupiah(d.usedBudget) : '-', color: 'text-[#B56910]' },
              { label: 'Sisa', value: d?.remainingBudget != null ? formatRupiah(d.remainingBudget) : '-', color: 'text-[#48742C]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-background p-3">
                <p className="text-xs text-text-placeholder">{label}</p>
                <p className={cn('font-heading text-lg font-bold mt-0.5', color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <AbsorptionBar pct={d?.absorptionPct ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Kesehatan Proyek */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-text-secondary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">Kesehatan Proyek</h2>
            </div>
            <button onClick={() => navigate('/proyek')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Semua <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {(d?.projectHealth ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-text-placeholder">Belum ada proyek</p>
            ) : (
              (d?.projectHealth ?? []).slice(0, 5).map((p) => (
                <ProjectHealthRow key={p.id} project={p} onClick={() => navigate(`/proyek/${p.id}`)} />
              ))
            )}
          </div>
        </div>

        {/* Menunggu tindakan */}
        <div className="flex flex-col gap-4">
          {/* Persetujuan pending */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-text-secondary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">Menunggu Tindakan</h2>
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
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm hover:border-primary/30 hover:bg-white transition-all"
                >
                  <span className="font-medium text-text-secondary">{label}</span>
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', count > 0 ? color : 'bg-gray-50 text-gray-400 border-gray-200')}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Nominal Besar */}
          <div
            className={cn(
              'rounded-2xl border p-5 transition-colors',
              d?.pendingLimitChange
                ? 'border-[#F29D38]/40 bg-[#FDF0DC]'
                : 'border-border bg-white shadow-sm',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Flag className={cn('h-4 w-4', d?.pendingLimitChange ? 'text-[#B56910]' : 'text-text-secondary')} />
              <h2 className={cn('font-heading text-base font-semibold', d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-text-primary')}>
                Nominal Besar
              </h2>
            </div>
            <p className={cn('text-sm', d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-text-secondary')}>
              Batas saat ini:{' '}
              <span className="font-semibold">{formatRupiah(d?.currentLimit) ?? 'Belum ditetapkan'}</span>
            </p>
            {d?.pendingLimitChange && (
              <button
                onClick={() => navigate('/nominal-besar')}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F29D38]/50 bg-white px-4 py-2 text-xs font-semibold text-[#8A550F] hover:bg-[#FDF0DC] transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Ada Usulan Menunggu Konfirmasi
              </button>
            )}
            {!d?.pendingLimitChange && (
              <button
                onClick={() => navigate('/nominal-besar')}
                className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Kelola batas <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
