import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, FolderKanban, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { extractErrorMessage } from '@/lib/utils';
import type { ProjectTypeItem } from '@/types';

const projectTypeSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama jenis proyek minimal 2 karakter')
    .max(100, 'Nama jenis proyek maksimal 100 karakter'),
  isActive: z.boolean().optional(),
});

type ProjectTypeFormValues = z.infer<typeof projectTypeSchema>;

interface ProjectTypeFormModalProps {
  open: boolean;
  projectTypeToEdit: ProjectTypeItem | null;
  onSubmit: (values: ProjectTypeFormValues) => Promise<void>;
  onClose: () => void;
}

export function ProjectTypeFormModal({
  open,
  projectTypeToEdit,
  onSubmit,
  onClose,
}: ProjectTypeFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(projectTypeToEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectTypeFormValues>({
    resolver: zodResolver(projectTypeSchema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (projectTypeToEdit) {
        reset({
          name: projectTypeToEdit.name,
          isActive: projectTypeToEdit.isActive,
        });
      } else {
        reset({
          name: '',
          isActive: true,
        });
      }
    }
  }, [open, projectTypeToEdit, reset]);

  if (!open) return null;

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  const handleFormSubmit = async (values: ProjectTypeFormValues) => {
    setServerError(null);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Gagal menyimpan jenis proyek');
      setServerError(message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pt-modal-title"
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
          <h2 id="pt-modal-title" className="text-xl font-bold text-text-primary">
            {isEditing ? 'Ubah Jenis Proyek' : 'Tambah Jenis Proyek Baru'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isEditing
              ? 'Perbarui nama klasifikasi model proyek.'
              : 'Daftarkan jenis/tipe proyek baru ke dalam master data aplikasi.'}
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
          {/* Nama Jenis Proyek */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Nama Jenis Proyek <span className="text-primary">* (Unik)</span>
            </label>
            <div className="relative">
              <FolderKanban className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: Internal IT, Klien Korporat, Retainer, R&D"
                {...register('name')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
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
                  Status Jenis Proyek Aktif
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
              {isEditing ? 'Simpan Perubahan' : 'Buat Jenis Proyek'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
