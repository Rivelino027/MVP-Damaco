import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getProjectApi, getTasksApi, updateTaskStatusApi } from '@/lib/api-projects';
import { Button, toast } from '@/components/shared';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import TaskFormModal from './TaskFormModal';
import TaskDetailModal from './TaskDetailModal';
import type { TaskItem, TaskStatus, TaskPriority } from '@/types';

const STATUS_COLUMNS: Array<{
  id: TaskStatus;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}> = [
  {
    id: 'belum_mulai',
    label: 'Belum Mulai',
    color: '#6B5E60',
    badgeBg: 'bg-[#F4F4F4]',
    badgeText: 'text-[#6B5E60]',
    borderColor: 'border-t-[#6B5E60]',
  },
  {
    id: 'dikerjakan',
    label: 'Dikerjakan',
    color: '#E8141C',
    badgeBg: 'bg-primary-tint',
    badgeText: 'text-primary-dark',
    borderColor: 'border-t-primary',
  },
  {
    id: 'review',
    label: 'Review',
    color: '#F29D38',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderColor: 'border-t-amber-500',
  },
  {
    id: 'selesai',
    label: 'Selesai',
    color: '#48742C',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderColor: 'border-t-emerald-600',
  },
];

const STATUS_FLOW: TaskStatus[] = ['belum_mulai', 'dikerjakan', 'review', 'selesai'];

export default function ProjectKanbanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
  const isFinance = user?.role === 'finance';

  // Filters
  const [search, setSearch] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Drag state
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Modals
  const [createModal, setCreateModal] = useState<{ open: boolean; defaultStatus?: TaskStatus }>({
    open: false,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; taskId: string | null }>({
    open: false,
    taskId: null,
  });
  const [editTarget, setEditTarget] = useState<TaskItem | null>(null);

  // Queries
  const projectQuery = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => getProjectApi(projectId!),
    enabled: !!projectId,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', { projectId, filterPhase, filterPriority, filterAssignee, search }],
    queryFn: () =>
      getTasksApi({
        projectId: projectId!,
        phaseId: filterPhase || undefined,
        priority: (filterPriority as TaskPriority) || undefined,
        assigneeId: filterAssignee || undefined,
        search: search || undefined,
        limit: 200,
      }),
    enabled: !!projectId,
  });

  // Status mutation
  const moveStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatusApi(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const project = projectQuery.data;
  const rawTasks = tasksQuery.data?.data ?? [];
  const phases = project?.phases ?? [];
  const members = project?.members ?? [];
  const isClosed = project?.status === 'ditutup';

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && canEdit && !isClosed) {
      moveStatusMutation.mutate({ taskId, status: targetStatus });
    }
  };

  const handleStepStatus = (task: TaskItem, direction: 'prev' | 'next') => {
    const currentIndex = STATUS_FLOW.indexOf(task.status);
    if (currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < STATUS_FLOW.length) {
      moveStatusMutation.mutate({ taskId: task.id, status: STATUS_FLOW[nextIndex] });
    }
  };

  if (projectQuery.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-placeholder">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Memuat papan proyek...</p>
      </div>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/proyek')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek
        </button>
        <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-tint p-6 text-center text-sm text-danger">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-danger" />
          Proyek tidak ditemukan.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-5 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-detail"
              onClick={() => navigate(`/proyek/${projectId}`)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text-secondary hover:text-text-primary hover:bg-background shadow-sm transition-all"
              title="Kembali ke Detail Proyek"
              aria-label="Kembali ke Detail Proyek"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold text-text-primary">
                  {project.name}
                </h1>
                <span className="rounded-full bg-background border border-border px-2.5 py-0.5 text-xs text-text-placeholder">
                  Papan Kanban
                </span>
              </div>
              <p className="text-xs text-text-placeholder mt-0.5">
                {project.department?.name} · {project.costCenter?.code}
              </p>
            </div>
          </div>

          {canEdit && !isClosed && (
            <Button
              id="btn-tambah-task"
              variant="primary"
              onClick={() => setCreateModal({ open: true })}
              className="gap-2 self-start"
            >
              <Plus className="h-4 w-4" /> Tambah Task
            </Button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-2.5 rounded-[var(--radius-card)] border border-border bg-white p-3 shadow-sm text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-placeholder" />
            <input
              id="search-task"
              type="text"
              placeholder="Cari judul atau isi task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Phase Filter */}
          {phases.length > 0 && (
            <select
              id="filter-task-phase"
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-1.5 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Semua Fase</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Priority Filter */}
          <select
            id="filter-task-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | '')}
            className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-1.5 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
          >
            <option value="">Semua Prioritas</option>
            <option value="tinggi">Tinggi</option>
            <option value="sedang">Sedang</option>
            <option value="rendah">Rendah</option>
          </select>

          {/* Assignee Filter */}
          {members.length > 0 && (
            <select
              id="filter-task-assignee"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-1.5 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Semua Anggota</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full min-w-[900px]">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = rawTasks.filter((t) => t.status === col.id);
            const isDragTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (canEdit && !isClosed) setDragOverCol(col.id);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-[var(--radius-card)] border bg-[#FBF7F7] shadow-sm overflow-hidden transition-all ${
                  col.borderColor
                } border-t-4 ${
                  isDragTarget
                    ? 'border-primary ring-2 ring-primary/30 bg-primary-tint/20'
                    : 'border-border'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wide">
                      {col.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${col.badgeBg} ${col.badgeText}`}
                    >
                      {colTasks.length}
                    </span>
                    {canEdit && !isClosed && (
                      <button
                        onClick={() => setCreateModal({ open: true, defaultStatus: col.id })}
                        className="rounded p-1 text-text-placeholder hover:text-text-primary hover:bg-background"
                        title={`Tambah task di kolom ${col.label}`}
                        aria-label={`Tambah task di kolom ${col.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-xl text-text-placeholder text-xs">
                      Tidak ada task
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const currentIndex = STATUS_FLOW.indexOf(task.status);
                      const hasPrev = currentIndex > 0;
                      const hasNext = currentIndex < STATUS_FLOW.length - 1;
                      const isPastDue =
                        task.status !== 'selesai' &&
                        task.dueDate &&
                        new Date(task.dueDate) < new Date();

                      return (
                        <div
                          key={task.id}
                          draggable={canEdit && !isClosed}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setDetailModal({ open: true, taskId: task.id })}
                          className="group relative flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-white p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          {/* Priority & Phase Tag */}
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold capitalize ${
                                task.priority === 'tinggi'
                                  ? 'bg-danger-tint text-danger'
                                  : task.priority === 'sedang'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.phaseId && phases.find((p) => p.id === task.phaseId) && (
                              <span className="truncate max-w-[120px] rounded bg-background px-1.5 py-0.5 text-text-placeholder border border-border">
                                {phases.find((p) => p.id === task.phaseId)?.name}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-xs text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>

                          {/* Footer Counters & Meta */}
                          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-text-secondary mt-1">
                            {/* Assignee Avatar */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {task.assignee ? (
                                <>
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-tint text-[10px] font-bold text-primary-dark shrink-0">
                                    {task.assignee.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[80px] text-text-secondary">
                                    {task.assignee.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-text-placeholder italic">Tanpa assignee</span>
                              )}
                            </div>

                            {/* Icons info */}
                            <div className="flex items-center gap-2 text-text-placeholder shrink-0">
                              {task.dueDate && (
                                <span
                                  className={`flex items-center gap-0.5 ${
                                    isPastDue ? 'text-danger font-semibold' : ''
                                  }`}
                                  title={`Tenggat: ${formatDate(task.dueDate)}`}
                                >
                                  <Calendar className="h-3 w-3" />
                                </span>
                              )}
                              {(task._count?.checklists ?? 0) > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title="Checklist"
                                >
                                  <CheckSquare className="h-3 w-3" />
                                  <span className="text-[10px]">{task._count?.checklists}</span>
                                </span>
                              )}
                              {(task._count?.comments ?? 0) > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title="Komentar"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="text-[10px]">{task._count?.comments}</span>
                                </span>
                              )}
                              {(task._count?.attachments ?? 0) > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title="Lampiran"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="text-[10px]">{task._count?.attachments}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Step Buttons (Prev / Next Column) */}
                          {canEdit && !isClosed && (
                            <div
                              className="flex items-center justify-between pt-1 border-t border-border/40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {hasPrev ? (
                                <button
                                  id={`btn-prev-status-${task.id}`}
                                  onClick={() => handleStepStatus(task, 'prev')}
                                  className="rounded p-1 text-text-placeholder hover:text-text-primary hover:bg-background transition-colors"
                                  title="Pindah ke kolom sebelumnya"
                                  aria-label="Kolom sebelumnya"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span />
                              )}
                              {hasNext && (
                                <button
                                  id={`btn-next-status-${task.id}`}
                                  onClick={() => handleStepStatus(task, 'next')}
                                  className="rounded p-1 text-text-placeholder hover:text-text-primary hover:bg-background transition-colors ml-auto"
                                  title="Pindah ke kolom berikutnya"
                                  aria-label="Kolom berikutnya"
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <TaskFormModal
        open={createModal.open}
        projectId={projectId!}
        task={editTarget}
        phases={phases}
        members={members}
        defaultStatus={createModal.defaultStatus}
        projectStartDate={project.startDate}
        projectEndDate={project.endDate}
        onClose={() => {
          setCreateModal({ open: false });
          setEditTarget(null);
        }}
        onSuccess={() => {
          setCreateModal({ open: false });
          setEditTarget(null);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
        }}
      />

      <TaskDetailModal
        open={detailModal.open}
        taskId={detailModal.taskId}
        canEdit={canEdit && !isFinance && !isClosed}
        onClose={() => setDetailModal({ open: false, taskId: null })}
        onEdit={(task) => {
          setDetailModal({ open: false, taskId: null });
          setEditTarget(task);
          setCreateModal({ open: true });
        }}
        onDeleted={() => {
          setDetailModal({ open: false, taskId: null });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
        }}
      />
    </div>
  );
}
