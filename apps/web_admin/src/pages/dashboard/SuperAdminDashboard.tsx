import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Wallet,
  Users,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Flag,
  ArrowRight,
  ShieldAlert,
  Building2,
  Calendar,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { getSuperAdminDashboard } from '@/lib/api-dashboard';
import { useAuthStore } from '@/stores/auth';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { DepartmentAbsorption, ProjectHealthItem } from '@/lib/api-dashboard';

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
        <span
          className={cn(
            'font-semibold',
            isOver ? 'text-[#B0000F]' : isWarn ? 'text-[#B56910]' : 'text-[#48742C]'
          )}
        >
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
            : 'border-border bg-white hover:border-primary/20'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          project.isOverBudget
            ? 'bg-[#FCE4E7] text-[#B0000F]'
            : project.isEarlyWarning
              ? 'bg-[#FDF0DC] text-[#B56910]'
              : 'bg-green-50 text-[#48742C]'
        )}
      >
        {project.isOverBudget ? (
          <AlertTriangle className="h-4 w-4" />
        ) : project.isEarlyWarning ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
          {project.department && (
            <span className="text-[11px] font-medium text-text-secondary ml-2 truncate">
              {project.department.name}
            </span>
          )}
        </div>
        <div className="mt-1">
          <AbsorptionBar pct={project.absorptionPct} />
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-placeholder" />
    </button>
  );
}

function DepartmentAbsorptionCard({ item }: { item: DepartmentAbsorption }) {
  const pct = item.absorptionPct;
  const isOver = pct > 100;
  const isWarn = !isOver && pct >= 80;

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary truncate">{item.departmentName}</span>
        <span
          className={cn(
            'text-xs font-bold rounded-full px-2 py-0.5',
            isOver ? 'bg-[#FCE4E7] text-[#B0000F]' : isWarn ? 'bg-[#FDF0DC] text-[#8A550F]' : 'bg-green-50 text-[#48742C]'
          )}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
        <span>Aktual: {formatRupiah(item.actual)}</span>
        <span>Plafon: {formatRupiah(item.budgeted)}</span>
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

function getSuperAdminGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getSuperAdminDateText(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-super-admin'],
    queryFn: getSuperAdminDashboard,
    refetchInterval: 60_000,
  });

  const greetingText = getSuperAdminGreeting();
  const currentDateText = getSuperAdminDateText();

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
          message={extractErrorMessage(error, 'Gagal memuat data dasbor Super Admin')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const d = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Greeting & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {greetingText}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Ringkasan tata kelola sistem, anggaran perusahaan, dan audit operasional.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-1.5 text-xs text-text-secondary shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>
            {currentDateText}
          </span>
        </div>
      </div>

      {/* KPI Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Anggaran Perusahaan */}
        <button
          onClick={() => navigate('/anggaran')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-primary border border-rose-100 shadow-2xs">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-[9px] font-bold">
              GLOBAL KORPORAT
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Anggaran Perusahaan</p>
            <p className="font-heading text-2xl font-black text-text-primary mt-0.5 tracking-tight">
              {formatRupiah(d?.totalBudgetCompany)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-text-placeholder border-t border-slate-100 pt-2 font-medium">
              <span className="truncate">Terpakai: {formatRupiah(d?.totalUsedCompany)} ({Math.round(d?.absorptionPctCompany ?? 0)}%)</span>
              <ArrowRight className="h-3.5 w-3.5 text-text-placeholder group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-1" />
            </div>
          </div>
        </button>

        {/* Card 2: Proyek Aktif (Semua Dept) (Elevated White Card - Crimson Accent) */}
        <button
          onClick={() => navigate('/proyek')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-primary border border-rose-100 shadow-2xs">
              <FolderKanban className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
              Semua Dept
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Proyek Aktif (Semua Dept)</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {d?.activeProjects ?? 0}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span className="truncate">Seluruh operasional aktif</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
            </div>
          </div>
        </button>

        {/* Card 3: Total Pengguna (Elevated White Card - Emerald Accent) */}
        <button
          onClick={() => navigate('/sistem/pengguna')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-400/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#48742C] border border-emerald-200/60 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#48742C]">
              4 Peran
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Pengguna</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {d?.totalUsers ?? 0}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span className="truncate">Kelola akun & hak akses</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
            </div>
          </div>
        </button>

        {/* Card 4: Keputusan Anggaran Menunggu (Elevated White Card - Amber Accent) */}
        <button
          onClick={() => navigate('/anggaran')}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-left bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-400/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#B56910] border border-amber-200/60 shadow-2xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-[#8A550F]">
              Tahap 4
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Keputusan Anggaran Menunggu</p>
            <p className="font-heading text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {d?.pendingBudgetDecisions ?? 0}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
              <span className="truncate">Tahap akhir Super Admin</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
            </div>
          </div>
        </button>
      </div>

      {/* Serapan Seluruh Departemen */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">
              Serapan Anggaran Lintas Departemen
            </h2>
          </div>
          <button
            onClick={() => navigate('/anggaran')}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Pengajuan Anggaran <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(d?.departmentAbsorption ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-text-placeholder col-span-full">
              Belum ada data anggaran departemen
            </p>
          ) : (
            (d?.departmentAbsorption ?? []).map((dept) => (
              <DepartmentAbsorptionCard key={dept.departmentId} item={dept} />
            ))
          )}
        </div>
      </div>

      {/* Grid: Project Health & System Action / Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Project Health (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-text-secondary" />
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Kesehatan Seluruh Proyek
              </h2>
            </div>
            <button
              onClick={() => navigate('/proyek')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Semua Proyek <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-4 space-y-2.5">
            {(d?.projectHealth ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-text-placeholder">Belum ada proyek aktif</p>
            ) : (
              (d?.projectHealth ?? []).slice(0, 6).map((p) => (
                <ProjectHealthRow key={p.id} project={p} onClick={() => navigate(`/proyek/${p.id}`)} />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Limits and Recent Activity */}
        <div className="flex flex-col gap-4">
          {/* Nominal Besar Card (Super Admin is READ ONLY) */}
          <div
            className={cn(
              'rounded-2xl border p-5 transition-colors',
              d?.pendingLimitChange
                ? 'border-[#F29D38]/40 bg-[#FDF0DC]'
                : 'border-border bg-white shadow-sm'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flag
                  className={cn(
                    'h-4 w-4',
                    d?.pendingLimitChange ? 'text-[#B56910]' : 'text-text-secondary'
                  )}
                />
                <h3
                  className={cn(
                    'font-heading text-sm font-semibold',
                    d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-text-primary'
                  )}
                >
                  Batas Nominal Besar
                </h3>
              </div>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-text-secondary border border-border">
                Hanya Baca
              </span>
            </div>
            <p
              className={cn(
                'text-xs mb-1.5',
                d?.pendingLimitChange ? 'text-[#8A550F]' : 'text-text-secondary'
              )}
            >
              Batas saat ini:{' '}
              <span className="font-bold text-text-primary">
                {formatRupiah(d?.currentLimit) ?? 'Belum ditetapkan'}
              </span>
            </p>
            <p className="text-[11px] text-text-placeholder leading-relaxed mb-3">
              Perubahan batas hanya dilakukan oleh kesepakatan dua pihak (Admin dan Finance). Super Admin tidak dapat mengusulkan maupun mengonfirmasi batas.
            </p>
            <button
              onClick={() => navigate('/nominal-besar')}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-medium text-text-secondary hover:border-primary/30 transition-all"
            >
              <span>Lihat Riwayat Batas</span>
              <ArrowRight className="h-3.5 w-3.5 text-text-placeholder" />
            </button>
          </div>

          {/* Quick System Links */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold text-text-primary">Administrasi Sistem</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Kelola Biaya Per Jam (Labor Cost)', to: '/sistem/biaya-per-jam' },
                { label: 'Manajemen Pengguna & Peran', to: '/sistem/pengguna' },
                { label: 'Master Data & Kategori', to: '/sistem/master-data' },
                { label: 'Departemen & Cost Center', to: '/sistem/departemen' },
              ].map(({ label, to }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-text-secondary hover:border-primary/30 hover:bg-white hover:text-text-primary transition-all"
                >
                  <span>{label}</span>
                  <ArrowRight className="h-3 w-3 text-text-placeholder" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-text-secondary" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Aktivitas Terkini</h3>
              </div>
              <button
                onClick={() => navigate('/sistem/log-aktivitas')}
                className="text-xs text-primary hover:underline"
              >
                Log Lengkap
              </button>
            </div>
            <div className="space-y-2.5">
              {(d?.recentActivities ?? []).length === 0 ? (
                <p className="py-4 text-center text-xs text-text-placeholder">Belum ada aktivitas tercatat</p>
              ) : (
                (d?.recentActivities ?? []).slice(0, 5).map((act) => (
                  <div key={act.id} className="border-b border-border/50 pb-2 text-xs last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary capitalize">{act.action}</span>
                      <span className="text-[10px] text-text-placeholder">
                        {act.createdAt ? new Date(act.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                      {act.user?.name ?? 'Sistem'} • <span className="font-mono text-[10px]">{act.module}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
