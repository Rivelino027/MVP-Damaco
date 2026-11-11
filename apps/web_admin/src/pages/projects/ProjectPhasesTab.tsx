import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Flag,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, toast } from '@/components/shared';
import {
  deletePhaseApi,
  deleteMilestoneApi,
  updateMilestoneApi,
} from '@/lib/api-projects';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import PhaseFormModal from './PhaseFormModal';
import MilestoneFormModal from './MilestoneFormModal';
import type { Phase, Milestone, ProjectDetail } from '@/types';

function isMilestonePastDue(dueDate: string, isDone: boolean): boolean {
  if (isDone) return false;
  return new Date(dueDate).getTime() < Date.now();
}

interface ProjectPhasesTabProps {
  project: ProjectDetail;
  canEdit: boolean;
}

export default function ProjectPhasesTab({ project, canEdit }: ProjectPhasesTabProps) {
  const queryClient = useQueryClient();

  // Modal states
  const [phaseModal, setPhaseModal] = useState<{ open: boolean; phase?: Phase | null }>({
    open: false,
  });
  const [milestoneModal, setMilestoneModal] = useState<{
    open: boolean;
    milestone?: Milestone | null;
    defaultPhaseId?: string;
  }>({ open: false });

  // Delete targets
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);

  // Mutations
  const deletePhaseMutation = useMutation({
    mutationFn: (phaseId: string) => deletePhaseApi(project.id, phaseId),
    onSuccess: () => {
      toast('success', 'Fase berhasil dihapus.');
      setPhaseToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) => deleteMilestoneApi(project.id, milestoneId),
    onSuccess: () => {
      toast('success', 'Milestone berhasil dihapus.');
      setMilestoneToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      updateMilestoneApi(project.id, id, { isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const phases = project.phases ?? [];
  const generalMilestones = project.milestones ?? [];
  const isClosed = project.status === 'ditutup';

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Fase & Milestone Proyek
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Tahapan pengerjaan dan target pencapaian utama
          </p>
        </div>
        {canEdit && !isClosed && (
          <div className="flex items-center gap-2">
            <Button
              id="btn-tambah-fase"
              variant="secondary"
              onClick={() => setPhaseModal({ open: true })}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Fase
            </Button>
            <Button
              id="btn-tambah-milestone"
              variant="primary"
              onClick={() => setMilestoneModal({ open: true })}
              className="gap-1.5 text-xs"
            >
              <Flag className="h-3.5 w-3.5" />
              Tambah Milestone
            </Button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {phases.length === 0 && generalMilestones.length === 0 ? (
        <EmptyState
          title="Belum ada fase atau milestone"
          description={
            canEdit
              ? 'Mulai dengan menambahkan fase pengerjaan atau milestone untuk menetapkan target proyek.'
              : 'Belum ada tahapan kerja yang dicatat pada proyek ini.'
          }
          icon={<Layers className="h-10 w-10 text-text-placeholder" />}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* List of Phases */}
          {phases.map((phase) => {
            const phaseMilestones = phase.milestones ?? [];
            return (
              <div
                key={phase.id}
                className="rounded-[var(--radius-card)] border border-border bg-white shadow-sm overflow-hidden"
              >
                {/* Phase Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/50 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {phase.sortOrder}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">{phase.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-text-placeholder mt-0.5">
                        {phase.startDate || phase.endDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {phase.startDate ? formatDate(phase.startDate) : 'Awal'} -{' '}
                            {phase.endDate ? formatDate(phase.endDate) : 'Akhir'}
                          </span>
                        ) : (
                          <span>Rentang tanggal belum diatur</span>
                        )}
                        <span>·</span>
                        <span>{phaseMilestones.length} milestone</span>
                      </div>
                    </div>
                  </div>

                  {canEdit && !isClosed && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setMilestoneModal({ open: true, defaultPhaseId: phase.id })
                        }
                        className="text-xs h-8 px-2.5 gap-1"
                      >
                        <Plus className="h-3 w-3" /> Milestone
                      </Button>
                      <button
                        id={`edit-phase-${phase.id}`}
                        onClick={() => setPhaseModal({ open: true, phase })}
                        className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary transition-colors"
                        title="Edit Fase"
                        aria-label={`Edit ${phase.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-phase-${phase.id}`}
                        onClick={() => setPhaseToDelete(phase)}
                        className="rounded-lg p-1.5 text-text-placeholder hover:bg-danger-tint hover:text-danger transition-colors"
                        title="Hapus Fase"
                        aria-label={`Hapus ${phase.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Milestones inside Phase */}
                <div className="p-4">
                  {phaseMilestones.length === 0 ? (
                    <p className="text-xs text-text-placeholder py-2 italic text-center">
                      Belum ada milestone dalam fase ini.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {phaseMilestones.map((ms) => (
                        <MilestoneRow
                          key={ms.id}
                          milestone={ms}
                          canEdit={canEdit && !isClosed}
                          onToggle={(done) =>
                            toggleMilestoneMutation.mutate({ id: ms.id, isDone: done })
                          }
                          onEdit={() => setMilestoneModal({ open: true, milestone: ms })}
                          onDelete={() => setMilestoneToDelete(ms)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* General Milestones (Without Phase) */}
          {generalMilestones.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-background/50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-text-placeholder" />
                  <h4 className="font-semibold text-sm text-text-primary">
                    Milestone Umum ({generalMilestones.length})
                  </h4>
                </div>
                {canEdit && !isClosed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMilestoneModal({ open: true })}
                    className="text-xs h-8 px-2.5 gap-1"
                  >
                    <Plus className="h-3 w-3" /> Tambah
                  </Button>
                )}
              </div>
              <div className="p-4 divide-y divide-border/60">
                {generalMilestones.map((ms) => (
                  <MilestoneRow
                    key={ms.id}
                    milestone={ms}
                    canEdit={canEdit && !isClosed}
                    onToggle={(done) =>
                      toggleMilestoneMutation.mutate({ id: ms.id, isDone: done })
                    }
                    onEdit={() => setMilestoneModal({ open: true, milestone: ms })}
                    onDelete={() => setMilestoneToDelete(ms)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <PhaseFormModal
        open={phaseModal.open}
        projectId={project.id}
        phase={phaseModal.phase}
        nextOrder={phases.length + 1}
        projectStartDate={project.startDate}
        projectEndDate={project.endDate}
        onClose={() => setPhaseModal({ open: false })}
        onSuccess={() => {
          setPhaseModal({ open: false });
          queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
        }}
      />

      <MilestoneFormModal
        open={milestoneModal.open}
        projectId={project.id}
        milestone={milestoneModal.milestone}
        phases={phases}
        defaultPhaseId={milestoneModal.defaultPhaseId}
        projectStartDate={project.startDate}
        projectEndDate={project.endDate}
        onClose={() => setMilestoneModal({ open: false })}
        onSuccess={() => {
          setMilestoneModal({ open: false });
          queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
        }}
      />

      {/* Confirm Phase Delete */}
      <ConfirmDialog
        open={!!phaseToDelete}
        title="Hapus Fase"
        description={`Hapus fase "${phaseToDelete?.name}"? Fase yang masih memiliki task atau alokasi anggaran tidak dapat dihapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deletePhaseMutation.isPending}
        onConfirm={() => {
          if (phaseToDelete) deletePhaseMutation.mutate(phaseToDelete.id);
        }}
        onCancel={() => setPhaseToDelete(null)}
      />

      {/* Confirm Milestone Delete */}
      <ConfirmDialog
        open={!!milestoneToDelete}
        title="Hapus Milestone"
        description={`Hapus milestone "${milestoneToDelete?.name}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deleteMilestoneMutation.isPending}
        onConfirm={() => {
          if (milestoneToDelete) deleteMilestoneMutation.mutate(milestoneToDelete.id);
        }}
        onCancel={() => setMilestoneToDelete(null)}
      />
    </div>
  );
}

// ─── Milestone Row ────────────────────────────────────────

interface MilestoneRowProps {
  milestone: Milestone;
  canEdit: boolean;
  onToggle: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MilestoneRow({ milestone, canEdit, onToggle, onEdit, onDelete }: MilestoneRowProps) {
  const isPastDue = isMilestonePastDue(milestone.dueDate, milestone.isDone);

  return (
    <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-background/80 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onToggle(!milestone.isDone)}
          className={`shrink-0 transition-colors ${
            canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
          }`}
          aria-label={milestone.isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
        >
          {milestone.isDone ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5 text-text-placeholder" />
          )}
        </button>

        <div className="min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              milestone.isDone
                ? 'line-through text-text-placeholder'
                : 'text-text-primary'
            }`}
          >
            {milestone.name}
          </p>
          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span
              className={`flex items-center gap-1 ${
                isPastDue ? 'text-danger font-medium' : 'text-text-placeholder'
              }`}
            >
              <Clock className="h-3 w-3" />
              Tenggat: {formatDate(milestone.dueDate)}
            </span>
            {isPastDue && (
              <span className="rounded bg-danger-tint px-1.5 py-0.2 text-[10px] text-danger font-semibold">
                Terlambat
              </span>
            )}
            {milestone.isDone && (
              <span className="rounded bg-success/10 px-1.5 py-0.2 text-[10px] text-success font-semibold">
                Selesai
              </span>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            id={`edit-milestone-${milestone.id}`}
            onClick={onEdit}
            className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary"
            title="Edit Milestone"
            aria-label={`Edit ${milestone.name}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            id={`delete-milestone-${milestone.id}`}
            onClick={onDelete}
            className="rounded-lg p-1.5 text-text-placeholder hover:bg-danger-tint hover:text-danger"
            title="Hapus Milestone"
            aria-label={`Hapus ${milestone.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
