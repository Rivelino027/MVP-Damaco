import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Users,
  Layers,
  CheckSquare,
  Lock,
  Edit2,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getProjectApi, closeProjectApi, deleteProjectApi } from '@/lib/api-projects';
import { getDepartmentsApi } from '@/lib/api-super-admin';
import { Button, StatusBadge, ConfirmDialog, toast } from '@/components/shared';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import ProjectFormModal from './ProjectFormModal';
import ProjectTeamTab from './ProjectTeamTab';
import ProjectPhasesTab from './ProjectPhasesTab';

function ProgressBar({ value }: { value: number | string }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="w-full bg-[#EBE3E4] rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background:
            pct >= 100
              ? '#48742C'
              : pct >= 80
                ? '#F29D38'
                : 'linear-gradient(90deg, #E8141C, #B0000F)',
        }}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
  const isFinance = user?.role === 'finance';

  const [activeTab, setActiveTab] = useState<'tim' | 'fase' | 'task'>('tim');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load project detail
  const projectQuery = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => getProjectApi(id!),
    enabled: !!id,
  });

  // Load departments & cost centers for edit modal
  const deptsQuery = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => getDepartmentsApi({ limit: 100, isActive: true }),
    enabled: editModalOpen && user?.role === 'super_admin',
  });

  const closeMutation = useMutation({
    mutationFn: () => closeProjectApi(id!),
    onSuccess: () => {
      toast('success', 'Proyek berhasil ditutup.');
      setCloseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectApi(id!),
    onSuccess: () => {
      toast('success', 'Proyek berhasil dihapus.');
      setDeleteDialogOpen(false);
      navigate('/proyek');
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  if (projectQuery.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-placeholder">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Memuat detail proyek...</p>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/proyek')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Proyek
        </button>
        <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-tint p-6 text-center text-sm text-danger">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-danger" />
          Proyek tidak ditemukan atau Anda tidak memiliki akses ke proyek ini.
        </div>
      </div>
    );
  }

  const project = projectQuery.data;
  const pct = Number(project.progressPercent) || 0;
  const isClosed = project.status === 'ditutup';
  const totalMilestones =
    (project.milestones?.length ?? 0) +
    (project.phases?.reduce((acc, p) => acc + (p.milestones?.length ?? 0), 0) ?? 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-projects"
          onClick={() => navigate('/proyek')}
          className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Proyek
        </button>

        {canEdit && (
          <div className="flex items-center gap-2">
            {!isClosed && (
              <>
                <Button
                  id="btn-edit-detail-project"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                {project.status === 'berjalan' && (
                  <Button
                    id="btn-close-detail-project"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCloseDialogOpen(true)}
                    className="gap-1.5 text-xs text-text-secondary"
                  >
                    <Lock className="h-3.5 w-3.5" /> Tutup Proyek
                  </Button>
                )}
              </>
            )}
            <Button
              id="btn-delete-detail-project"
              variant="reject"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Main Summary Header Card */}
      <div className="rounded-[var(--radius-card-lg)] border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          {/* Title & Status */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading text-2xl font-bold text-text-primary">
                  {project.name}
                </h1>
                <StatusBadge status={project.status} />
                {project.projectType && (
                  <span className="rounded-full bg-background px-3 py-0.5 text-xs font-medium text-text-secondary border border-border">
                    {project.projectType.name}
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center rounded-xl bg-background border border-border px-4 py-2 min-w-[70px]">
                <span className="text-lg font-bold text-text-primary">
                  {project.members?.length ?? 0}
                </span>
                <span className="text-[11px] text-text-placeholder">Anggota</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-background border border-border px-4 py-2 min-w-[70px]">
                <span className="text-lg font-bold text-text-primary">
                  {project.phases?.length ?? 0}
                </span>
                <span className="text-[11px] text-text-placeholder">Fase</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-background border border-border px-4 py-2 min-w-[70px]">
                <span className="text-lg font-bold text-text-primary">{totalMilestones}</span>
                <span className="text-[11px] text-text-placeholder">Milestone</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Row */}
          <div className="space-y-1.5 rounded-xl bg-background p-4 border border-border/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary">Progres Pengerjaan Task</span>
              <span className="font-bold text-text-primary text-sm">{pct.toFixed(0)}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4 text-xs">
            <div>
              <p className="text-text-placeholder">Departemen</p>
              <p className="font-medium text-text-primary mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-text-placeholder" />
                {project.department?.name}
              </p>
            </div>
            <div>
              <p className="text-text-placeholder">Cost Center</p>
              <p className="font-medium text-text-primary mt-0.5">
                {project.costCenter?.code} · {project.costCenter?.name}
              </p>
            </div>
            <div>
              <p className="text-text-placeholder">Rentang Tanggal</p>
              <p className="font-medium text-text-primary mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-placeholder" />
                {project.startDate ? formatDate(project.startDate) : 'Awal'} -{' '}
                {project.endDate ? formatDate(project.endDate) : 'Akhir'}
              </p>
            </div>
            <div>
              <p className="text-text-placeholder">Dibuat Oleh</p>
              <p className="font-medium text-text-primary mt-0.5 truncate">
                {project.createdBy?.name} ({project.createdBy?.role})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          id="tab-tim"
          onClick={() => setActiveTab('tim')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'tim'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="h-4 w-4" />
          Anggota Tim ({project.members?.length ?? 0})
        </button>

        <button
          id="tab-fase"
          onClick={() => setActiveTab('fase')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'fase'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Layers className="h-4 w-4" />
          Fase & Milestone ({project.phases?.length ?? 0})
        </button>

        <button
          id="tab-task"
          onClick={() => setActiveTab('task')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === 'task'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Task & Kanban
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tim' && (
        <ProjectTeamTab project={project} canEdit={canEdit && !isFinance} />
      )}

      {activeTab === 'fase' && (
        <ProjectPhasesTab project={project} canEdit={canEdit && !isFinance} />
      )}

      {activeTab === 'task' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-md">
            <CheckSquare className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              Manajemen Task & Papan Kanban
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Atur alur pengerjaan tugas proyek dalam papan Kanban interaktif, checklist, komentar,
              dan lampiran berkas.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate(`/proyek/${project.id}/task`)}
            className="gap-2"
          >
            Buka Papan Kanban Proyek
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectFormModal
        open={editModalOpen}
        project={project}
        departments={deptsQuery.data?.data ?? []}
        costCenters={[]}
        allCostCenters={[]}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
        }}
      />

      {/* Confirm Close Dialog */}
      <ConfirmDialog
        open={closeDialogOpen}
        title="Tutup Proyek"
        description={`Tandai proyek "${project.name}" sebagai ditutup? Setelah ditutup, anggota dan fase proyek tidak dapat diubah lagi.`}
        confirmLabel="Tutup Proyek"
        cancelLabel="Batal"
        variant="danger"
        loading={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setCloseDialogOpen(false)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Hapus Proyek"
        description={`Hapus proyek "${project.name}"? Data proyek yang sudah memiliki transaksi tidak dapat dihapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
