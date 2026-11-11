import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Flag, Calendar, Layers } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button, toast } from '@/components/shared';
import { createMilestoneApi, updateMilestoneApi } from '@/lib/api-projects';
import { extractErrorMessage } from '@/lib/utils';
import type { Milestone, Phase, CreateMilestonePayload, UpdateMilestonePayload } from '@/types';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Nama milestone wajib diisi').max(255, 'Nama milestone maksimal 255 karakter'),
  dueDate: z.string().min(1, 'Tenggat waktu wajib diisi'),
  phaseId: z.string().optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

interface MilestoneFormModalProps {
  open: boolean;
  projectId: string;
  milestone?: Milestone | null;
  phases: Phase[];
  defaultPhaseId?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function MilestoneFormContent({
  projectId,
  milestone,
  phases,
  defaultPhaseId,
  projectStartDate,
  projectEndDate,
  onClose,
  onSuccess,
}: Omit<MilestoneFormModalProps, 'open'>) {
  const isEdit = !!milestone;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: milestone?.name ?? '',
      dueDate: milestone?.dueDate ? milestone.dueDate.slice(0, 10) : '',
      phaseId: milestone?.phaseId ?? defaultPhaseId ?? '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateMilestonePayload) => createMilestoneApi(projectId, payload),
    onSuccess: () => {
      toast('success', 'Milestone berhasil ditambahkan.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateMilestonePayload) =>
      updateMilestoneApi(projectId, milestone!.id, payload),
    onSuccess: () => {
      toast('success', 'Milestone berhasil diperbarui.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: MilestoneFormValues) => {
    if (isEdit) {
      updateMutation.mutate({
        name: values.name,
        dueDate: values.dueDate,
        phaseId: values.phaseId ? values.phaseId : null,
      });
    } else {
      createMutation.mutate({
        name: values.name,
        dueDate: values.dueDate,
        phaseId: values.phaseId || undefined,
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary-dark">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {isEdit ? 'Edit Milestone' : 'Tambah Milestone Baru'}
              </h2>
              <p className="text-xs text-text-placeholder">
                {isEdit ? 'Perbarui target pencapaian' : 'Tetapkan target pencapaian penting dalam proyek'}
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
          {/* Nama Milestone */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Nama Milestone <span className="text-danger">*</span>
            </label>
            <input
              id="milestone-name"
              {...register('name')}
              placeholder="Contoh: Desain Sistem Disetujui Klien"
              className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${errors.name ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          {/* Tenggat Waktu */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              <Calendar className="inline h-3 w-3 mr-1" />
              Tenggat Waktu <span className="text-danger">*</span>
            </label>
            <input
              id="milestone-due-date"
              type="date"
              {...register('dueDate')}
              min={projectStartDate ? projectStartDate.slice(0, 10) : undefined}
              max={projectEndDate ? projectEndDate.slice(0, 10) : undefined}
              className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.dueDate ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
            />
            {errors.dueDate && <p className="mt-1 text-xs text-danger">{errors.dueDate.message}</p>}
          </div>

          {/* Fase Terkait (Opsional) */}
          {phases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Layers className="inline h-3 w-3 mr-1" />
                Fase Terkait
              </label>
              <select
                id="milestone-phase-id"
                {...register('phaseId')}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">-- Milestone Umum (Tanpa Fase) --</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button variant="primary" type="submit" loading={isPending}>
              {isEdit ? 'Simpan Perubahan' : 'Tambah Milestone'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MilestoneFormModal(props: MilestoneFormModalProps) {
  if (!props.open) return null;
  return <MilestoneFormContent key={props.milestone?.id ?? 'create-milestone'} {...props} />;
}
