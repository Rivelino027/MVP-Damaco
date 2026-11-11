import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Receipt,
  Clock,
  Wallet,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Info,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import {
  getExpenses,
  approveExpenseAdmin,
  verifyExpenseFinance,
} from '@/lib/api-expenses';
import {
  getTeamTimesheetsApi,
  approveTimesheetApi,
  rejectTimesheetApi,
} from '@/lib/api-timesheets';
import {
  getBudgetRequests,
  approveBudgetFinance,
  approveBudgetSuperAdmin,
} from '@/lib/api-budgets';
import { cn, extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import { ErrorState, EmptyState, LoadingState, toast } from '@/components/shared';
import { ExpenseDetailModal } from '@/pages/expenses/ExpenseDetailModal';
import { RejectExpenseModal } from '@/pages/expenses/RejectExpenseModal';
import TimesheetDetailModal from '@/pages/timesheets/TimesheetDetailModal';
import RejectTimesheetModal from '@/pages/timesheets/RejectTimesheetModal';
import { BudgetRequestDetailModal } from '@/pages/budgets/BudgetRequestDetailModal';
import { RejectBudgetModal } from '@/pages/budgets/RejectBudgetModal';
import type { Expense } from '@/types/expenses';
import type { BudgetRequest } from '@/types/budgets';

type ApprovalTab = 'expenses' | 'timesheets' | 'budgets';

export default function ApprovalsInboxPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isFinance = role === 'finance';
  const isSuperAdmin = role === 'super_admin';

  const [activeTab, setActiveTab] = useState<ApprovalTab>('expenses');

  // Expenses Tab State
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('');
  const [expenseLargeAmountFilter, setExpenseLargeAmountFilter] = useState<boolean | undefined>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectExpenseTarget, setRejectExpenseTarget] = useState<Expense | null>(null);

  // Timesheets Tab State
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState<string>('menunggu_admin');
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [rejectTimesheetTarget, setRejectTimesheetTarget] = useState<{ id: string; workerName: string } | null>(null);

  // Budgets Tab State
  const [budgetSearch, setBudgetSearch] = useState('');
  const [budgetStatusFilter, setBudgetStatusFilter] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<BudgetRequest | null>(null);
  const [rejectBudgetTarget, setRejectBudgetTarget] = useState<BudgetRequest | null>(null);

  // Queries for counters
  const defaultExpenseStatus = isAdmin ? 'menunggu_admin' : isFinance ? 'menunggu_finance' : '';
  const { data: expensesData, isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['inbox-expenses', defaultExpenseStatus, expenseStatusFilter, expenseLargeAmountFilter],
    queryFn: () =>
      getExpenses({
        status: expenseStatusFilter || defaultExpenseStatus || undefined,
        isLargeAmount: expenseLargeAmountFilter,
        limit: 50,
      }),
  });

  const { data: timesheetsData, isLoading: timesheetsLoading, error: timesheetsError, refetch: refetchTimesheets } = useQuery({
    queryKey: ['inbox-timesheets', timesheetStatusFilter],
    queryFn: () =>
      getTeamTimesheetsApi({
        status: timesheetStatusFilter === 'all' ? undefined : timesheetStatusFilter,
        limit: 50,
      }),
    enabled: isAdmin || isSuperAdmin,
  });

  const defaultBudgetStatus = isFinance ? 'menunggu_finance' : isSuperAdmin ? 'menunggu_super_admin' : 'menunggu_admin';
  const { data: budgetsData, isLoading: budgetsLoading, error: budgetsError, refetch: refetchBudgets } = useQuery({
    queryKey: ['inbox-budgets', defaultBudgetStatus, budgetStatusFilter],
    queryFn: () =>
      getBudgetRequests({
        status: budgetStatusFilter || defaultBudgetStatus || undefined,
        limit: 50,
      }),
  });

  // Calculate Tab Counts
  const expensesList = expensesData?.data ?? [];
  const pendingExpensesCount = expensesList.filter((e) =>
    isAdmin ? e.status === 'menunggu_admin' : isFinance ? e.status === 'menunggu_finance' : false
  ).length;

  const timesheetsList = timesheetsData?.data ?? [];
  const pendingTimesheetsCount = timesheetsList.filter((t) => t.status === 'menunggu_admin').length;

  const budgetsList = budgetsData?.data ?? [];
  const pendingBudgetsCount = budgetsList.filter((b) =>
    isFinance ? b.status === 'menunggu_finance' : isSuperAdmin ? b.status === 'menunggu_super_admin' : b.status === 'menunggu_admin'
  ).length;

  // Mutations
  const approveExpenseMutation = useMutation({
    mutationFn: (id: string) => (isAdmin ? approveExpenseAdmin(id) : verifyExpenseFinance(id)),
    onSuccess: () => {
      toast.success(isAdmin ? 'Pengeluaran berhasil disetujui' : 'Pengeluaran berhasil diverifikasi');
      queryClient.invalidateQueries({ queryKey: ['inbox-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memproses persetujuan pengeluaran'));
    },
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: (id: string) => approveTimesheetApi(id),
    onSuccess: () => {
      toast.success('Timesheet berhasil disetujui');
      queryClient.invalidateQueries({ queryKey: ['inbox-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['team-timesheets'] });
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal menyetujui timesheet'));
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectTimesheetApi(id, reason),
    onSuccess: () => {
      toast.success('Timesheet berhasil ditolak');
      queryClient.invalidateQueries({ queryKey: ['inbox-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['team-timesheets'] });
      setRejectTimesheetTarget(null);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal menolak timesheet'));
    },
  });

  const approveBudgetMutation = useMutation({
    mutationFn: (id: string) => (isSuperAdmin ? approveBudgetSuperAdmin(id) : approveBudgetFinance(id)),
    onSuccess: () => {
      toast.success(isSuperAdmin ? 'Anggaran berhasil disetujui' : 'Anggaran dinyatakan layak');
      queryClient.invalidateQueries({ queryKey: ['inbox-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memproses persetujuan anggaran'));
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Kotak Masuk Persetujuan
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pipeline Aktif
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Pusat peninjauan dan keputusan dokumen pengeluaran, timesheet, dan anggaran
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise Metric / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Menunggu */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Antrean Tindakan</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/60 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Perlu Keputusan
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {pendingExpensesCount + ((isAdmin || isSuperAdmin) ? pendingTimesheetsCount : 0) + pendingBudgetsCount}
            </span>
            <span className="text-xs text-text-placeholder">dokumen total</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Admin, Finance & Super Admin</span>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pengeluaran</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-text-primary">{pendingExpensesCount}</span>
            <span className="text-xs text-text-placeholder">menunggu audit</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-orange-600 font-medium">
            <span>{isAdmin ? 'Verifikasi Admin Dept.' : isFinance ? 'Verifikasi Finance' : 'Hanya Baca'}</span>
          </div>
        </div>

        {/* Timesheet */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Timesheet Tim</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-text-primary">
              {isAdmin || isSuperAdmin ? pendingTimesheetsCount : '—'}
            </span>
            <span className="text-xs text-text-placeholder">minggu kerja</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
            <span>{isFinance ? 'Khusus Admin Departemen' : 'Persetujuan Jam Kerja'}</span>
          </div>
        </div>

        {/* Usulan Anggaran */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Usulan Anggaran</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-text-primary">{pendingBudgetsCount}</span>
            <span className="text-xs text-text-placeholder">usulan proyek</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-600 font-medium">
            <span>Rantai 4 Langkah</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        {/* Tab Pengeluaran */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'expenses'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Pengeluaran</span>
          {pendingExpensesCount > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {pendingExpensesCount}
            </span>
          )}
        </button>

        {/* Tab Timesheet */}
        <button
          onClick={() => setActiveTab('timesheets')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'timesheets'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Clock className="h-4 w-4" />
          <span>Timesheet</span>
          {(isAdmin || isSuperAdmin) && pendingTimesheetsCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {pendingTimesheetsCount}
            </span>
          )}
        </button>

        {/* Tab Anggaran */}
        <button
          onClick={() => setActiveTab('budgets')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'budgets'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Wallet className="h-4 w-4" />
          <span>Anggaran</span>
          {pendingBudgetsCount > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              {pendingBudgetsCount}
            </span>
          )}
        </button>
      </div>

      {/* ===================== TAB 1: PENGELUARAN ===================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
              <input
                type="text"
                placeholder="Cari pengaju, proyek, vendor..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-secondary" />
              <select
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">Status Bawaan Peran</option>
                <option value="menunggu_admin">Menunggu Admin</option>
                <option value="menunggu_finance">Menunggu Finance</option>
                <option value="disetujui">Disetujui</option>
                <option value="siap_dibayar">Siap Dibayar</option>
                <option value="dibayar">Dibayar</option>
                <option value="ditolak">Ditolak</option>
              </select>

              <button
                onClick={() => setExpenseLargeAmountFilter(expenseLargeAmountFilter ? undefined : true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                  expenseLargeAmountFilter
                    ? 'border-[#F29D38]/50 bg-[#FDF0DC] text-[#8A550F]'
                    : 'border-border bg-white text-text-secondary hover:text-text-primary'
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Nominal Besar
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            {expensesLoading ? (
              <div className="py-16">
                <LoadingState message="Memuat pengeluaran..." />
              </div>
            ) : expensesError ? (
              <div className="py-8">
                <ErrorState
                  message={extractErrorMessage(expensesError, 'Gagal memuat daftar pengeluaran')}
                  onRetry={() => refetchExpenses()}
                />
              </div>
            ) : expensesList.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Tidak Ada Pengeluaran Menunggu"
                  description="Tidak ada dokumen pengeluaran yang memerlukan tindakan persetujuan saat ini."
                  icon={<Receipt className="h-10 w-10 text-text-placeholder opacity-40" />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      <th className="px-5 py-3.5 text-left">Pengaju</th>
                      <th className="px-5 py-3.5 text-left">Proyek & Kategori</th>
                      <th className="px-5 py-3.5 text-left">Vendor</th>
                      <th className="px-5 py-3.5 text-left">Tanggal</th>
                      <th className="px-5 py-3.5 text-right">Jumlah</th>
                      <th className="px-5 py-3.5 text-left">Status</th>
                      <th className="px-5 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {expensesList
                      .filter((exp) => {
                        if (!expenseSearch) return true;
                        const s = expenseSearch.toLowerCase();
                        return (
                          exp.requester?.name?.toLowerCase().includes(s) ||
                          exp.project?.name?.toLowerCase().includes(s) ||
                          exp.vendor?.toLowerCase().includes(s)
                        );
                      })
                      .map((exp) => {
                        const canApproveExp =
                          (isAdmin && exp.status === 'menunggu_admin' && exp.requesterId !== user?.id) ||
                          (isFinance && exp.status === 'menunggu_finance' && exp.requesterId !== user?.id);
                        const isOwn =
                          (isAdmin && exp.status === 'menunggu_admin' && exp.requesterId === user?.id) ||
                          (isFinance && exp.status === 'menunggu_finance' && exp.requesterId === user?.id);

                        return (
                          <tr key={exp.id} className="hover:bg-background/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-text-primary">{exp.requester?.name ?? '-'}</p>
                              <p className="text-xs text-text-placeholder">{exp.requester?.department?.name ?? '-'}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-text-primary">{exp.project?.name ?? '-'}</p>
                              <p className="text-xs text-text-placeholder">{exp.category?.name ?? '-'}</p>
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary">{exp.vendor || '-'}</td>
                            <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-heading font-bold text-text-primary">{formatCurrency(exp.amount)}</span>
                                {exp.isLargeAmount && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0DC] px-2 py-0.5 text-[10px] font-semibold text-[#8A550F]">
                                    <AlertTriangle className="h-3 w-3" />
                                    Nominal Besar
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                                exp.status === 'disetujui' ? 'bg-green-50 text-green-700' :
                                exp.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                                'bg-orange-50 text-orange-700'
                              )}>
                                {exp.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedExpense(exp)}
                                  className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:bg-slate-50 transition-colors shadow-2xs"
                                  title="Lihat Detail & Rantai Persetujuan"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Detail
                                </button>

                                {isSuperAdmin ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 cursor-default" title="Super Admin tidak termasuk rantai persetujuan pengeluaran">
                                    Hanya Baca
                                  </span>
                                ) : isOwn ? (
                                  <button
                                    disabled
                                    className="h-8 inline-flex items-center rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400 cursor-not-allowed opacity-75"
                                    title="Anda tidak dapat menyetujui pengeluaran milik Anda sendiri"
                                  >
                                    Pengajuan Sendiri
                                  </button>
                                ) : canApproveExp ? (
                                  <>
                                    <button
                                      onClick={() => approveExpenseMutation.mutate(exp.id)}
                                      disabled={approveExpenseMutation.isPending}
                                      className="h-8 inline-flex items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      {isAdmin ? 'Setujui' : 'Verifikasi'}
                                    </button>
                                    <button
                                      onClick={() => setRejectExpenseTarget(exp)}
                                      className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary-dark hover:bg-danger-tint transition-colors shadow-2xs"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Tolak
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TIMESHEET ===================== */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          {isFinance ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 text-center text-xs text-[#0A2E7F]">
              <Info className="h-8 w-8 text-[#0A47B8] mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-sm">Timesheet Diverifikasi oleh Admin</p>
              <p className="mt-1 max-w-md mx-auto text-text-secondary">
                Sesuai aturan bisnis, rantai persetujuan timesheet kerja disetujui langsung oleh Admin Departemen dan tidak melibatkan Finance.
              </p>
            </div>
          ) : (
            <>
              {/* Filter Timesheets */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                  <input
                    type="text"
                    placeholder="Cari anggota tim..."
                    value={timesheetSearch}
                    onChange={(e) => setTimesheetSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none"
                  />
                </div>

                <select
                  value={timesheetStatusFilter}
                  onChange={(e) => setTimesheetStatusFilter(e.target.value)}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="menunggu_admin">Menunggu Persetujuan Admin</option>
                  <option value="all">Semua Status</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>

              {/* Timesheets Table */}
              <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                {timesheetsLoading ? (
                  <div className="py-16">
                    <LoadingState message="Memuat timesheet..." />
                  </div>
                ) : timesheetsError ? (
                  <div className="py-8">
                    <ErrorState
                      message={extractErrorMessage(timesheetsError, 'Gagal memuat timesheet tim')}
                      onRetry={() => refetchTimesheets()}
                    />
                  </div>
                ) : timesheetsList.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="Tidak Ada Timesheet Menunggu"
                      description="Semua timesheet anggota tim departemen telah diproses."
                      icon={<Clock className="h-10 w-10 text-text-placeholder opacity-40" />}
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          <th className="px-5 py-3.5 text-left">Anggota Tim</th>
                          <th className="px-5 py-3.5 text-left">Departemen</th>
                          <th className="px-5 py-3.5 text-left">Minggu Kerja</th>
                          <th className="px-5 py-3.5 text-center">Total Jam</th>
                          <th className="px-5 py-3.5 text-left">Status</th>
                          <th className="px-5 py-3.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {timesheetsList
                          .filter((t) => !timesheetSearch || t.user?.name?.toLowerCase().includes(timesheetSearch.toLowerCase()))
                          .map((ts) => {
                            const isOwn = isAdmin && ts.user?.id === user?.id;
                            const isAwaiting = ts.status === 'menunggu_admin';

                            return (
                              <tr key={ts.id} className="hover:bg-background/60 transition-colors">
                                <td className="px-5 py-3.5">
                                  <p className="font-semibold text-text-primary">{ts.user?.name ?? 'Pekerja'}</p>
                                  <p className="text-xs text-text-placeholder">{ts.user?.email ?? '-'}</p>
                                </td>
                                <td className="px-5 py-3.5 text-text-secondary">{ts.user?.department?.name ?? '-'}</td>
                                <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{formatDate(ts.weekStart)}</td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-text-primary border border-border">
                                    {ts.totalHours} jam
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={cn(
                                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                                    ts.status === 'disetujui' ? 'bg-green-50 text-green-700' :
                                    ts.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                                    'bg-blue-50 text-blue-700'
                                  )}>
                                    {ts.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => setSelectedTimesheetId(ts.id)}
                                      className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:bg-slate-50 transition-colors shadow-2xs"
                                      title="Lihat Detail"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Detail
                                    </button>

                                    {isAwaiting && (
                                      <>
                                        {isOwn ? (
                                          <button
                                            disabled
                                            className="h-8 inline-flex items-center rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400 cursor-not-allowed opacity-75"
                                            title="Anda tidak dapat menyetujui timesheet milik Anda sendiri"
                                          >
                                            Timesheet Sendiri
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => approveTimesheetMutation.mutate(ts.id)}
                                              disabled={approveTimesheetMutation.isPending}
                                              className="h-8 inline-flex items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                              Setujui
                                            </button>
                                            <button
                                              onClick={() => setRejectTimesheetTarget({ id: ts.id, workerName: ts.user?.name ?? 'Pekerja' })}
                                              className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary-dark hover:bg-danger-tint transition-colors shadow-2xs"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                              Tolak
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== TAB 3: ANGGARAN ===================== */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
              <input
                type="text"
                placeholder="Cari proyek atau pengaju..."
                value={budgetSearch}
                onChange={(e) => setBudgetSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none"
              />
            </div>

            <select
              value={budgetStatusFilter}
              onChange={(e) => setBudgetStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Status Sesuai Peran</option>
              <option value="menunggu_finance">Menunggu Finance</option>
              <option value="menunggu_super_admin">Menunggu Super Admin</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            {budgetsLoading ? (
              <div className="py-16">
                <LoadingState message="Memuat pengajuan anggaran..." />
              </div>
            ) : budgetsError ? (
              <div className="py-8">
                <ErrorState
                  message={extractErrorMessage(budgetsError, 'Gagal memuat pengajuan anggaran')}
                  onRetry={() => refetchBudgets()}
                />
              </div>
            ) : budgetsList.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Tidak Ada Pengajuan Anggaran Menunggu"
                  description="Tidak ada dokumen usulan anggaran proyek yang menunggu keputusan Anda."
                  icon={<Wallet className="h-10 w-10 text-text-placeholder opacity-40" />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      <th className="px-5 py-3.5 text-left">Proyek</th>
                      <th className="px-5 py-3.5 text-left">Pengaju</th>
                      <th className="px-5 py-3.5 text-left">Jenis</th>
                      <th className="px-5 py-3.5 text-right">Total Anggaran</th>
                      <th className="px-5 py-3.5 text-left">Diajukan</th>
                      <th className="px-5 py-3.5 text-left">Status</th>
                      <th className="px-5 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {budgetsList
                      .filter((b) => {
                        if (!budgetSearch) return true;
                        const s = budgetSearch.toLowerCase();
                        return (
                          b.project?.name?.toLowerCase().includes(s) ||
                          b.requestedBy?.name?.toLowerCase().includes(s)
                        );
                      })
                      .map((req) => {
                        const canApproveBudget =
                          (isFinance && req.status === 'menunggu_finance') ||
                          (isSuperAdmin && req.status === 'menunggu_super_admin');

                        return (
                          <tr key={req.id} className="hover:bg-background/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-text-primary">{req.project?.name ?? '-'}</p>
                              <p className="text-xs text-text-placeholder">{req.project?.department?.name ?? '-'}</p>
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary">{req.requestedBy?.name ?? '-'}</td>
                            <td className="px-5 py-3.5">
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {req.type === 'awal' ? 'Pengajuan Awal' : 'Perubahan'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-heading font-bold text-text-primary">
                              {formatCurrency(req.totalAmount)}
                            </td>
                            <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{formatDate(req.submittedAt)}</td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                req.status === 'disetujui' ? 'bg-green-50 text-green-700' :
                                req.status === 'ditolak' ? 'bg-[#FCE4E7] text-[#B0000F]' :
                                'bg-purple-50 text-purple-700'
                              )}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedBudget(req)}
                                  className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:bg-slate-50 transition-colors shadow-2xs"
                                  title="Lihat Detail & Rantai 4 Langkah"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Detail
                                </button>

                                {canApproveBudget ? (
                                  <>
                                    <button
                                      onClick={() => approveBudgetMutation.mutate(req.id)}
                                      disabled={approveBudgetMutation.isPending}
                                      className="h-8 inline-flex items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity disabled:opacity-50"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      {isSuperAdmin ? 'Setujui' : 'Layak'}
                                    </button>
                                    <button
                                      onClick={() => setRejectBudgetTarget(req)}
                                      className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary-dark hover:bg-danger-tint transition-colors shadow-2xs"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Tolak
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onApprove={() => {
            queryClient.invalidateQueries({ queryKey: ['inbox-expenses'] });
            setSelectedExpense(null);
          }}
          onReject={() => {
            setRejectExpenseTarget(selectedExpense);
            setSelectedExpense(null);
          }}
        />
      )}

      {rejectExpenseTarget && (
        <RejectExpenseModal
          expense={rejectExpenseTarget}
          onClose={() => setRejectExpenseTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inbox-expenses'] });
            setRejectExpenseTarget(null);
          }}
        />
      )}

      {selectedTimesheetId && (
        <TimesheetDetailModal
          isOpen={!!selectedTimesheetId}
          timesheetId={selectedTimesheetId}
          onClose={() => setSelectedTimesheetId(null)}
          onApprove={(id) => approveTimesheetMutation.mutate(id)}
          onReject={(id, name) => setRejectTimesheetTarget({ id, workerName: name })}
          canApprove={isAdmin || isSuperAdmin}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {rejectTimesheetTarget && (
        <RejectTimesheetModal
          isOpen={!!rejectTimesheetTarget}
          timesheetId={rejectTimesheetTarget.id}
          workerName={rejectTimesheetTarget.workerName}
          onClose={() => setRejectTimesheetTarget(null)}
          onConfirm={async (id, reason) => {
            await rejectTimesheetMutation.mutateAsync({ id, reason });
            setRejectTimesheetTarget(null);
          }}
          isLoading={rejectTimesheetMutation.isPending}
        />
      )}

      {selectedBudget && (
        <BudgetRequestDetailModal
          request={selectedBudget}
          onClose={() => setSelectedBudget(null)}
          onApprove={() => {
            queryClient.invalidateQueries({ queryKey: ['inbox-budgets'] });
            setSelectedBudget(null);
          }}
          onReject={() => {
            setRejectBudgetTarget(selectedBudget);
            setSelectedBudget(null);
          }}
        />
      )}

      {rejectBudgetTarget && (
        <RejectBudgetModal
          request={rejectBudgetTarget}
          onClose={() => setRejectBudgetTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inbox-budgets'] });
            setRejectBudgetTarget(null);
          }}
        />
      )}
    </div>
  );
}
