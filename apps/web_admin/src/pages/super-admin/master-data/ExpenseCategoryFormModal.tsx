import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Check, Hash, Palette, Tag, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { extractErrorMessage } from '@/lib/utils';
import type { ExpenseCategoryItem } from '@/types';

// Palet warna resmi BudgetFlow (docs/03-desain.md)
const BRAND_COLOR_PALETTE = [
  { hex: '#E8141C', name: 'Primary Red' },
  { hex: '#B0000F', name: 'Dark Red' },
  { hex: '#FF4D4D', name: 'Bright Red' },
  { hex: '#0A47B8', name: 'Brand Blue' },
  { hex: '#0A2E7F', name: 'Navy' },
  { hex: '#48742C', name: 'Forest Green' },
  { hex: '#F29D38', name: 'Amber Warning' },
  { hex: '#1A0B0D', name: 'Charcoal Dark' },
];

const categorySchema = z.object({
  name: z
    .string()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(100, 'Nama kategori maksimal 100 karakter'),
  code: z
    .string()
    .min(2, 'Kode kategori minimal 2 karakter')
    .max(20, 'Kode kategori maksimal 20 karakter')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh berupa huruf, angka, tanda strip (-) atau underscore (_)'),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

type ExpenseCategoryFormValues = z.infer<typeof categorySchema>;

interface ExpenseCategoryFormModalProps {
  open: boolean;
  categoryToEdit: ExpenseCategoryItem | null;
  onSubmit: (values: ExpenseCategoryFormValues) => Promise<void>;
  onClose: () => void;
}

export function ExpenseCategoryFormModal({
  open,
  categoryToEdit,
  onSubmit,
  onClose,
}: ExpenseCategoryFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(categoryToEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      code: '',
      color: BRAND_COLOR_PALETTE[0].hex,
      isActive: true,
    },
  });

  const selectedColor =
    useWatch({ control, name: 'color' }) || BRAND_COLOR_PALETTE[0].hex;

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          code: categoryToEdit.code,
          color: categoryToEdit.color || BRAND_COLOR_PALETTE[0].hex,
          isActive: categoryToEdit.isActive,
        });
      } else {
        reset({
          name: '',
          code: '',
          color: BRAND_COLOR_PALETTE[0].hex,
          isActive: true,
        });
      }
    }
  }, [open, categoryToEdit, reset]);

  if (!open) return null;

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  const handleColorSelect = (hex: string) => {
    setValue('color', hex, { shouldValidate: true });
  };

  const handleFormSubmit = async (values: ExpenseCategoryFormValues) => {
    setServerError(null);
    try {
      await onSubmit({
        ...values,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        color: values.color || selectedColor,
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Gagal menyimpan kategori pengeluaran');
      setServerError(message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cat-modal-title"
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
          <h2 id="cat-modal-title" className="text-xl font-bold text-text-primary">
            {isEditing ? 'Ubah Kategori Pengeluaran' : 'Tambah Kategori Pengeluaran'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isEditing
              ? 'Perbarui label dan kode kategori pengeluaran.'
              : 'Daftarkan klasifikasi biaya baru beserta warna penanda identitasnya.'}
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
          {/* Kode Kategori */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Kode Kategori <span className="text-primary">* (Unik)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: MAT, OPS, TRV, SRV"
                {...register('code')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm font-mono text-text-primary uppercase placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.code && (
              <p className="mt-1 text-xs text-danger">{errors.code.message}</p>
            )}
          </div>

          {/* Nama Kategori */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Nama Kategori <span className="text-primary">* (Unik)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                type="text"
                placeholder="Contoh: Operasional, Transportasi, Material"
                {...register('name')}
                className="w-full h-10 pl-10 pr-3 rounded-[var(--radius-input)] border border-border bg-white text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          {/* Pilihan Warna Palet */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-text-secondary" />
              Warna Label Tag <span className="text-text-secondary font-normal">(Dari Palet Desain)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
              {BRAND_COLOR_PALETTE.map((c) => {
                const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleColorSelect(c.hex)}
                    title={`${c.name} (${c.hex})`}
                    style={{ backgroundColor: c.hex }}
                    className={`h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xs ${
                      isSelected ? 'ring-3 ring-darkest/40 scale-105' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>

            {/* Custom HEX preview */}
            <div className="flex items-center gap-2 mt-2">
              <div
                className="h-6 w-6 rounded-full border border-border shrink-0 shadow-xs"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="font-mono text-xs text-text-secondary">
                Terpilih: <strong className="text-text-primary uppercase">{selectedColor}</strong>
              </span>
            </div>
            {errors.color && (
              <p className="mt-1 text-xs text-danger">{errors.color.message}</p>
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
                  Status Kategori Aktif
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
              {isEditing ? 'Simpan Perubahan' : 'Buat Kategori'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
