import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Layers,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  toast,
} from '@/components/shared';
import {
  createCostCenterApi,
  createDepartmentApi,
  deleteCostCenterApi,
  deleteDepartmentApi,
  getCostCentersApi,
  getDepartmentsApi,
  getUsersApi,
  updateCostCenterApi,
  updateDepartmentApi,
} from '@/lib/api-super-admin';
import { extractErrorMessage, formatCurrency } from '@/lib/utils';
import type {
  CostCenterItem,
  CostCenterQueryParams,
  CreateCostCenterPayload,
  CreateDepartmentPayload,
  DepartmentItem,
  DepartmentQueryParams,
  UpdateCostCenterPayload,
  UpdateDepartmentPayload,
} from '@/types';
import { DepartmentFormModal } from './DepartmentFormModal';
import { CostCenterFormModal } from './CostCenterFormModal';

const deptColumnHelper = legacyCreateColumnHelper<DepartmentItem>();
const ccColumnHelper = legacyCreateColumnHelper<CostCenterItem>();

type ActiveTab = 'departments' | 'cost-centers';

export default function DepartmentCostCenterPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('departments');

  // ─────────────────── Departemen State ───────────────────
  const [deptPage, setDeptPage] = useState(1);
  const [deptLimit, setDeptLimit] = useState(10);
  const [deptSearchInput, setDeptSearchInput] = useState('');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [deptStatus, setDeptStatus] = useState<string>('all');

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<DepartmentItem | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentItem | null>(null);
  const [isDeletingDept, setIsDeletingDept] = useState(false);
  const [deptToToggleStatus, setDeptToToggleStatus] = useState<DepartmentItem | null>(null);
  const [isTogglingDeptStatus, setIsTogglingDeptStatus] = useState(false);

  // ─────────────────── Cost Center State ───────────────────
  const [ccPage, setCcPage] = useState(1);
  const [ccLimit, setCcLimit] = useState(10);
  const [ccSearchInput, setCcSearchInput] = useState('');
  const [ccSearchQuery, setCcSearchQuery] = useState('');
  const [ccDeptFilter, setCcDeptFilter] = useState<string>('all');
  const [ccStatus, setCcStatus] = useState<string>('all');

  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [ccToEdit, setCcToEdit] = useState<CostCenterItem | null>(null);
  const [ccToDelete, setCcToDelete] = useState<CostCenterItem | null>(null);
  const [isDeletingCc, setIsDeletingCc] = useState(false);
  const [ccToToggleStatus, setCcToToggleStatus] = useState<CostCenterItem | null>(null);
  const [isTogglingCcStatus, setIsTogglingCcStatus] = useState(false);

  // ─────────────────── Queries ───────────────────
  const deptQueryParams: DepartmentQueryParams = useMemo(() => {
    const params: DepartmentQueryParams = {
      page: deptPage,
      limit: deptLimit,
    };
    if (deptSearchQuery.trim()) params.search = deptSearchQuery.trim();
    if (deptStatus !== 'all') params.isActive = deptStatus === 'true';
    return params;
  }, [deptPage, deptLimit, deptSearchQuery, deptStatus]);

  const {
    data: deptResponse,
    isLoading: isLoadingDepts,
    isError: isDeptError,
    error: deptError,
    refetch: refetchDepts,
  } = useQuery({
    queryKey: ['super-admin-departments', deptQueryParams],
    queryFn: () => getDepartmentsApi(deptQueryParams),
  });

  const ccQueryParams: CostCenterQueryParams = useMemo(() => {
    const params: CostCenterQueryParams = {
      page: ccPage,
      limit: ccLimit,
    };
    if (ccSearchQuery.trim()) params.search = ccSearchQuery.trim();
    if (ccDeptFilter !== 'all') params.departmentId = ccDeptFilter;
    if (ccStatus !== 'all') params.isActive = ccStatus === 'true';
    return params;
  }, [ccPage, ccLimit, ccSearchQuery, ccDeptFilter, ccStatus]);

  const {
    data: ccResponse,
    isLoading: isLoadingCc,
    isError: isCcError,
    error: ccError,
    refetch: refetchCc,
  } = useQuery({
    queryKey: ['super-admin-cost-centers', ccQueryParams],
    queryFn: () => getCostCentersApi(ccQueryParams),
  });

  // Query all active departments for dropdowns
  const { data: allDeptsResponse } = useQuery({
    queryKey: ['super-admin-departments-dropdown'],
    queryFn: () => getDepartmentsApi({ limit: 100, isActive: true }),
  });

  // Query users for picking Department Head
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['super-admin-users-dropdown'],
    queryFn: () => getUsersApi({ limit: 100, isActive: true }),
  });

  const deptList = deptResponse?.data || [];
  const deptMeta = deptResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const ccList = ccResponse?.data || [];
  const ccMeta = ccResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const dropdownDepts = allDeptsResponse?.data || [];
  const usersList = usersResponse?.data || [];

  // ─────────────────── Departemen Mutations ───────────────────
  const createDeptMutation = useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => createDepartmentApi(payload),
    onSuccess: (newDept) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments-dropdown'] });
      setIsDeptModalOpen(false);
      toast.success(`Departemen ${newDept.name} berhasil dibuat.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal membuat departemen'));
      throw err;
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDepartmentPayload }) =>
      updateDepartmentApi(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments-dropdown'] });
      setIsDeptModalOpen(false);
      setDeptToEdit(null);
      toast.success(`Departemen ${updated.name} berhasil diperbarui.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memperbarui departemen'));
      throw err;
    },
  });

  const handleDeptFormSubmit = async (values: CreateDepartmentPayload | UpdateDepartmentPayload) => {
    if (deptToEdit) {
      await updateDeptMutation.mutateAsync({
        id: deptToEdit.id,
        payload: values as UpdateDepartmentPayload,
      });
    } else {
      await createDeptMutation.mutateAsync(values as CreateDepartmentPayload);
    }
  };

  const handleConfirmToggleDeptStatus = async () => {
    if (!deptToToggleStatus) return;
    setIsTogglingDeptStatus(true);
    try {
      const nextStatus = !deptToToggleStatus.isActive;
      await updateDepartmentApi(deptToToggleStatus.id, { isActive: nextStatus });
      toast.success(
        `Departemen ${deptToToggleStatus.name} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments'] });
      setDeptToToggleStatus(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mengubah status departemen'));
    } finally {
      setIsTogglingDeptStatus(false);
    }
  };

  const handleConfirmDeleteDept = async () => {
    if (!deptToDelete) return;
    setIsDeletingDept(true);
    try {
      await deleteDepartmentApi(deptToDelete.id);
      toast.success(`Departemen ${deptToDelete.name} berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-departments-dropdown'] });
      setDeptToDelete(null);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal menghapus departemen');
      // Tampilkan pesan backend dengan rapi jika ditolak karena sedang dipakai
      toast.error(msg);
    } finally {
      setIsDeletingDept(false);
    }
  };

  // ─────────────────── Cost Center Mutations ───────────────────
  const createCcMutation = useMutation({
    mutationFn: (payload: CreateCostCenterPayload) => createCostCenterApi(payload),
    onSuccess: (newCc) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-cost-centers'] });
      setIsCcModalOpen(false);
      toast.success(`Cost center ${newCc.code} (${newCc.name}) berhasil dibuat.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal membuat cost center'));
      throw err;
    },
  });

  const updateCcMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCostCenterPayload }) =>
      updateCostCenterApi(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-cost-centers'] });
      setIsCcModalOpen(false);
      setCcToEdit(null);
      toast.success(`Cost center ${updated.code} berhasil diperbarui.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memperbarui cost center'));
      throw err;
    },
  });

  const handleCcFormSubmit = async (values: CreateCostCenterPayload | UpdateCostCenterPayload) => {
    if (ccToEdit) {
      await updateCcMutation.mutateAsync({
        id: ccToEdit.id,
        payload: values as UpdateCostCenterPayload,
      });
    } else {
      await createCcMutation.mutateAsync(values as CreateCostCenterPayload);
    }
  };

  const handleConfirmToggleCcStatus = async () => {
    if (!ccToToggleStatus) return;
    setIsTogglingCcStatus(true);
    try {
      const nextStatus = !ccToToggleStatus.isActive;
      await updateCostCenterApi(ccToToggleStatus.id, { isActive: nextStatus });
      toast.success(
        `Cost center ${ccToToggleStatus.code} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-cost-centers'] });
      setCcToToggleStatus(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mengubah status cost center'));
    } finally {
      setIsTogglingCcStatus(false);
    }
  };

  const handleConfirmDeleteCc = async () => {
    if (!ccToDelete) return;
    setIsDeletingCc(true);
    try {
      await deleteCostCenterApi(ccToDelete.id);
      toast.success(`Cost center ${ccToDelete.code} berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-cost-centers'] });
      setCcToDelete(null);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal menghapus cost center');
      toast.error(msg);
    } finally {
      setIsDeletingCc(false);
    }
  };

  // ─────────────────── Departemen Columns ───────────────────
  const deptColumns: LegacyColumnDef<DepartmentItem, any>[] = useMemo(
    () => [
      deptColumnHelper.accessor('name', {
        header: 'Nama Departemen',
        cell: (info) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold text-text-primary text-sm">
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      deptColumnHelper.accessor('headUser', {
        header: 'Kepala Departemen',
        cell: (info) => {
          const head = info.getValue();
          if (!head) {
            return <span className="text-text-placeholder italic">-</span>;
          }
          return (
            <div>
              <span className="font-medium text-text-primary text-sm block">
                {head.name}
              </span>
              <span className="text-xs text-text-secondary">{head.email}</span>
            </div>
          );
        },
      }),
      deptColumnHelper.accessor('annualBudget', {
        header: 'Anggaran Tahunan',
        cell: (info) => (
          <span className="font-mono text-sm font-semibold text-text-primary">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      deptColumnHelper.accessor('_count', {
        header: 'Data Terkait',
        cell: (info) => {
          const counts = info.getValue();
          return (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span title="Jumlah Pengguna">
                {counts?.users ?? 0} Pengguna
              </span>
              <span>•</span>
              <span title="Jumlah Proyek">
                {counts?.projects ?? 0} Proyek
              </span>
              <span>•</span>
              <span title="Jumlah Cost Center">
                {counts?.costCenters ?? 0} CC
              </span>
            </div>
          );
        },
      }),
      deptColumnHelper.accessor('isActive', {
        header: 'Status',
        cell: (info) => {
          const isActive = info.getValue();
          if (isActive) {
            return <StatusBadge status="disetujui" label="Aktif" />;
          }
          return (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-semibold bg-danger-tint text-danger border-danger/20">
              <XCircle className="h-3.5 w-3.5" />
              Nonaktif
            </span>
          );
        },
      }),
      deptColumnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const dept = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDeptToEdit(dept);
                  setIsDeptModalOpen(true);
                }}
                title="Ubah data departemen"
                aria-label={`Ubah departemen ${dept.name}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setDeptToToggleStatus(dept)}
                title={dept.isActive ? 'Nonaktifkan departemen' : 'Aktifkan departemen'}
                aria-label={dept.isActive ? `Nonaktifkan ${dept.name}` : `Aktifkan ${dept.name}`}
                data-testid={`toggle-dept-${dept.id}`}
                className={`rounded-[var(--radius-input)] p-1.5 transition-colors cursor-pointer ${
                  dept.isActive
                    ? 'text-text-secondary hover:bg-danger-tint hover:text-danger'
                    : 'text-text-secondary hover:bg-success/10 hover:text-success'
                }`}
              >
                <Power className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setDeptToDelete(dept)}
                title="Hapus departemen"
                aria-label={`Hapus departemen ${dept.name}`}
                data-testid={`delete-dept-${dept.id}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-danger-tint hover:text-danger transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const deptTable = useLegacyTable({
    data: deptList,
    columns: deptColumns,
  });

  // ─────────────────── Cost Center Columns ───────────────────
  const ccColumns: LegacyColumnDef<CostCenterItem, any>[] = useMemo(
    () => [
      ccColumnHelper.accessor('code', {
        header: 'Kode Cost Center',
        cell: (info) => (
          <span className="font-mono font-bold text-sm text-primary tracking-wide bg-primary/10 px-2 py-0.5 rounded-[var(--radius-input)]">
            {info.getValue()}
          </span>
        ),
      }),
      ccColumnHelper.accessor('name', {
        header: 'Nama Cost Center',
        cell: (info) => (
          <span className="font-semibold text-text-primary text-sm">
            {info.getValue()}
          </span>
        ),
      }),
      ccColumnHelper.accessor('department.name', {
        header: 'Departemen',
        cell: (info) => (
          <span className="text-sm text-text-primary">
            {info.getValue() || <span className="text-text-placeholder italic">-</span>}
          </span>
        ),
      }),
      ccColumnHelper.accessor('_count', {
        header: 'Data Terkait',
        cell: (info) => {
          const counts = info.getValue();
          return (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>{counts?.projects ?? 0} Proyek</span>
              <span>•</span>
              <span>{counts?.expenses ?? 0} Pengeluaran</span>
            </div>
          );
        },
      }),
      ccColumnHelper.accessor('isActive', {
        header: 'Status',
        cell: (info) => {
          const isActive = info.getValue();
          if (isActive) {
            return <StatusBadge status="disetujui" label="Aktif" />;
          }
          return (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-semibold bg-danger-tint text-danger border-danger/20">
              <XCircle className="h-3.5 w-3.5" />
              Nonaktif
            </span>
          );
        },
      }),
      ccColumnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const cc = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCcToEdit(cc);
                  setIsCcModalOpen(true);
                }}
                title="Ubah data cost center"
                aria-label={`Ubah cost center ${cc.code}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCcToToggleStatus(cc)}
                title={cc.isActive ? 'Nonaktifkan cost center' : 'Aktifkan cost center'}
                aria-label={cc.isActive ? `Nonaktifkan ${cc.code}` : `Aktifkan ${cc.code}`}
                data-testid={`toggle-cc-${cc.id}`}
                className={`rounded-[var(--radius-input)] p-1.5 transition-colors cursor-pointer ${
                  cc.isActive
                    ? 'text-text-secondary hover:bg-danger-tint hover:text-danger'
                    : 'text-text-secondary hover:bg-success/10 hover:text-success'
                }`}
              >
                <Power className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCcToDelete(cc)}
                title="Hapus cost center"
                aria-label={`Hapus cost center ${cc.code}`}
                data-testid={`delete-cc-${cc.id}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-danger-tint hover:text-danger transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const ccTable = useLegacyTable({
    data: ccList,
    columns: ccColumns,
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Departemen & Cost Center
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Kelola struktur departemen organisasi dan kode cost center untuk penelusuran anggaran.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            if (activeTab === 'departments') {
              setDeptToEdit(null);
              setIsDeptModalOpen(true);
            } else {
              setCcToEdit(null);
              setIsCcModalOpen(true);
            }
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          {activeTab === 'departments' ? 'Tambah Departemen' : 'Tambah Cost Center'}
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'departments'
              ? 'border-primary text-primary bg-primary-tint/20'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Departemen ({deptMeta.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cost-centers')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'cost-centers'
              ? 'border-primary text-primary bg-primary-tint/20'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Layers className="h-4 w-4" />
          Cost Center ({ccMeta.total})
        </button>
      </div>

      {/* ─────────────────── TAB 1: DEPARTEMEN ─────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setDeptPage(1);
                  setDeptSearchQuery(deptSearchInput);
                }}
                className="md:col-span-8 relative flex items-center"
              >
                <Search className="absolute left-3 h-4 w-4 text-text-placeholder" />
                <input
                  type="text"
                  value={deptSearchInput}
                  onChange={(e) => setDeptSearchInput(e.target.value)}
                  placeholder="Cari nama departemen..."
                  className="w-full h-10 pl-9 pr-16 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 h-7 px-2.5 rounded-[var(--radius-input)] bg-background text-xs font-semibold text-text-primary hover:bg-border transition-colors cursor-pointer"
                >
                  Cari
                </button>
              </form>

              <div className="md:col-span-4 flex items-center gap-2">
                <select
                  value={deptStatus}
                  onChange={(e) => {
                    setDeptStatus(e.target.value);
                    setDeptPage(1);
                  }}
                  aria-label="Filter status departemen"
                  className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>

                {(deptSearchQuery || deptStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeptSearchInput('');
                      setDeptSearchQuery('');
                      setDeptStatus('all');
                      setDeptPage(1);
                    }}
                    title="Reset filter"
                    aria-label="Reset filter departemen"
                    className="h-10 px-2.5 shrink-0 rounded-[var(--radius-input)] border border-border text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Departemen */}
          <div className="rounded-[var(--radius-card-lg)] bg-surface shadow-sm border border-border overflow-hidden">
            {isLoadingDepts ? (
              <LoadingState message="Memuat daftar departemen..." />
            ) : isDeptError ? (
              <ErrorState
                message={extractErrorMessage(deptError, 'Gagal memuat departemen')}
                onRetry={refetchDepts}
              />
            ) : deptList.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-10 w-10 text-text-placeholder" />}
                title="Tidak ada departemen ditemukan"
                description="Belum ada data departemen yang sesuai dengan pencarian."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setDeptToEdit(null);
                      setIsDeptModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Departemen Baru
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-background/80 border-b border-border text-xs uppercase font-semibold text-text-secondary tracking-wider">
                      {deptTable.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="px-5 py-3.5">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deptTable.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-background/50 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-5 py-3.5 align-middle">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Paginasi Departemen */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t border-border bg-surface text-xs text-text-secondary">
                  <div className="flex items-center gap-3">
                    <span>
                      Menampilkan{' '}
                      <span className="font-semibold text-text-primary">
                        {(deptMeta.page - 1) * deptMeta.limit + 1}
                      </span>{' '}
                      -{' '}
                      <span className="font-semibold text-text-primary">
                        {Math.min(deptMeta.page * deptMeta.limit, deptMeta.total)}
                      </span>{' '}
                      dari{' '}
                      <span className="font-semibold text-text-primary">
                        {deptMeta.total}
                      </span>{' '}
                      departemen
                    </span>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span>Baris:</span>
                      <select
                        value={deptLimit}
                        onChange={(e) => {
                          setDeptLimit(Number(e.target.value));
                          setDeptPage(1);
                        }}
                        aria-label="Pilih baris departemen per halaman"
                        className="h-7 px-2 rounded-[var(--radius-input)] border border-border bg-white text-xs text-text-primary focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="mr-2">
                      Halaman <span className="font-semibold">{deptMeta.page}</span> dari{' '}
                      <span className="font-semibold">{deptMeta.totalPages || 1}</span>
                    </span>
                    <button
                      type="button"
                      disabled={deptPage <= 1}
                      onClick={() => setDeptPage((p) => Math.max(1, p - 1))}
                      aria-label="Halaman departemen sebelumnya"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deptPage >= deptMeta.totalPages}
                      onClick={() => setDeptPage((p) => p + 1)}
                      aria-label="Halaman departemen berikutnya"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: COST CENTER ─────────────────── */}
      {activeTab === 'cost-centers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCcPage(1);
                  setCcSearchQuery(ccSearchInput);
                }}
                className="md:col-span-5 relative flex items-center"
              >
                <Search className="absolute left-3 h-4 w-4 text-text-placeholder" />
                <input
                  type="text"
                  value={ccSearchInput}
                  onChange={(e) => setCcSearchInput(e.target.value)}
                  placeholder="Cari kode atau nama cost center..."
                  className="w-full h-10 pl-9 pr-16 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 h-7 px-2.5 rounded-[var(--radius-input)] bg-background text-xs font-semibold text-text-primary hover:bg-border transition-colors cursor-pointer"
                >
                  Cari
                </button>
              </form>

              <div className="md:col-span-4">
                <select
                  value={ccDeptFilter}
                  onChange={(e) => {
                    setCcDeptFilter(e.target.value);
                    setCcPage(1);
                  }}
                  aria-label="Filter departemen cost center"
                  className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Semua Departemen</option>
                  {dropdownDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <select
                  value={ccStatus}
                  onChange={(e) => {
                    setCcStatus(e.target.value);
                    setCcPage(1);
                  }}
                  aria-label="Filter status cost center"
                  className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>

                {(ccSearchQuery || ccDeptFilter !== 'all' || ccStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCcSearchInput('');
                      setCcSearchQuery('');
                      setCcDeptFilter('all');
                      setCcStatus('all');
                      setCcPage(1);
                    }}
                    title="Reset filter"
                    aria-label="Reset filter cost center"
                    className="h-10 px-2.5 shrink-0 rounded-[var(--radius-input)] border border-border text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Cost Center */}
          <div className="rounded-[var(--radius-card-lg)] bg-surface shadow-sm border border-border overflow-hidden">
            {isLoadingCc ? (
              <LoadingState message="Memuat daftar cost center..." />
            ) : isCcError ? (
              <ErrorState
                message={extractErrorMessage(ccError, 'Gagal memuat cost center')}
                onRetry={refetchCc}
              />
            ) : ccList.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-10 w-10 text-text-placeholder" />}
                title="Tidak ada cost center ditemukan"
                description="Belum ada data cost center yang sesuai dengan filter."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setCcToEdit(null);
                      setIsCcModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Cost Center Baru
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-background/80 border-b border-border text-xs uppercase font-semibold text-text-secondary tracking-wider">
                      {ccTable.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="px-5 py-3.5">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ccTable.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-background/50 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-5 py-3.5 align-middle">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Paginasi Cost Center */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t border-border bg-surface text-xs text-text-secondary">
                  <div className="flex items-center gap-3">
                    <span>
                      Menampilkan{' '}
                      <span className="font-semibold text-text-primary">
                        {(ccMeta.page - 1) * ccMeta.limit + 1}
                      </span>{' '}
                      -{' '}
                      <span className="font-semibold text-text-primary">
                        {Math.min(ccMeta.page * ccMeta.limit, ccMeta.total)}
                      </span>{' '}
                      dari{' '}
                      <span className="font-semibold text-text-primary">
                        {ccMeta.total}
                      </span>{' '}
                      cost center
                    </span>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span>Baris:</span>
                      <select
                        value={ccLimit}
                        onChange={(e) => {
                          setCcLimit(Number(e.target.value));
                          setCcPage(1);
                        }}
                        aria-label="Pilih baris cost center per halaman"
                        className="h-7 px-2 rounded-[var(--radius-input)] border border-border bg-white text-xs text-text-primary focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="mr-2">
                      Halaman <span className="font-semibold">{ccMeta.page}</span> dari{' '}
                      <span className="font-semibold">{ccMeta.totalPages || 1}</span>
                    </span>
                    <button
                      type="button"
                      disabled={ccPage <= 1}
                      onClick={() => setCcPage((p) => Math.max(1, p - 1))}
                      aria-label="Halaman cost center sebelumnya"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={ccPage >= ccMeta.totalPages}
                      onClick={() => setCcPage((p) => p + 1)}
                      aria-label="Halaman cost center berikutnya"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Departemen */}
      <DepartmentFormModal
        open={isDeptModalOpen}
        departmentToEdit={deptToEdit}
        users={usersList}
        isLoadingUsers={isLoadingUsers}
        onSubmit={handleDeptFormSubmit}
        onClose={() => {
          setIsDeptModalOpen(false);
          setDeptToEdit(null);
        }}
      />

      {/* Modal Cost Center */}
      <CostCenterFormModal
        open={isCcModalOpen}
        costCenterToEdit={ccToEdit}
        departments={dropdownDepts}
        onSubmit={handleCcFormSubmit}
        onClose={() => {
          setIsCcModalOpen(false);
          setCcToEdit(null);
        }}
      />

      {/* Konfirmasi Hapus Departemen */}
      <ConfirmDialog
        open={Boolean(deptToDelete)}
        title="Hapus Departemen"
        description={`Apakah Anda yakin ingin menghapus departemen ${deptToDelete?.name}? Catatan: Departemen yang sedang digunakan oleh anggota tim atau proyek aktif tidak dapat dihapus, hanya dapat dinonaktifkan.`}
        confirmLabel="Hapus Departemen"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeletingDept}
        onConfirm={handleConfirmDeleteDept}
        onCancel={() => setDeptToDelete(null)}
      />

      {/* Konfirmasi Ubah Status Departemen */}
      <ConfirmDialog
        open={Boolean(deptToToggleStatus)}
        title={deptToToggleStatus?.isActive ? 'Nonaktifkan Departemen' : 'Aktifkan Departemen'}
        description={`Apakah Anda yakin ingin ${
          deptToToggleStatus?.isActive ? 'menonaktifkan' : 'mengaktifkan kembali'
        } departemen ${deptToToggleStatus?.name}?`}
        confirmLabel={deptToToggleStatus?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={deptToToggleStatus?.isActive ? 'danger' : 'default'}
        loading={isTogglingDeptStatus}
        onConfirm={handleConfirmToggleDeptStatus}
        onCancel={() => setDeptToToggleStatus(null)}
      />

      {/* Konfirmasi Hapus Cost Center */}
      <ConfirmDialog
        open={Boolean(ccToDelete)}
        title="Hapus Cost Center"
        description={`Apakah Anda yakin ingin menghapus cost center ${ccToDelete?.code} (${ccToDelete?.name})? Cost center yang telah memiliki riwayat proyek atau transaksi tidak dapat dihapus.`}
        confirmLabel="Hapus Cost Center"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeletingCc}
        onConfirm={handleConfirmDeleteCc}
        onCancel={() => setCcToDelete(null)}
      />

      {/* Konfirmasi Ubah Status Cost Center */}
      <ConfirmDialog
        open={Boolean(ccToToggleStatus)}
        title={ccToToggleStatus?.isActive ? 'Nonaktifkan Cost Center' : 'Aktifkan Cost Center'}
        description={`Apakah Anda yakin ingin ${
          ccToToggleStatus?.isActive ? 'menonaktifkan' : 'mengaktifkan kembali'
        } cost center ${ccToToggleStatus?.code}?`}
        confirmLabel={ccToToggleStatus?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={ccToToggleStatus?.isActive ? 'danger' : 'default'}
        loading={isTogglingCcStatus}
        onConfirm={handleConfirmToggleCcStatus}
        onCancel={() => setCcToToggleStatus(null)}
      />
    </div>
  );
}
