import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Building2, Briefcase, Mail, Shield, User, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { extractErrorMessage } from '@/lib/utils';
import type { DepartmentItem, Role, SuperAdminUser } from '@/types';

const userSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Nama minimal 2 karakter')
      .max(100, 'Nama maksimal 100 karakter'),
    email: z.string().email('Format email tidak valid'),
    role: z.enum(['pengguna', 'admin', 'finance', 'super_admin'], {
      errorMap: () => ({ message: 'Pilih peran yang valid' }),
    }),
    departmentId: z.string().optional().nullable(),
    jobTitle: z.string().max(100, 'Jabatan maksimal 100 karakter').optional().nullable(),
    password: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length >= 8,
        'Kata sandi minimal 8 karakter jika diisi',
      ),
  })
  .refine(
    (data) => {
      if (data.role === 'pengguna' || data.role === 'admin') {
        return Boolean(data.departmentId && data.departmentId.trim() !== '');
      }
      return true;
    },
    {
      message: 'Departemen wajib diisi untuk peran Pengguna dan Admin',
      path: ['departmentId'],
    },
  );

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormModalProps {
  open: boolean;
  userToEdit: SuperAdminUser | null;
  departments: DepartmentItem[];
  isLoadingDepartments?: boolean;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onClose: () => void;
}

const ROLES_LIST: Array<{ value: Role; label: string; desc: string }> = [
  { value: 'pengguna', label: 'Pengguna', desc: 'Akses mobile untuk task, timesheet & pengeluaran diri sendiri' },
  { value: 'admin', label: 'Admin', desc: 'Kelola proyek departemen & setujui timesheet / pengeluaran tahap 1' },
  { value: 'finance', label: 'Finance', desc: 'Verifikasi & catat pembayaran, laporan keuangan perusahaan' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Akses penuh ke seluruh konfigurasi sistem, peran & master data' },
];

export function UserFormModal({
  open,
  userToEdit,
  departments,
  isLoadingDepartments,
  onSubmit,
  onClose,
}: UserFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(userToEdit);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'pengguna',
      departmentId: '',
      jobTitle: '',
      password: '',
    },
  });

  const selectedRole = useWatch({ control, name: 'role' }) ?? 'pengguna';
  const isDepartmentRequired = selectedRole === 'pengguna' || selectedRole === 'admin';

  useEffect(() => {
    if (open) {
      if (userToEdit) {
        reset({
          name: userToEdit.name,
          email: userToEdit.email,
          role: userToEdit.role,
          departmentId: userToEdit.departmentId || '',
          jobTitle: userToEdit.jobTitle || '',
          password: '',
        });
      } else {
        reset({
          name: '',
          email: '',
          role: 'pengguna',
          departmentId: '',
          jobTitle: '',
          password: '',
        });
      }
    }
  }, [open, userToEdit, reset]);

  if (!open) return null;

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    setServerError(null);
    try {
      await onSubmit({
        ...values,
        departmentId: values.departmentId?.trim() ? values.departmentId : null,
        jobTitle: values.jobTitle?.trim() ? values.jobTitle : null,
        password: values.password?.trim() ? values.password : undefined,
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Gagal menyimpan data pengguna');
      setServerError(message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-darkest/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 my-8 w-full max-w-xl rounded-[var(--radius-card-lg)] bg-surface p-6 shadow-2xl border border-border">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup form"
          className="absolute right-4 top-4 rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2 id="user-modal-title" className="text-xl font-bold text-text-primary">
            {isEditing ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isEditing
              ? 'Perbarui informasi akun, peran, dan departemen pengguna.'
              : 'Daftarkan akun pengguna baru ke dalam sistem BudgetFlow. Satu akun memiliki tepat satu peran.'}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-4 rounded-[var(--radius-input)] bg-danger-tint border border-danger/30 p-3.5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-danger font-medium leading-relaxed">
              <span className="font-bold">Gagal: </span>
              {serverError}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Nama Lengkap <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: Ahmad Dahlan"
                {...register('name')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Alamat Email <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="email"
                placeholder="contoh@duniayamaya.com"
                {...register('email')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Peran (Satu Akun Satu Peran) */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Peran Akun <span className="text-primary">*</span>
              <span className="ml-2 font-normal text-text-secondary">(Satu akun tepat satu peran)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES_LIST.map((role) => (
                <label
                  key={role.value}
                  className={`flex flex-col p-3 rounded-[var(--radius-card)] border cursor-pointer transition-all ${
                    selectedRole === role.value
                      ? 'border-primary bg-primary-tint/40 shadow-xs'
                      : 'border-border bg-surface hover:bg-background'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={role.value}
                      {...register('role')}
                      className="accent-primary h-4 w-4"
                    />
                    <span className="text-sm font-semibold text-text-primary">
                      {role.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 pl-6 leading-tight">
                    {role.desc}
                  </span>
                </label>
              ))}
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-danger">{errors.role.message}</p>
            )}
          </div>

          {/* Departemen */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Departemen{' '}
              {isDepartmentRequired ? (
                <span className="text-primary">* (Wajib untuk {selectedRole})</span>
              ) : (
                <span className="text-text-secondary font-normal">(Opsional untuk {selectedRole})</span>
              )}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <select
                {...register('departmentId')}
                disabled={isLoadingDepartments}
                className="w-full h-10 pl-10 pr-8 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer disabled:bg-background"
              >
                <option value="">-- Pilih Departemen --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.departmentId && (
              <p className="mt-1 text-xs text-danger">{errors.departmentId.message}</p>
            )}
          </div>

          {/* Jabatan */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Jabatan / Posisi <span className="text-text-secondary font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: Frontend Developer, Project Manager"
                {...register('jobTitle')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.jobTitle && (
              <p className="mt-1 text-xs text-danger">{errors.jobTitle.message}</p>
            )}
          </div>

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              {isEditing ? 'Ubah Kata Sandi' : 'Kata Sandi Awal'}{' '}
              <span className="text-text-secondary font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="password"
                placeholder={
                  isEditing
                    ? 'Kosongkan jika tidak ingin mengubah kata sandi'
                    : 'Kosongkan untuk membuat kata sandi acak otomatis'
                }
                {...register('password')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              {isEditing
                ? 'Minimal 8 karakter jika diisi. Jika diisi, seluruh sesi aktif akun ini akan dicabut.'
                : 'Jika dikosongkan, sistem akan mengacak 16 karakter secara aman dan menampilkannya sekali.'}
            </p>
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              {isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
