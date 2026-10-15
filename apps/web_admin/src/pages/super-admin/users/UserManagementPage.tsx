import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  KeyRound,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  RoleBadge,
  StatusBadge,
  toast,
} from '@/components/shared';
import { useAuthStore } from '@/stores/auth';
import {
  createUserApi,
  deleteUserApi,
  getDepartmentsApi,
  getUsersApi,
  resetUserPasswordApi,
  updateUserApi,
  updateUserStatusApi,
} from '@/lib/api-super-admin';
import { extractErrorMessage, formatDateTime } from '@/lib/utils';
import type {
  CreateUserPayload,
  Role,
  SuperAdminUser,
  UpdateUserPayload,
  UserQueryParams,
} from '@/types';
import { UserFormModal } from './UserFormModal';
import { PasswordDisplayDialog } from './PasswordDisplayDialog';

const columnHelper = legacyCreateColumnHelper<SuperAdminUser>();

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal & Dialog State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<SuperAdminUser | null>(null);

  // Delete Confirm State
  const [userToDelete, setUserToDelete] = useState<SuperAdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Toggle Confirm State
  const [userToToggleStatus, setUserToToggleStatus] = useState<SuperAdminUser | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Reset Password Confirm State
  const [userToResetPassword, setUserToResetPassword] = useState<SuperAdminUser | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Single-view Password Dialog State (dikosongkan saat ditutup)
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    userName: string;
    userEmail: string;
    password: string | null;
    type: 'initial' | 'reset';
  } | null>(null);

  // Query Params
  const queryParams: UserQueryParams = useMemo(() => {
    const params: UserQueryParams = {
      page,
      limit,
    };
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    if (selectedRole !== 'all') {
      params.role = selectedRole as Role;
    }
    if (selectedDepartment !== 'all') {
      params.departmentId = selectedDepartment;
    }
    if (selectedStatus !== 'all') {
      params.isActive = selectedStatus === 'true';
    }
    return params;
  }, [page, limit, searchQuery, selectedRole, selectedDepartment, selectedStatus]);

  // Fetch Users
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['super-admin-users', queryParams],
    queryFn: () => getUsersApi(queryParams),
  });

  // Fetch Departments for Filter & Form
  const { data: departmentsResponse, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['super-admin-departments-all'],
    queryFn: () => getDepartmentsApi({ limit: 100, isActive: true }),
  });

  const departmentsList = departmentsResponse?.data || [];
  const usersList = usersResponse?.data || [];
  const meta = usersResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedDepartment('all');
    setSelectedStatus('all');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedRole !== 'all' ||
    selectedDepartment !== 'all' ||
    selectedStatus !== 'all';

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setIsFormModalOpen(false);
      toast.success(`Pengguna ${newUser.name} berhasil dibuat.`);

      // Jika ada initialPassword otomatis dari backend, tampilkan dialog sekali
      if (newUser.initialPassword) {
        setPasswordDialog({
          open: true,
          userName: newUser.name,
          userEmail: newUser.email,
          password: newUser.initialPassword,
          type: 'initial',
        });
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal membuat pengguna'));
      throw err;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUserApi(id, payload),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setIsFormModalOpen(false);
      setUserToEdit(null);
      toast.success(`Data pengguna ${updatedUser.name} berhasil diperbarui.`);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal memperbarui pengguna'));
      throw err;
    },
  });

  const handleFormSubmit = async (values: CreateUserPayload | UpdateUserPayload) => {
    if (userToEdit) {
      await updateMutation.mutateAsync({
        id: userToEdit.id,
        payload: values as UpdateUserPayload,
      });
    } else {
      await createMutation.mutateAsync(values as CreateUserPayload);
    }
  };

  // Toggle Status Action
  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    setIsTogglingStatus(true);
    try {
      const nextStatus = !userToToggleStatus.isActive;
      await updateUserStatusApi(userToToggleStatus.id, nextStatus);
      toast.success(
        `Akun ${userToToggleStatus.name} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setUserToToggleStatus(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mengubah status pengguna'));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserApi(userToDelete.id);
      toast.success(`Pengguna ${userToDelete.name} berhasil dihapus.`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setUserToDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal menghapus pengguna'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Password Action
  const handleConfirmResetPassword = async () => {
    if (!userToResetPassword) return;
    setIsResettingPassword(true);
    try {
      const res = await resetUserPasswordApi(userToResetPassword.id);
      toast.success(`Kata sandi pengguna ${userToResetPassword.name} berhasil direset.`);
      const targetUser = userToResetPassword;
      setUserToResetPassword(null);

      // Tampilkan kata sandi sementara SEKALI di dialog
      setPasswordDialog({
        open: true,
        userName: targetUser.name,
        userEmail: targetUser.email,
        password: res.temporaryPassword,
        type: 'reset',
      });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Gagal mereset kata sandi'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Tutup dialog password dan PASTIKAN password tidak tersisa di state
  const handleClosePasswordDialog = () => {
    setPasswordDialog(null);
  };

  // TanStack Table Columns
  const columns: LegacyColumnDef<SuperAdminUser, any>[] = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Pengguna',
        cell: (info) => {
          const user = info.row.original;
          const initials = user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          const isSelf = currentUser?.id === user.id;

          return (
            <div className="flex items-center gap-3 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary text-sm truncate">
                    {user.name}
                  </span>
                  {isSelf && (
                    <span className="rounded-full bg-blue-tint text-navy px-2 py-0.5 text-[10px] font-bold">
                      Saya
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary truncate block">
                  {user.email}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: 'Peran',
        cell: (info) => <RoleBadge role={info.getValue()} />,
      }),
      columnHelper.accessor('department.name', {
        header: 'Departemen',
        cell: (info) => {
          const deptName = info.getValue();
          return (
            <span className="text-sm text-text-primary">
              {deptName || <span className="text-text-placeholder italic">-</span>}
            </span>
          );
        },
      }),
      columnHelper.accessor('jobTitle', {
        header: 'Jabatan',
        cell: (info) => {
          const jobTitle = info.getValue();
          return (
            <span className="text-sm text-text-secondary">
              {jobTitle || <span className="text-text-placeholder italic">-</span>}
            </span>
          );
        },
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: (info) => {
          const isActive = info.getValue();
          if (isActive) {
            return <StatusBadge status="disetujui" label="Aktif" />;
          }
          // Status bahaya: Latar #FCE4E7, teks dan border #B0000F, dengan ikon dan label (jangan solid merah)
          return (
            <span
              data-testid="status-inactive"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-semibold bg-danger-tint text-danger border-danger/20"
            >
              <XCircle className="h-3.5 w-3.5" />
              Nonaktif
            </span>
          );
        },
      }),
      columnHelper.accessor('lastLoginAt', {
        header: 'Terakhir Masuk',
        cell: (info) => (
          <span className="text-xs text-text-secondary">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => {
          const user = info.row.original;
          const isSelf = currentUser?.id === user.id;

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Tombol Ubah */}
              <button
                type="button"
                onClick={() => {
                  setUserToEdit(user);
                  setIsFormModalOpen(true);
                }}
                title="Ubah data pengguna"
                aria-label={`Ubah data ${user.name}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              {/* Tombol Reset Password */}
              <button
                type="button"
                onClick={() => setUserToResetPassword(user)}
                title="Reset kata sandi"
                aria-label={`Reset kata sandi ${user.name}`}
                className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-background hover:text-navy transition-colors cursor-pointer"
              >
                <KeyRound className="h-4 w-4" />
              </button>

              {/* Tombol Aktif / Nonaktifkan (Dicegah untuk diri sendiri) */}
              <div className="relative inline-flex">
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => setUserToToggleStatus(user)}
                  title={
                    isSelf
                      ? 'Anda tidak dapat menonaktifkan akun sendiri'
                      : user.isActive
                        ? 'Nonaktifkan akun'
                        : 'Aktifkan akun'
                  }
                  aria-label={
                    isSelf
                      ? 'Anda tidak dapat menonaktifkan akun sendiri'
                      : user.isActive
                        ? `Nonaktifkan akun ${user.name}`
                        : `Aktifkan akun ${user.name}`
                  }
                  data-testid={`toggle-status-button-${user.id}`}
                  className={`rounded-[var(--radius-input)] p-1.5 transition-colors ${
                    isSelf
                      ? 'cursor-not-allowed opacity-40 text-text-placeholder'
                      : user.isActive
                        ? 'text-text-secondary hover:bg-danger-tint hover:text-danger cursor-pointer'
                        : 'text-text-secondary hover:bg-success/10 hover:text-success cursor-pointer'
                  }`}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>

              {/* Tombol Hapus (Dicegah untuk diri sendiri) */}
              <div className="relative inline-flex">
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => setUserToDelete(user)}
                  title={
                    isSelf
                      ? 'Anda tidak dapat menghapus akun sendiri'
                      : 'Hapus pengguna'
                  }
                  aria-label={
                    isSelf
                      ? 'Anda tidak dapat menghapus akun sendiri'
                      : `Hapus pengguna ${user.name}`
                  }
                  data-testid={`delete-user-button-${user.id}`}
                  className={`rounded-[var(--radius-input)] p-1.5 transition-colors ${
                    isSelf
                      ? 'cursor-not-allowed opacity-40 text-text-placeholder'
                      : 'text-text-secondary hover:bg-danger-tint hover:text-danger cursor-pointer'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        },
      }),
    ],
    [currentUser?.id],
  );

  const table = useLegacyTable({
    data: usersList,
    columns,
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Kelola seluruh akun pengguna, peran otorisasi, departemen, dan hak akses sistem.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setUserToEdit(null);
            setIsFormModalOpen(true);
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Filter & Bar Pencarian */}
      <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm border border-border">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Input Pencarian */}
          <form
            onSubmit={handleSearchSubmit}
            className="md:col-span-4 relative flex items-center"
          >
            <Search className="absolute left-3 h-4 w-4 text-text-placeholder" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full h-10 pl-9 pr-16 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="absolute right-1.5 h-7 px-2.5 rounded-[var(--radius-input)] bg-background text-xs font-semibold text-text-primary hover:bg-border transition-colors cursor-pointer"
            >
              Cari
            </button>
          </form>

          {/* Filter Peran */}
          <div className="md:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              aria-label="Filter peran"
              className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Semua Peran</option>
              <option value="pengguna">Pengguna</option>
              <option value="admin">Admin</option>
              <option value="finance">Finance</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {/* Filter Departemen */}
          <div className="md:col-span-3">
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setPage(1);
              }}
              aria-label="Filter departemen"
              disabled={isLoadingDepartments}
              className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:bg-background"
            >
              <option value="all">Semua Departemen</option>
              {departmentsList.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter status"
              className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset filter"
                aria-label="Reset semua filter"
                className="h-10 px-2.5 shrink-0 rounded-[var(--radius-input)] border border-border text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Konten Utama Tabel */}
      <div className="rounded-[var(--radius-card-lg)] bg-surface shadow-sm border border-border overflow-hidden">
        {isLoadingUsers ? (
          <LoadingState message="Memuat daftar pengguna..." />
        ) : isUsersError ? (
          <ErrorState
            message={extractErrorMessage(usersError, 'Gagal memuat data pengguna')}
            onRetry={refetchUsers}
          />
        ) : usersList.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-text-placeholder" />}
            title="Tidak ada pengguna ditemukan"
            description={
              hasActiveFilters
                ? 'Tidak ada akun pengguna yang sesuai dengan kriteria filter saat ini.'
                : 'Belum ada data pengguna yang terdaftar di sistem.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={handleResetFilters}>
                  Reset Filter
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    setUserToEdit(null);
                    setIsFormModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pengguna Pertama
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-background/80 border-b border-border text-xs uppercase font-semibold text-text-secondary tracking-wider">
                  {table.getHeaderGroups().map((headerGroup) => (
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
                  {table.getRowModel().rows.map((row) => (
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

            {/* Paginasi Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t border-border bg-surface text-xs text-text-secondary">
              <div className="flex items-center gap-3">
                <span>
                  Menampilkan{' '}
                  <span className="font-semibold text-text-primary">
                    {(meta.page - 1) * meta.limit + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-semibold text-text-primary">
                    {Math.min(meta.page * meta.limit, meta.total)}
                  </span>{' '}
                  dari{' '}
                  <span className="font-semibold text-text-primary">
                    {meta.total}
                  </span>{' '}
                  pengguna
                </span>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Baris per halaman:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Pilih limit per halaman"
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
                  Halaman <span className="font-semibold">{meta.page}</span> dari{' '}
                  <span className="font-semibold">{meta.totalPages || 1}</span>
                </span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Halaman sebelumnya"
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Halaman berikutnya"
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-border text-text-primary hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal (Tambah / Ubah) */}
      <UserFormModal
        open={isFormModalOpen}
        userToEdit={userToEdit}
        departments={departmentsList}
        isLoadingDepartments={isLoadingDepartments}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setIsFormModalOpen(false);
          setUserToEdit(null);
        }}
      />

      {/* Dialog Konfirmasi Hapus Pengguna (Tombol Tolak Putih Teks Merah Tua) */}
      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun ${userToDelete?.name}? Pengguna akan di-soft-delete, status menjadi nonaktif, dan seluruh sesi aktif akan dicabut.`}
        confirmLabel="Hapus Akun"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Dialog Konfirmasi Ubah Status Pengguna */}
      <ConfirmDialog
        open={Boolean(userToToggleStatus)}
        title={userToToggleStatus?.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
        description={`Apakah Anda yakin ingin ${
          userToToggleStatus?.isActive
            ? 'menonaktifkan akun ini? Pengguna tidak akan dapat masuk ke sistem dan seluruh sesi aktif akan dicabut.'
            : 'mengaktifkan kembali akun ini agar pengguna dapat masuk ke sistem?'
        }`}
        confirmLabel={userToToggleStatus?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={userToToggleStatus?.isActive ? 'danger' : 'default'}
        loading={isTogglingStatus}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setUserToToggleStatus(null)}
      />

      {/* Dialog Konfirmasi Reset Password */}
      <ConfirmDialog
        open={Boolean(userToResetPassword)}
        title="Reset Kata Sandi"
        description={`Apakah Anda yakin ingin mereset kata sandi akun ${userToResetPassword?.name}? Sistem akan menghasilkan kata sandi sementara dan mencabut seluruh sesi aktif.`}
        confirmLabel="Reset Sekarang"
        cancelLabel="Batal"
        loading={isResettingPassword}
        onConfirm={handleConfirmResetPassword}
        onCancel={() => setUserToResetPassword(null)}
      />

      {/* Dialog Password Sekali Tampil */}
      {passwordDialog && (
        <PasswordDisplayDialog
          open={passwordDialog.open}
          userName={passwordDialog.userName}
          userEmail={passwordDialog.userEmail}
          password={passwordDialog.password}
          type={passwordDialog.type}
          onClose={handleClosePasswordDialog}
        />
      )}
    </div>
  );
}
