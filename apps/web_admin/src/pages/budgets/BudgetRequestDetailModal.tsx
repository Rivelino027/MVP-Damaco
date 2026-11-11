import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X,
  Wallet,
  CheckCircle,
  XCircle,
  TrendingUp,
  User,
  Calendar,
  FileText,
  Layers,
} from 'lucide-react';
import {
  getBudgetRequestById,
  approveBudgetFinance,
  approveBudgetSuperAdmin,
} from '@/lib/api-budgets';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import type { BudgetRequest, BudgetRequestStatus } from '@/types/budgets';

const STATUS_LABELS: Record<BudgetRequestStatus, string> = {
  draft: 'Draft',
  menunggu_admin: 'Menunggu Admin',
  menunggu_finance: 'Menunggu Finance',
  menunggu_super_admin: 'Menunggu Super Admin',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// 4-langkah rantai persetujuan: Pengaju -> Admin -> Finance -> Super Admin
function ApprovalChain4({ history }: { history: { stepOrder: number; role: string; status: string; actedAt: string | null; approver?: { name: string } | null }[] }) {
  const steps = [
    { stepOrder: 1, role: 'admin', label: 'Admin' },
    { stepOrder: 2, role: 'finance', label: 'Finance' },
    { stepOrder: 3, role: 'super_admin', label: 'Super Admin' },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const record = history.find((h) => h.stepOrder === step.stepOrder);
        const isApproved = record?.status === 'disetujui';
        const isRejected = record?.status === 'ditolak';

        return (
          <div key={step.stepOrder} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  isApproved && 'bg-green-100 text-green-700',
                  isRejected && 'bg-[#FCE4E7] text-[#B0000F]',
                  !isApproved && !isRejected && 'bg-gray-100 text-gray-400',
                )}
              >
                {isApproved ? <CheckCircle className="h-4 w-4" /> : isRejected ? <XCircle className="h-4 w-4" /> : step.stepOrder}
              </div>
              <span className="text-[10px] font-medium text-text-secondary">{step.label}</span>
              {record?.actedAt && (
                <span className="text-[9px] text-text-placeholder">
                  {new Date(record.actedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('h-0.5 w-10 mx-1', isApproved ? 'bg-green-400' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  request: BudgetRequest;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function BudgetRequestDetailModal({ request, onClose, onApprove, onReject }: Props) {
  const { user } = useAuthStore();
  const role = user?.role;

  const { data: detail, isLoading } = useQuery({
    queryKey: ['budget-request-detail', request.id],
    queryFn: () => getBudgetRequestById(request.id),
  });

  const req = detail ?? request;
  const history = req.approvalHistory ?? [];
  const items = req.items ?? [];

  const canApproveFinance = role === 'finance' && req.status === 'menunggu_finance';
  const canApproveSuperAdmin = role === 'super_admin' && req.status === 'menunggu_super_admin';
  const canApprove = canApproveFinance || canApproveSuperAdmin;

  const approveMutation = useMutation({
    mutationFn: () =>
      canApproveSuperAdmin ? approveBudgetSuperAdmin(req.id) : approveBudgetFinance(req.id),
    onSuccess: () => onApprove?.(),
  });

  // Kelompokkan item per kategori
  const categoryTotals = items.reduce<Record<string, { name: string; newAmount: number; oldAmount: number }>>((acc, item) => {
    const key = item.categoryId;
    if (!acc[key]) {
      acc[key] = { name: item.category?.name ?? key, newAmount: 0, oldAmount: 0 };
    }
    acc[key].newAmount += Number(item.newAmount);
    acc[key].oldAmount += Number(item.oldAmount);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary">
                {req.type === 'awal' ? 'Pengajuan Anggaran Awal' : 'Perubahan Anggaran'}
              </h2>
              <p className="text-xs text-text-placeholder">#{req.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-placeholder hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-y-auto p-6 space-y-6">
            {/* Total hero */}
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">Total Anggaran</p>
              <p className="font-heading text-3xl font-bold text-text-primary">{formatRupiah(req.totalAmount)}</p>
              {req.extraAmount && Number(req.extraAmount) > 0 && (
                <p className="mt-1 text-sm text-text-secondary">
                  Tambahan: <span className="font-semibold text-primary">{formatRupiah(req.extraAmount)}</span>
                </p>
              )}
              <div className="mt-2 flex justify-center">
                <span className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  req.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                  req.status === 'disetujui' ? 'bg-green-50 text-green-700' :
                  'bg-orange-50 text-orange-700'
                )}>
                  {STATUS_LABELS[req.status]}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: TrendingUp, label: 'Proyek', value: req.project?.name ?? '-' },
                { icon: User, label: 'Pengaju', value: req.requestedBy?.name ?? '-' },
                { icon: Calendar, label: 'Diajukan', value: formatDate(req.submittedAt) },
                { icon: Layers, label: 'Departemen', value: req.project?.department?.name ?? '-' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FCE4E7]">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-placeholder">{label}</p>
                    <p className="text-sm font-medium text-text-primary">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Rincian per kategori */}
            {Object.keys(categoryTotals).length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="border-b border-border bg-background px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">Rincian Anggaran per Kategori</p>
                </div>
                <div className="divide-y divide-border/60">
                  {Object.values(categoryTotals).map((cat) => {
                    const pct = cat.newAmount > 0 ? Math.round((cat.newAmount / Number(req.totalAmount)) * 100) : 0;
                    return (
                      <div key={cat.name} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-text-primary">{formatRupiah(cat.newAmount)}</span>
                            {req.type === 'perubahan' && cat.oldAmount > 0 && (
                              <p className="text-xs text-text-placeholder">dari {formatRupiah(cat.oldAmount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-[#EBE3E4] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #E8141C, #B0000F)',
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-text-placeholder">{pct}% dari total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alasan */}
            {req.reason && (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-text-secondary" />
                  <p className="text-sm font-semibold text-text-primary">Alasan / Keterangan</p>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{req.reason}</p>
              </div>
            )}

            {/* Rantai persetujuan 4 langkah */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="mb-4 text-sm font-semibold text-text-primary">Rantai Persetujuan (4 Langkah)</p>
              <div className="flex items-center gap-4">
                {/* Pengaju */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FCE4E7]">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-text-secondary">Pengaju</span>
                </div>
                <div className="h-0.5 w-8 bg-border" />
                <ApprovalChain4 history={history} />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {(canApprove && onApprove) && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            {onReject && (
              <button
                id={`modal-budget-reject-${req.id}`}
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-[#B0000F] hover:bg-[#FCE4E7] transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Tolak
              </button>
            )}
            <button
              id={`modal-budget-approve-${req.id}`}
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl gradient-primary px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              {approveMutation.isPending
                ? 'Memproses...'
                : canApproveSuperAdmin
                  ? 'Setujui Anggaran'
                  : 'Nyatakan Layak'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
