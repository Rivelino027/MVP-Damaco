import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, FolderKanban, Calendar, FileText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, toast } from '@/components/shared';
import { createProjectApi, updateProjectApi } from '@/lib/api-projects';
import { getCostCentersApi, getProjectTypesApi } from '@/lib/api-super-admin';
import { useAuthStore } from '@/stores/auth';
import { extractErrorMessage } from '@/lib/utils';
import type { DepartmentItem, ProjectItem, CostCenterItem, CreateProjectPayload } from '@/types';

// ─── Schema ───────────────────────────────────────────────

const projectSchema = z
  .object({
    name: z.string().min(1, 'Nama proyek wajib diisi').max(255, 'Nama proyek maksimal 255 karakter'),
    description: z.string().optional(),
    departmentId: z.string().optional(),
    costCenterId: z.string().min(1, 'Cost center wajib dipilih'),
    projectTypeId: z.string().optional(),
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
    { message: 'Tanggal selesai tidak boleh sebelum tanggal mulai', path: ['endDate'] },
  );

type ProjectFormValues = z.infer<typeof projectSchema>;

// ─── Props ────────────────────────────────────────────────

interface ProjectFormModalProps {
  open: boolean;
  project?: ProjectItem;
  departments: DepartmentItem[];
  costCenters: CostCenterItem[];
  allCostCenters: CostCenterItem[];
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Inner Modal Content ──────────────────────────────────

function ProjectFormModalContent({
  project,
  departments,
  onClose,
  onSuccess,
}: Omit<ProjectFormModalProps, 'open' | 'allCostCenters'>) {
  const { user } = useAuthStore();
  const isEdit = !!project;
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';

  const initialDept = project?.departmentId ?? (isAdmin ? (user?.departmentId ?? '') : '');
  const [selectedDept, setSelectedDept] = useState<string>(initialDept);

  // Load cost centers berdasarkan dept terpilih
  const ccQuery = useQuery({
    queryKey: ['cost-centers-modal', selectedDept],
    queryFn: () =>
      getCostCentersApi({ limit: 100, isActive: true, departmentId: selectedDept || undefined }),
    enabled: !!selectedDept,
  });
  const costCenters = ccQuery.data?.data ?? [];

  // Load project types
  const ptQuery = useQuery({
    queryKey: ['project-types-active'],
    queryFn: () => getProjectTypesApi(true),
  });
  const projectTypes = ptQuery.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      departmentId: initialDept,
      costCenterId: project?.costCenterId ?? '',
      projectTypeId: project?.projectTypeId ?? '',
      startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectPayload) => createProjectApi(data),
    onSuccess: () => {
      toast('success', 'Proyek berhasil diajukan.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormValues) =>
      updateProjectApi(project!.id, {
        name: data.name,
        description: data.description || undefined,
        costCenterId: data.costCenterId,
        projectTypeId: data.projectTypeId || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      }),
    onSuccess: () => {
      toast('success', 'Proyek berhasil diperbarui.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ProjectFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate({
        name: values.name,
        description: values.description || undefined,
        departmentId: isSuperAdmin ? values.departmentId : undefined,
        costCenterId: values.costCenterId,
        projectTypeId: values.projectTypeId || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-[var(--radius-card-lg)] bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {isEdit ? 'Edit Proyek' : 'Ajukan Proyek Baru'}
              </h2>
              <p className="text-xs text-text-placeholder">
                {isEdit ? 'Perbarui informasi proyek' : 'Isi detail proyek untuk diajukan'}
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

        {/* Form body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Nama Proyek <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
              <input
                id="project-name"
                {...register('name')}
                placeholder="Nama proyek..."
                className={`w-full rounded-[var(--radius-input)] border py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${errors.name ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Deskripsi
            </label>
            <textarea
              id="project-description"
              {...register('description')}
              placeholder="Deskripsi singkat proyek (opsional)..."
              rows={2}
              className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Departemen (super_admin bisa pilih, admin terkunci) */}
          {isSuperAdmin && !isEdit ? (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Departemen <span className="text-danger">*</span>
              </label>
              <select
                id="project-departement"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setValue('departmentId', e.target.value);
                  setValue('costCenterId', '');
                }}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">-- Pilih departemen --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          ) : isAdmin ? (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Departemen</label>
              <div className="rounded-[var(--radius-input)] border border-border bg-[#F4F4F4] py-2.5 px-3 text-sm text-text-secondary">
                {departments.find((d) => d.id === user?.departmentId)?.name ?? 'Departemen saya'}
              </div>
            </div>
          ) : null}

          {/* Cost Center */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Cost Center <span className="text-danger">*</span>
            </label>
            <select
              id="project-cost-center"
              {...register('costCenterId')}
              disabled={!selectedDept && isSuperAdmin}
              className={`w-full appearance-none rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${errors.costCenterId ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
            >
              <option value="">
                {!selectedDept && isSuperAdmin ? '-- Pilih departemen dulu --' : '-- Pilih cost center --'}
              </option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} · {cc.name}</option>
              ))}
            </select>
            {errors.costCenterId && (
              <p className="mt-1 text-xs text-danger">{errors.costCenterId.message}</p>
            )}
          </div>

          {/* Jenis Proyek */}
          {projectTypes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Jenis Proyek</label>
              <select
                id="project-type"
                {...register('projectTypeId')}
                className="w-full appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="">-- Opsional --</option>
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Tanggal Mulai
              </label>
              <input
                id="project-start-date"
                type="date"
                {...register('startDate')}
                className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Tanggal Selesai
              </label>
              <input
                id="project-end-date"
                type="date"
                {...register('endDate')}
                className={`w-full rounded-[var(--radius-input)] border py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.endDate ? 'border-danger bg-danger-tint/30' : 'border-border bg-background'}`}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-danger">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button variant="primary" type="submit" loading={isPending}>
              {isEdit ? 'Simpan Perubahan' : 'Ajukan Proyek'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────

export default function ProjectFormModal(props: ProjectFormModalProps) {
  if (!props.open) return null;
  return <ProjectFormModalContent key={props.project?.id ?? 'create'} {...props} />;
}
