import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Lock,
  EyeOff,
  Plus,
  FileEdit,
} from 'lucide-react';
import { getActiveBudget, getBudgetSummary } from '@/lib/api-budgets';
import { useAuthStore } from '@/stores/auth';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import { BudgetRequestFormModal } from '../budgets/BudgetRequestFormModal';

interface Props {
  projectId: string;
  canEdit?: boolean;
}

function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function AbsorptionBar({ pct, isOverBudget, isWarning }: { pct: number; isOverBudget: boolean; isWarning: boolean }) {
  const clampedPct = Math.min(pct, 100);
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-text-secondary">Serapan</span>
        <span className={cn(
          'font-semibold',
          isOverBudget ? 'text-[#B0000F]' : isWarning ? 'text-[#B56910]' : 'text-[#48742C]',
        )}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-[#EBE3E4] rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${clampedPct}%`,
            background: isOverBudget
              ? '#B0000F'
              : isWarning
                ? '#F29D38'
                : '#48742C',
          }}
        />
      </div>
      {isOverBudget && (
        <div
          className="absolute top-0 right-0 h-3 w-3 bg-[#B0000F] rounded-full"
          style={{ right: '-6px', top: '18px' }}
        />
      )}
    </div>
  );
}

export default function ProjectBudgetTab({ projectId, canEdit }: Props) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState<'awal' | 'perubahan'>('awal');

  const {
    data: activeBudget,
    isLoading: budgetLoading,
    isError: isBudgetError,
    error: budgetError,
    refetch: refetchBudget,
  } = useQuery({
    queryKey: ['project-budget-active', projectId],
    queryFn: () => getActiveBudget(projectId),
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['project-budget-summary', projectId],
    queryFn: () => getBudgetSummary(projectId),
  });

  if (budgetLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isBudgetError || isSummaryError) {
    return (
      <div className="py-8">
        <ErrorState
          message={extractErrorMessage(budgetError || summaryError, 'Gagal memuat anggaran proyek')}
          onRetry={() => {
            refetchBudget();
            refetchSummary();
          }}
        />
      </div>
    );
  }

  if (!activeBudget && !summary) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCE4E7] mb-4">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-text-primary mb-1">Belum Ada Anggaran</h3>
        <p className="text-sm text-text-secondary max-w-xs mx-auto mb-5">
          {isAdmin && canEdit
            ? 'Proyek ini belum memiliki alokasi anggaran aktif. Admin atau Super Admin dapat mengajukan anggaran awal.'
            : 'Anggaran proyek ini belum diajukan atau disetujui.'}
        </p>

        {isAdmin && canEdit && (
          <button
            type="button"
            id="btn-create-initial-budget"
            onClick={() => {
              setFormType('awal');
              setShowFormModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Ajukan Anggaran Awal
          </button>
        )}

        {showFormModal && (
          <BudgetRequestFormModal
            projectId={projectId}
            defaultType={formType}
            onClose={() => setShowFormModal(false)}
            onSuccess={() => {
              refetchBudget();
              refetchSummary();
            }}
          />
        )}
      </div>
    );
  }

  const isOverBudget = summary?.isOverBudget ?? false;
  const isWarning = !isOverBudget && (summary?.absorptionPct ?? 0) >= 80;
  const absorptionPct = summary?.absorptionPct ?? 0;
  const isCostHidden = summary?.isCostHidden ?? false;

  return (
    <div className="flex flex-col gap-5">
      {/* Action Header jika sudah ada anggaran */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Alokasi &amp; Penyerapan Anggaran</h3>
          <p className="text-xs text-text-secondary">Pantau realisasi aktual pengeluaran dan tenaga kerja terhadap batas anggaran</p>
        </div>
        {isAdmin && canEdit && (
          <button
            type="button"
            id="btn-request-budget-change"
            onClick={() => {
              setFormType('perubahan');
              setShowFormModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-primary hover:border-primary hover:text-primary transition-colors shadow-2xs"
          >
            <FileEdit className="h-3.5 w-3.5" />
            Ajukan Perubahan Anggaran
          </button>
        )}
      </div>
      {/* Peringatan dini */}
      {summary?.isEarlyWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F29D38]/40 bg-[#FDF0DC] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B56910]" />
          <div>
            <p className="font-semibold text-[#8A550F] text-sm">Peringatan Dini Serapan</p>
            <p className="text-xs text-[#8A550F] mt-0.5">
              Serapan anggaran ({Math.round(absorptionPct)}%) melebihi progres kerja ({Math.round(summary?.progressPct ?? 0)}%).
              Proyek berisiko melebihi batas anggaran.
            </p>
          </div>
        </div>
      )}

      {isOverBudget && (
        <div className="flex items-start gap-3 rounded-xl border border-[#B0000F]/20 bg-[#FCE4E7] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B0000F]" />
          <div>
            <p className="font-semibold text-[#B0000F] text-sm">Anggaran Terlampaui</p>
            <p className="text-xs text-[#B0000F] mt-0.5">
              Realisasi aktual sudah melebihi anggaran yang disetujui. Segera ajukan perubahan anggaran.
            </p>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Anggaran', value: formatRupiah(summary?.totalBudgeted ?? activeBudget?.totalAmount), icon: Wallet, color: 'bg-blue-50 text-blue-700' },
          {
            label: 'Realisasi',
            value: isCostHidden ? null : formatRupiah(summary?.totalActual),
            icon: TrendingUp,
            color: 'bg-orange-50 text-orange-700',
          },
          {
            label: 'Status Anggaran',
            value: activeBudget?.isBaseline ? 'Baseline (Terkunci)' : 'Draft',
            icon: activeBudget?.isBaseline ? Lock : Wallet,
            color: activeBudget?.isBaseline ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600',
          },
          { label: 'Progres Kerja', value: `${Math.round(summary?.progressPct ?? 0)}%`, icon: BarChart3, color: 'bg-[#FCE4E7] text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-medium text-text-secondary">{label}</p>
            </div>
            {label === 'Realisasi' && isCostHidden ? (
              <div className="flex items-center gap-1.5">
                <EyeOff className="h-4 w-4 text-[#8A550F]" />
                <span className="text-sm font-semibold text-[#8A550F]">Disembunyikan</span>
              </div>
            ) : (
              <p className="font-heading text-base font-bold text-text-primary">{value ?? '-'}</p>
            )}
          </div>
        ))}
      </div>

      {/* Strip hidden cost detail */}
      {isCostHidden && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F29D38]/40 bg-[#FDF0DC] p-4">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#8A550F]" />
          <div>
            <p className="text-sm font-semibold text-[#8A550F]">Biaya Tenaga Kerja Disembunyikan</p>
            <p className="text-xs text-[#8A550F] mt-0.5">
              {summary?.hiddenReason ?? 'Jumlah pekerja terlalu sedikit untuk ditampilkan. Realisasi biaya tenaga kerja tidak dapat ditampilkan.'}
            </p>
          </div>
        </div>
      )}

      {/* Bar Serapan */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Serapan vs Anggaran</h3>
        </div>
        <AbsorptionBar pct={absorptionPct} isOverBudget={isOverBudget} isWarning={isWarning} />

        <div className="mt-4 flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#48742C]" />
            <span className="text-text-secondary">Aman (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#F29D38]" />
            <span className="text-text-secondary">Waspada (80–99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#B0000F]" />
            <span className="text-text-secondary">Melebihi (&gt;100%)</span>
          </div>
        </div>
      </div>

      {/* Rincian per kategori */}
      {(summary?.categories ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-3 bg-background">
            <h3 className="text-sm font-semibold text-text-primary">Rincian per Kategori</h3>
          </div>
          <div className="divide-y divide-border/60">
            {summary!.categories.map((cat) => {
              const catPct = cat.absorptionPct;
              const catOver = catPct > 100;
              const catWarn = !catOver && catPct >= 80;

              return (
                <div key={cat.categoryId} className={cn('px-5 py-4 transition-colors', catOver && 'bg-[#FCE4E7]/30')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {catOver ? (
                        <AlertTriangle className="h-4 w-4 text-[#B0000F]" />
                      ) : catPct >= 100 ? (
                        <CheckCircle className="h-4 w-4 text-[#48742C]" />
                      ) : null}
                      <span className="text-sm font-medium text-text-primary">{cat.categoryName}</span>
                    </div>
                    <div className="text-right text-xs text-text-secondary">
                      <span className={cn('font-semibold', catOver ? 'text-[#B0000F]' : catWarn ? 'text-[#B56910]' : 'text-[#48742C]')}>
                        {formatRupiah(cat.actual)}
                      </span>
                      <span className="text-text-placeholder"> / {formatRupiah(cat.budgeted)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#EBE3E4] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(catPct, 100)}%`,
                        background: catOver ? '#B0000F' : catWarn ? '#F29D38' : '#48742C',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-text-placeholder">
                    {Math.round(catPct)}% terserap
                    {catOver && ' — Melebihi Anggaran'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info baseline */}
      {activeBudget?.isBaseline && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 mt-0.5">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-green-800">
              Anggaran Terkunci sebagai Baseline (Versi #{activeBudget.version})
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Alokasi ini berstatus baca saja karena telah ditetapkan sebagai acuan dasar (baseline) proyek.
              Setiap penambahan atau pemindahan alokasi kategori wajib melalui pengajuan perubahan anggaran resmi.
            </p>
          </div>
        </div>
      )}

      {/* Modal Formulir Pengajuan Anggaran */}
      {showFormModal && (
        <BudgetRequestFormModal
          projectId={projectId}
          activeBudget={activeBudget}
          defaultType={formType}
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            refetchBudget();
            refetchSummary();
          }}
        />
      )}
    </div>
  );
}
