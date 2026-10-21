import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, CheckSquare, Calendar, User, Clock, Flag, Layers } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button, toast } from '@/components/shared';
import { createTaskApi, updateTaskApi } from '@/lib/api-projects';
import { extractErrorMessage } from '@/lib/utils';
import type {
  TaskItem,
  Phase,
  ProjectMember,
  TaskPriority,
  TaskStatus,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '@/types';

const taskSchema = z.object({
  title: z.string().min(1, 'Judul task wajib diisi').max(255, 'Judul task maksimal 255 karakter'),
  description: z.string().optional(),
  phaseId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['rendah', 'sedang', 'tinggi'] as const),
  status: z.enum(['belum_mulai', 'dikerjakan', 'review', 'selesai'] as const),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().min(0, 'Estimasi jam tidak boleh negatif').optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  projectId: string;
  task?: TaskItem | null;
  phases: Phase[];
  members: ProjectMember[];
  defaultStatus?: TaskStatus;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function TaskFormContent({
  projectId,
  task,
  phases,
  members,
  defaultStatus = 'belum_mulai',
  projectStartDate,
  projectEndDate,
  onClose,
  onSuccess,
}: Omit<TaskFormModalProps, 'open'>) {
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      phaseId: task?.phaseId ?? '',
      assigneeId: task?.assigneeId ?? '',
      priority: task?.priority ?? 'sedang',
      status: task?.status ?? defaultStatus,
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
      estimatedHours: task?.estimatedHours ?? undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTaskApi(payload),
    onSuccess: () => {
      toast('success', 'Task berhasil dibuat.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTaskPayload) => updateTaskApi(task!.id, payload),
    onSuccess: () => {
      toast('success', 'Task berhasil diperbarui.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: TaskFormValues) => {
    if (isEdit) {
      updateMutation.mutate({
        title: values.title,
        description: values.description || undefined,
        phaseId: values.phaseId || null,
        assigneeId: values.assigneeId || null,
        priority: values.priority as TaskPriority,
        dueDate: values.dueDate || null,
        estimatedHours: values.estimatedHours !== undefined ? Number(values.estimatedHours) : null,
      });
    } else {
      createMutation.mutate({
        projectId,
        title: values.title,
        description: values.description || undefined,
        phaseId: values.phaseId || undefined,
        assigneeId: values.assigneeId || undefined,
        priority: values.priority as TaskPriority,
        status: values.status as TaskStatus,
        dueDate: values.dueDate || undefined,
        estimatedHours: values.estimatedHours !== undefined ? Number(values.estimatedHours) : undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-[var(--radius-card-lg)] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {isEdit ? 'Edit Task' : 'Tambah Task Baru'}
              </h2>
              <p className="text-xs text-text-placeholder">
                {isEdit ? 'Perbarui data tugas' : 'Buat tugas baru dalam papan proyek'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
          {/* Judul */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Judul Task <span className="text-danger">*</span>
            </label>
            <input
              id="task-title"
              {...register('title')}
              placeholder="Contoh: Implementasi Layar Otentikasi"
              className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${errors.title ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
            />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Deskripsi
            </label>
            <textarea
              id="task-description"
              {...register('description')}
              placeholder="Rincian atau petunjuk teknis pengerjaan task..."
              rows={3}
              className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Assignee & Fase */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <User className="inline h-3 w-3 mr-1" />
                Penanggung Jawab (Assignee)
              </label>
              <select
                id="task-assignee"
                {...register('assigneeId')}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">-- Belum Ditugaskan --</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Layers className="inline h-3 w-3 mr-1" />
                Fase Terkait
              </label>
              <select
                id="task-phase"
                {...register('phaseId')}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">-- Tanpa Fase --</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prioritas & Status (status hanya saat create) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Flag className="inline h-3 w-3 mr-1" />
                Prioritas
              </label>
              <select
                id="task-priority"
                {...register('priority')}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="rendah">Rendah</option>
                <option value="sedang">Sedang</option>
                <option value="tinggi">Tinggi</option>
              </select>
            </div>

            {!isEdit ? (
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Kolom Status
                </label>
                <select
                  id="task-status"
                  {...register('status')}
                  className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                >
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="dikerjakan">Dikerjakan</option>
                  <option value="review">Review</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Estimasi Waktu (Jam)
                </label>
                <input
                  id="task-estimated-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  {...register('estimatedHours')}
                  placeholder="Contoh: 8"
                  className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Tenggat Waktu & Estimasi (saat create) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Tenggat Waktu
              </label>
              <input
                id="task-due-date"
                type="date"
                {...register('dueDate')}
                min={projectStartDate ? projectStartDate.slice(0, 10) : undefined}
                max={projectEndDate ? projectEndDate.slice(0, 10) : undefined}
                className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Estimasi Waktu (Jam)
                </label>
                <input
                  id="task-estimated-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  {...register('estimatedHours')}
                  placeholder="Contoh: 8"
                  className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2 shrink-0">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button variant="primary" type="submit" loading={isPending}>
              {isEdit ? 'Simpan Perubahan' : 'Buat Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskFormModal(props: TaskFormModalProps) {
  if (!props.open) return null;
  return <TaskFormContent key={props.task?.id ?? 'create-task'} {...props} />;
}
