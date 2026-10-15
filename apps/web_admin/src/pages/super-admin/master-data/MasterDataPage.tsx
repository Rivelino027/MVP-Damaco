import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import {
  Edit2,
  FolderKanban,
  Plus,
  Power,
  RotateCcw,
  Search,
  Tag,
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
  createExpenseCategoryApi,
  createProjectTypeApi,
  deleteExpenseCategoryApi,
  deleteProjectTypeApi,
  getExpenseCategoriesApi,
  getProjectTypesApi,
  updateExpenseCategoryApi,
  updateProjectTypeApi,
} from '@/lib/api-super-admin';
import { extractErrorMessage } from '@/lib/utils';
import type {
  CreateExpenseCategoryPayload,
  CreateProjectTypePayload,
  ExpenseCategoryItem,
  ProjectTypeItem,
  UpdateExpenseCategoryPayload,
  UpdateProjectTypePayload,
} from '@/types';
import { ExpenseCategoryFormModal } from './ExpenseCategoryFormModal';
import { ProjectTypeFormModal } from './ProjectTypeFormModal';

const catColumnHelper = legacyCreateColumnHelper<ExpenseCategoryItem>();
const ptColumnHelper = legacyCreateColumnHelper<ProjectTypeItem>();

type ActiveTab = 'categories' | 'project-types';

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');

  // ─────────────────── Kategori Biaya State ───────────────────
  const [catSearch, setCatSearch] = useState('');
  const [catStatus, setCatStatus] = useState<string>('all');
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<ExpenseCategoryItem | null>(null);
  const [catToDelete, setCatToDelete] = useState<ExpenseCategoryItem | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);
  const [catToToggle, setCatToToggle] = useState<ExpenseCategoryItem | null>(null);
  const [isTogglingCat, setIsTogglingCat] = useState(false);

  // ─────────────────── Jenis Proyek State ───────────────────
  const [ptSearch, setPtSearch] = useState('');
  const [ptStatus, setPtStatus] = useState<string>('all');
  const [isPtModalOpen, setIsPtModalOpen] = useState(false);
  const [ptToEdit, setPtToEdit] = useState<ProjectTypeItem | null>(null);
  const [ptToDelete, setPtToDelete] = useState<ProjectTypeItem | null>(null);
  const [isDeletingPt, setIsDeletingPt] = useState(false);
  const [ptToToggle, setPtToToggle] = useState<ProjectTypeItem | null>(null);
  const [isTogglingPt, setIsTogglingPt] = useState(false);

  // ─────────────────── Queries ───────────────────
  const {
    data: categories = [],
    isLoading: isLoadingCats,
    isError: isCatError,
    error: catError,
    refetch: refetchCats,
  } = useQuery({
    queryKey: ['super-admin-expense-categories'],
    queryFn: () => getExpenseCategoriesApi(),
  });

  const {
    data: projectTypes = [],
    isLoading: isLoadingPts,
    isError: isPtError,
    error: ptError,
    refetch: refetchPts,
  } = useQuery({
    queryKey: ['super-admin-project-types'],
    queryFn: () => getProjectTypesApi(),
  });

  // Client-side filtering for master data arrays
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch =
        !catSearch.trim() ||
        cat.name.toLowerCase().includes(catSearch.toLowerCase().trim()) ||
        cat.code.toLowerCase().includes(catSearch.toLowerCase().trim());
      const matchStatus =
        catStatus === 'all' ||
        (catStatus === 'true' && cat.isActive) ||
        (catStatus === 'false' && !cat.isActive);
      return matchSearch && matchStatus;
    });
  }, [categories, catSearch, catStatus]);

  const filteredProjectTypes = useMemo(() => {
    return projectTypes.filter((pt) => {
      const matchSearch =
        !ptSearch.trim() ||
        pt.name.toLowerCase().includes(ptSearch.toLowerCase().trim());
      const matchStatus =
        ptStatus === 'all' ||
        (ptStatus === 'true' && pt.isActive) ||
        (ptStatus === 'false' && !pt.isActive);
      return matchSearch && matchStatus;
    });
  }, [projectTypes, ptSearch, ptStatus]);

  // ─────────────────── Kategori Biaya Mutations ───────────────────
  const createCatMutation = useMutation({
    mutationFn: (payload: CreateExpenseCategoryPayload) =>
      createExpenseCategoryApi(payload),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-expense-categories'] });
      setIsCatModalOpen(false);
      toast.success(`Kategori biaya ${newCat.name} berhasil dibuat.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal membuat kategori biaya'));
      throw err;
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpenseCategoryPayload }) =>
      updateExpenseCategoryApi(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-expense-categories'] });
      setIsCatModalOpen(false);
      setCatToEdit(null);
      toast.success(`Kategori biaya ${updated.name} berhasil diperbarui.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memperbarui kategori biaya'));
      throw err;
    },
  });

  const handleCatFormSubmit = async (
    values: CreateExpenseCategoryPayload | UpdateExpenseCategoryPayload,
  ) => {
    if (catToEdit) {
      await updateCatMutation.mutateAsync({
        id: catToEdit.id,
        payload: values as UpdateExpenseCategoryPayload,
      });
    } else {
      await createCatMutation.mutateAsync(values as CreateExpenseCategoryPayload);
    }
  };

  const handleConfirmToggleCat = async () => {
    if (!catToToggle) return;
    setIsTogglingCat(true);
    try {
      const nextStatus = !catToToggle.isActive;
      await updateExpenseCategoryApi(catToToggle.id, { isActive: nextStatus });
      toast.success(
        `Kategori ${catToToggle.name} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-expense-categories'] });
      setCatToToggle(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mengubah status kategori'));
    } finally {
      setIsTogglingCat(false);
    }
  };

  const handleConfirmDeleteCat = async () => {
    if (!catToDelete) return;
    setIsDeletingCat(true);
    try {
      await deleteExpenseCategoryApi(catToDelete.id);
      toast.success(`Kategori ${catToDelete.name} berhasil dinonaktifkan.`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-expense-categories'] });
      setCatToDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal menonaktifkan kategori'));
    } finally {
      setIsDeletingCat(false);
    }
  };

  // ─────────────────── Jenis Proyek Mutations ───────────────────
  const createPtMutation = useMutation({
    mutationFn: (payload: CreateProjectTypePayload) =>
      createProjectTypeApi(payload),
    onSuccess: (newPt) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-project-types'] });
      setIsPtModalOpen(false);
      toast.success(`Jenis proyek ${newPt.name} berhasil dibuat.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal membuat jenis proyek'));
      throw err;
    },
  });

  const updatePtMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectTypePayload }) =>
      updateProjectTypeApi(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-project-types'] });
      setIsPtModalOpen(false);
      setPtToEdit(null);
      toast.success(`Jenis proyek ${updated.name} berhasil diperbarui.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memperbarui jenis proyek'));
      throw err;
    },
  });

  const handlePtFormSubmit = async (
    values: CreateProjectTypePayload | UpdateProjectTypePayload,
  ) => {
    if (ptToEdit) {
      await updatePtMutation.mutateAsync({
        id: ptToEdit.id,
        payload: values as UpdateProjectTypePayload,
      });
    } else {
      await createPtMutation.mutateAsync(values as CreateProjectTypePayload);
    }
  };

  const handleConfirmTogglePt = async () => {
    if (!ptToToggle) return;
    setIsTogglingPt(true);
    try {
      const nextStatus = !ptToToggle.isActive;
      await updateProjectTypeApi(ptToToggle.id, { isActive: nextStatus });
      toast.success(
        `Jenis proyek ${ptToToggle.name} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-project-types'] });
      setPtToToggle(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mengubah status jenis proyek'));
    } finally {
      setIsTogglingPt(false);
    }
  };

  const handleConfirmDeletePt = async () => {
    if (!ptToDelete) return;
    setIsDeletingPt(true);
    try {
      await deleteProjectTypeApi(ptToDelete.id);
      toast.success(`Jenis proyek ${ptToDelete.name} berhasil dinonaktifkan.`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-project-types'] });
      setPtToDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal menonaktifkan jenis proyek'));
    } finally {
      setIsDeletingPt(false);
    }
  };

  // ─────────────────── Kategori Columns ───────────────────
  const catColumns: LegacyColumnDef<ExpenseCategoryItem, any>[] = useMemo(
    () => [
      catColumnHelper.accessor('code', {
        header: 'Kode',
        cell: (info) => (
          <span className="font-mono font-bold text-sm text-primary tracking-wide bg-primary/10 px-2 py-0.5 rounded-[var(--radius-input)]">
            {info.getValue()}
          </span>
        ),
      }),
      catColumnHelper.accessor('name', {
        header: 'Nama Kategori',
        cell: (info) => (
          <span className="font-semibold text-text-primary text-sm">
            {info.getValue()}
          </span>
        ),
      }),
      catColumnHelper.accessor('color', {
        header: 'Label Warna',
        cell: (info) => {
          const colorHex = info.getValue() || '#E8141C';
          return (
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: colorHex }}
              />
              <span className="font-mono text-xs text-text-secondary uppercase">
                {colorHex}
              </span>
            </div>
          );
        },
      }),
      catColumnHelper.accessor('isActive', {
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
      catColumnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const cat = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCatToEdit(cat);
                  setIsCatModalOpen(true);
                }}
                title="Ubah kategori"
                aria-label={`Ubah kategori ${cat.name}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCatToToggle(cat)}
                title={cat.isActive ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                aria-label={cat.isActive ? `Nonaktifkan ${cat.name}` : `Aktifkan ${cat.name}`}
                data-testid={`toggle-cat-${cat.id}`}
                className={`rounded-[var(--radius-input)] p-1.5 transition-colors cursor-pointer ${
                  cat.isActive
                    ? 'text-text-secondary hover:bg-danger-tint hover:text-danger'
                    : 'text-text-secondary hover:bg-success/10 hover:text-success'
                }`}
              >
                <Power className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCatToDelete(cat)}
                title="Nonaktifkan kategori"
                aria-label={`Nonaktifkan kategori ${cat.name}`}
                data-testid={`delete-cat-${cat.id}`}
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

  const catTable = useLegacyTable({
    data: filteredCategories,
    columns: catColumns,
  });

  // ─────────────────── Jenis Proyek Columns ───────────────────
  const ptColumns: LegacyColumnDef<ProjectTypeItem, any>[] = useMemo(
    () => [
      ptColumnHelper.accessor('name', {
        header: 'Nama Jenis Proyek',
        cell: (info) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-tint text-navy">
              <FolderKanban className="h-4 w-4" />
            </div>
            <span className="font-semibold text-text-primary text-sm">
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      ptColumnHelper.accessor('isActive', {
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
      ptColumnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const pt = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPtToEdit(pt);
                  setIsPtModalOpen(true);
                }}
                title="Ubah jenis proyek"
                aria-label={`Ubah jenis proyek ${pt.name}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPtToToggle(pt)}
                title={pt.isActive ? 'Nonaktifkan jenis proyek' : 'Aktifkan jenis proyek'}
                aria-label={pt.isActive ? `Nonaktifkan ${pt.name}` : `Aktifkan ${pt.name}`}
                data-testid={`toggle-pt-${pt.id}`}
                className={`rounded-[var(--radius-input)] p-1.5 transition-colors cursor-pointer ${
                  pt.isActive
                    ? 'text-text-secondary hover:bg-danger-tint hover:text-danger'
                    : 'text-text-secondary hover:bg-success/10 hover:text-success'
                }`}
              >
                <Power className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setPtToDelete(pt)}
                title="Nonaktifkan jenis proyek"
                aria-label={`Nonaktifkan jenis proyek ${pt.name}`}
                data-testid={`delete-pt-${pt.id}`}
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

  const ptTable = useLegacyTable({
    data: filteredProjectTypes,
    columns: ptColumns,
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Master Data
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Kelola data acuan sistem: kategori pengeluaran dan jenis proyek operasional.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            if (activeTab === 'categories') {
              setCatToEdit(null);
              setIsCatModalOpen(true);
            } else {
              setPtToEdit(null);
              setIsPtModalOpen(true);
            }
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          {activeTab === 'categories' ? 'Tambah Kategori Biaya' : 'Tambah Jenis Proyek'}
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-primary text-primary bg-primary-tint/20'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Tag className="h-4 w-4" />
          Kategori Biaya ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('project-types')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'project-types'
              ? 'border-primary text-primary bg-primary-tint/20'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Jenis Proyek ({projectTypes.length})
        </button>
      </div>

      {/* ─────────────────── TAB 1: KATEGORI BIAYA ─────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-text-placeholder" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Cari kode atau nama kategori biaya..."
                  className="w-full h-10 pl-9 pr-4 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <select
                  value={catStatus}
                  onChange={(e) => setCatStatus(e.target.value)}
                  aria-label="Filter status kategori"
                  className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>

                {(catSearch || catStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatSearch('');
                      setCatStatus('all');
                    }}
                    title="Reset filter"
                    aria-label="Reset filter kategori"
                    className="h-10 px-2.5 shrink-0 rounded-[var(--radius-input)] border border-border text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Kategori Biaya */}
          <div className="rounded-[var(--radius-card-lg)] bg-surface shadow-sm border border-border overflow-hidden">
            {isLoadingCats ? (
              <LoadingState message="Memuat kategori biaya..." />
            ) : isCatError ? (
              <ErrorState
                message={extractErrorMessage(catError, 'Gagal memuat kategori biaya')}
                onRetry={refetchCats}
              />
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                icon={<Tag className="h-10 w-10 text-text-placeholder" />}
                title="Tidak ada kategori biaya"
                description="Belum ada data kategori biaya yang terdaftar atau cocok dengan pencarian."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setCatToEdit(null);
                      setIsCatModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kategori Biaya Baru
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-background/80 border-b border-border text-xs uppercase font-semibold text-text-secondary tracking-wider">
                    {catTable.getHeaderGroups().map((headerGroup) => (
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
                    {catTable.getRowModel().rows.map((row) => (
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
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: JENIS PROYEK ─────────────────── */}
      {activeTab === 'project-types' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-text-placeholder" />
                <input
                  type="text"
                  value={ptSearch}
                  onChange={(e) => setPtSearch(e.target.value)}
                  placeholder="Cari nama jenis proyek..."
                  className="w-full h-10 pl-9 pr-4 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <select
                  value={ptStatus}
                  onChange={(e) => setPtStatus(e.target.value)}
                  aria-label="Filter status jenis proyek"
                  className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>

                {(ptSearch || ptStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setPtSearch('');
                      setPtStatus('all');
                    }}
                    title="Reset filter"
                    aria-label="Reset filter jenis proyek"
                    className="h-10 px-2.5 shrink-0 rounded-[var(--radius-input)] border border-border text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Jenis Proyek */}
          <div className="rounded-[var(--radius-card-lg)] bg-surface shadow-sm border border-border overflow-hidden">
            {isLoadingPts ? (
              <LoadingState message="Memuat jenis proyek..." />
            ) : isPtError ? (
              <ErrorState
                message={extractErrorMessage(ptError, 'Gagal memuat jenis proyek')}
                onRetry={refetchPts}
              />
            ) : filteredProjectTypes.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-10 w-10 text-text-placeholder" />}
                title="Tidak ada jenis proyek"
                description="Belum ada data jenis proyek yang terdaftar atau cocok dengan pencarian."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPtToEdit(null);
                      setIsPtModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Jenis Proyek Baru
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-background/80 border-b border-border text-xs uppercase font-semibold text-text-secondary tracking-wider">
                    {ptTable.getHeaderGroups().map((headerGroup) => (
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
                    {ptTable.getRowModel().rows.map((row) => (
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
            )}
          </div>
        </div>
      )}

      {/* Modal Kategori Biaya */}
      <ExpenseCategoryFormModal
        open={isCatModalOpen}
        categoryToEdit={catToEdit}
        onSubmit={handleCatFormSubmit}
        onClose={() => {
          setIsCatModalOpen(false);
          setCatToEdit(null);
        }}
      />

      {/* Modal Jenis Proyek */}
      <ProjectTypeFormModal
        open={isPtModalOpen}
        projectTypeToEdit={ptToEdit}
        onSubmit={handlePtFormSubmit}
        onClose={() => {
          setIsPtModalOpen(false);
          setPtToEdit(null);
        }}
      />

      {/* Konfirmasi Hapus/Nonaktifkan Kategori */}
      <ConfirmDialog
        open={Boolean(catToDelete)}
        title="Nonaktifkan Kategori Biaya"
        description={`Apakah Anda yakin ingin menonaktifkan kategori biaya ${catToDelete?.name}? Kategori tidak akan muncul lagi pada formulir pengajuan baru.`}
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeletingCat}
        onConfirm={handleConfirmDeleteCat}
        onCancel={() => setCatToDelete(null)}
      />

      {/* Konfirmasi Toggle Status Kategori */}
      <ConfirmDialog
        open={Boolean(catToToggle)}
        title={catToToggle?.isActive ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
        description={`Apakah Anda yakin ingin ${
          catToToggle?.isActive ? 'menonaktifkan' : 'mengaktifkan kembali'
        } kategori ${catToToggle?.name}?`}
        confirmLabel={catToToggle?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={catToToggle?.isActive ? 'danger' : 'default'}
        loading={isTogglingCat}
        onConfirm={handleConfirmToggleCat}
        onCancel={() => setCatToToggle(null)}
      />

      {/* Konfirmasi Hapus/Nonaktifkan Jenis Proyek */}
      <ConfirmDialog
        open={Boolean(ptToDelete)}
        title="Nonaktifkan Jenis Proyek"
        description={`Apakah Anda yakin ingin menonaktifkan jenis proyek ${ptToDelete?.name}? Jenis proyek ini tidak akan dapat dipilih saat pembuatan proyek baru.`}
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeletingPt}
        onConfirm={handleConfirmDeletePt}
        onCancel={() => setPtToDelete(null)}
      />

      {/* Konfirmasi Toggle Status Jenis Proyek */}
      <ConfirmDialog
        open={Boolean(ptToToggle)}
        title={ptToToggle?.isActive ? 'Nonaktifkan Jenis Proyek' : 'Aktifkan Jenis Proyek'}
        description={`Apakah Anda yakin ingin ${
          ptToToggle?.isActive ? 'menonaktifkan' : 'mengaktifkan kembali'
        } jenis proyek ${ptToToggle?.name}?`}
        confirmLabel={ptToToggle?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={ptToToggle?.isActive ? 'danger' : 'default'}
        loading={isTogglingPt}
        onConfirm={handleConfirmTogglePt}
        onCancel={() => setPtToToggle(null)}
      />
    </div>
  );
}
