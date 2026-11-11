import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Layers, Calendar, ArrowUpDown } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button, toast } from '@/components/shared';
import { createPhaseApi, updatePhaseApi } from '@/lib/api-projects';
import { extractErrorMessage } from '@/lib/utils';
import type { Phase, CreatePhasePayload, UpdatePhasePayload } from '@/types';

const phaseSchema = z
  .object({
    name: z.string().min(1, 'Nama fase wajib diisi').max(255, 'Nama fase maksimal 255 karakter'),
    sortOrder: z.coerce.number().min(0, 'Nomor urutan minimal 0'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'Tanggal selesai tidak boleh sebelum tanggal mulai fase', path: ['endDate'] },
  );

type PhaseFormValues = z.infer<typeof phaseSchema>;

interface PhaseFormModalProps {
  open: boolean;
  projectId: string;
  phase?: Phase | null;
  nextOrder?: number;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function PhaseFormContent({
  projectId,
  phase,
  nextOrder = 0,
  projectStartDate,
  projectEndDate,
  onClose,
  onSuccess,
}: Omit<PhaseFormModalProps, 'open'>) {
  const isEdit = !!phase;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      name: phase?.name ?? '',
      sortOrder: phase?.sortOrder ?? nextOrder,
      startDate: phase?.startDate ? phase.startDate.slice(0, 10) : '',
      endDate: phase?.endDate ? phase.endDate.slice(0, 10) : '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePhasePayload) => createPhaseApi(projectId, payload),
    onSuccess: () => {
      toast('success', 'Fase berhasil ditambahkan.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePhasePayload) => updatePhaseApi(projectId, phase!.id, payload),
    onSuccess: () => {
      toast('success', 'Fase berhasil diperbarui.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: PhaseFormValues) => {
    if (isEdit) {
      updateMutation.mutate({
        name: values.name,
        sortOrder: values.sortOrder,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
      });
    } else {
      createMutation.mutate({
        name: values.name,
        sortOrder: values.sortOrder,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-[var(--radius-card-lg)] bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {isEdit ? 'Edit Fase' : 'Tambah Fase Baru'}
              </h2>
              <p className="text-xs text-text-placeholder">
                {isEdit ? 'Perbarui informasi fase proyek' : 'Tambahkan tahapan kerja ke proyek'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
          {/* Nama Fase */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Nama Fase <span className="text-danger">*</span>
            </label>
            <input
              id="phase-name"
              {...register('name')}
              placeholder="Contoh: Perencanaan & Analisis"
              className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${errors.name ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          {/* Urutan */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              <ArrowUpDown className="inline h-3 w-3 mr-1" />
              Nomor Urutan
            </label>
            <input
              id="phase-order"
              type="number"
              min={0}
              {...register('sortOrder')}
              className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {errors.sortOrder && <p className="mt-1 text-xs text-danger">{errors.sortOrder.message}</p>}
          </div>

          {/* Rentang Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" /> Tanggal Mulai
              </label>
              <input
                id="phase-start-date"
                type="date"
                {...register('startDate')}
                min={projectStartDate ? projectStartDate.slice(0, 10) : undefined}
                max={projectEndDate ? projectEndDate.slice(0, 10) : undefined}
                className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" /> Tanggal Selesai
              </label>
              <input
                id="phase-end-date"
                type="date"
                {...register('endDate')}
                min={projectStartDate ? projectStartDate.slice(0, 10) : undefined}
                max={projectEndDate ? projectEndDate.slice(0, 10) : undefined}
                className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.endDate ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
              />
              {errors.endDate && <p className="mt-1 text-xs text-danger">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button variant="primary" type="submit" loading={isPending}>
              {isEdit ? 'Simpan Perubahan' : 'Tambah Fase'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PhaseFormModal(props: PhaseFormModalProps) {
  if (!props.open) return null;
  return <PhaseFormContent key={props.phase?.id ?? 'create-phase'} {...props} />;
}
