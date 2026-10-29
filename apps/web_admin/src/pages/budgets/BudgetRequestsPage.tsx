import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import {
  getBudgetRequests,
  approveBudgetFinance,
  approveBudgetSuperAdmin,
} from '@/lib/api-budgets';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { BudgetRequest, BudgetRequestStatus } from '@/types/budgets';
import { BudgetRequestDetailModal } from './BudgetRequestDetailModal';
import { RejectBudgetModal } from './RejectBudgetModal';
import { BudgetRequestFormModal } from './BudgetRequestFormModal';

const STATUS_LABELS: Record<BudgetRequestStatus, string> = {
  draft: 'Draft',
  menunggu_admin: 'Menunggu Admin',
  menunggu_finance: 'Menunggu Finance',
  menunggu_super_admin: 'Menunggu Super Admin',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

const STATUS_STYLES: Record<BudgetRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  menunggu_admin: 'bg-blue-50 text-blue-700',
  menunggu_finance: 'bg-orange-50 text-orange-700',
  menunggu_super_admin: 'bg-purple-50 text-purple-700',
  disetujui: 'bg-green-50 text-green-700',
  ditolak: 'bg-[#FCE4E7] text-[#B0000F]',
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
    month: 'short',
    year: 'numeric',
  });
}

export default function BudgetRequestsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BudgetRequest | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [page, setPage] = useState(1);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isFinance = role === 'finance';
  const isSuperAdmin = role === 'super_admin';
  const canCreate = isAdmin || isSuperAdmin;

  const defaultStatus =
    statusFilter ||
    (isFinance ? 'menunggu_finance' : isSuperAdmin ? 'menunggu_super_admin' : 'menunggu_admin');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['budget-requests', defaultStatus, page],
    queryFn: () =>
      getBudgetRequests({ status: defaultStatus || undefined, page, limit: 20 }),
  });

  const requests = data?.data ?? [];
  const total = data?.total ?? 0;

  const filtered = search
    ? requests.filter(
        (r) =>
          r.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.requestedBy?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : requests;

  const handleAfterAction = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
    setSelectedRequest(null);
    setRejectTarget(null);
  };

  const canApprove = (req: BudgetRequest) => {
    if (isFinance && req.status === 'menunggu_finance') return true;
    if (isSuperAdmin && req.status === 'menunggu_super_admin') return true;
    return false;
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      isSuperAdmin ? approveBudgetSuperAdmin(id) : approveBudgetFinance(id),
    onSuccess: handleAfterAction,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {isSuperAdmin ? 'Keputusan Anggaran' : isFinance ? 'Cek Kelayakan Anggaran' : 'Pengajuan Anggaran'}
            </h1>
            <p className="text-sm text-text-secondary">
              {isSuperAdmin
                ? 'Putuskan pengajuan anggaran proyek'
                : isFinance
                  ? 'Verifikasi kelayakan anggaran yang diajukan'
                  : 'Kelola dan ajukan anggaran proyek departemen'}
            </p>
          </div>
        </div>

        {/* Summary chips & Create button */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[
              {
                label: 'Menunggu',
                count: requests.filter((r) =>
                  isFinance ? r.status === 'menunggu_finance' :
                  isSuperAdmin ? r.status === 'menunggu_super_admin' :
                  r.status === 'menunggu_admin'
                ).length,
                color: 'bg-orange-50 text-orange-700 border-orange-200',
              },
            ].map((chip) => (
              <div
                key={chip.label}
                className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', chip.color)}
              >
                <span>{chip.count}</span>
                <span>{chip.label}</span>
              </div>
            ))}
          </div>

          {canCreate && (
            <button
              id="btn-create-budget-request"
              onClick={() => setShowFormModal(true)}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Ajukan Anggaran
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari proyek atau pengaju..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_admin">Menunggu Admin</option>
            <option value="menunggu_finance">Menunggu Finance</option>
            <option value="menunggu_super_admin">Menunggu Super Admin</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
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
              message={extractErrorMessage(error, 'Gagal memuat pengajuan anggaran')}
              onRetry={() => refetch()}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-placeholder">
            <Wallet className="h-12 w-12 opacity-30" />
            <p className="text-sm">Tidak ada pengajuan anggaran ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Proyek</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Pengaju</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Jenis</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Total Anggaran</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Diajukan</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((req) => (
                  <tr key={req.id} className="transition-colors hover:bg-background/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text-primary">{req.project?.name ?? '-'}</p>
                      <p className="text-xs text-text-placeholder">{req.project?.department?.name ?? '-'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-white">
                          {req.requestedBy?.name?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-text-secondary">{req.requestedBy?.name ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        req.type === 'awal' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
                      )}>
                        {req.type === 'awal' ? 'Pengajuan Awal' : 'Perubahan'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold text-text-primary">{formatRupiah(req.totalAmount)}</span>
                      {req.extraAmount && (
                        <p className="text-xs text-text-placeholder">+{formatRupiah(req.extraAmount)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{formatDate(req.submittedAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[req.status])}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`budget-detail-${req.id}`}
                          onClick={() => setSelectedRequest(req)}
                          title="Lihat Detail"
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-primary transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canApprove(req) && (
                          <>
                            <button
                              id={`budget-approve-${req.id}`}
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending}
                              className="rounded-lg gradient-primary px-2.5 py-1.5 text-xs font-medium text-white flex items-center gap-1 shadow-sm disabled:opacity-60"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {isSuperAdmin ? 'Setujui' : 'Layak'}
                            </button>
                            <button
                              id={`budget-reject-${req.id}`}
                              onClick={() => setRejectTarget(req)}
                              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-[#B0000F] hover:bg-[#FCE4E7] transition-colors flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Tolak
                            </button>
                          </>
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
            <p className="text-sm text-text-secondary">Total {total} pengajuan</p>
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

      {/* Modals */}
      {selectedRequest && (
        <BudgetRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={canApprove(selectedRequest) ? handleAfterAction : undefined}
          onReject={() => { setRejectTarget(selectedRequest); setSelectedRequest(null); }}
        />
      )}

      {rejectTarget && (
        <RejectBudgetModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={handleAfterAction}
        />
      )}

      {showFormModal && (
        <BudgetRequestFormModal
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            handleAfterAction();
          }}
        />
      )}
    </div>
  );
}
