import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Building2, Hash, Layers, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { extractErrorMessage } from '@/lib/utils';
import type { CostCenterItem, DepartmentItem } from '@/types';

const costCenterSchema = z.object({
  code: z
    .string()
    .min(2, 'Kode cost center minimal 2 karakter')
    .max(50, 'Kode cost center maksimal 50 karakter')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh berupa huruf, angka, tanda strip (-) atau underscore (_)'),
  name: z
    .string()
    .min(2, 'Nama cost center minimal 2 karakter')
    .max(100, 'Nama cost center maksimal 100 karakter'),
  departmentId: z
    .string()
    .min(1, 'Departemen wajib dipilih'),
  isActive: z.boolean().optional(),
});

type CostCenterFormValues = z.infer<typeof costCenterSchema>;

interface CostCenterFormModalProps {
  open: boolean;
  costCenterToEdit: CostCenterItem | null;
  departments: DepartmentItem[];
  onSubmit: (values: CostCenterFormValues) => Promise<void>;
  onClose: () => void;
}

export function CostCenterFormModal({
  open,
  costCenterToEdit,
  departments,
  onSubmit,
  onClose,
}: CostCenterFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(costCenterToEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      code: '',
      name: '',
      departmentId: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (costCenterToEdit) {
        reset({
          code: costCenterToEdit.code,
          name: costCenterToEdit.name,
          departmentId: costCenterToEdit.departmentId || '',
          isActive: costCenterToEdit.isActive,
        });
      } else {
        reset({
          code: '',
          name: '',
          departmentId: '',
          isActive: true,
        });
      }
    }
  }, [open, costCenterToEdit, reset]);

  if (!open) return null;

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  const handleFormSubmit = async (values: CostCenterFormValues) => {
    setServerError(null);
    try {
      await onSubmit({
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Gagal menyimpan cost center');
      setServerError(message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-darkest/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 my-8 w-full max-w-lg rounded-[var(--radius-card-lg)] bg-surface p-6 shadow-2xl border border-border">
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
          <h2 id="cc-modal-title" className="text-xl font-bold text-text-primary">
            {isEditing ? 'Ubah Cost Center' : 'Tambah Cost Center Baru'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isEditing
              ? 'Perbarui kode, nama, dan pemetaan departemen cost center.'
              : 'Daftarkan cost center baru untuk penelusuran dan alokasi anggaran proyek.'}
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
          {/* Kode Cost Center */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Kode Cost Center <span className="text-primary">* (Unik)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: CC-ENG-001, CC-MKT-002"
                {...register('code')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm font-mono text-text-primary uppercase placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.code && (
              <p className="mt-1 text-xs text-danger">{errors.code.message}</p>
            )}
          </div>

          {/* Nama Cost Center */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Nama Cost Center <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: Engineering Web Platform"
                {...register('name')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          {/* Departemen */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Departemen <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <select
                {...register('departmentId')}
                className="w-full h-10 pl-10 pr-8 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
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

          {/* Status Aktif jika mode edit */}
          {isEditing && (
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="accent-primary h-4 w-4 rounded"
                />
                <span className="text-sm font-semibold text-text-primary">
                  Status Cost Center Aktif
                </span>
              </label>
            </div>
          )}

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
              {isEditing ? 'Simpan Perubahan' : 'Buat Cost Center'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
