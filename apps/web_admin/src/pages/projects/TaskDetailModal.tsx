import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Calendar,
  User,
  Clock,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  Download,
  Send,
  Edit2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button, ConfirmDialog, toast } from '@/components/shared';
import {
  getTaskApi,
  updateTaskStatusApi,
  deleteTaskApi,
  createChecklistApi,
  updateChecklistApi,
  deleteChecklistApi,
  createCommentApi,
  deleteCommentApi,
  getAttachmentsApi,
  uploadAttachmentApi,
  downloadAttachmentApi,
  deleteAttachmentApi,
} from '@/lib/api-projects';
import { useAuthStore } from '@/stores/auth';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import type { TaskItem, TaskStatus, ChecklistItem, TaskComment, TaskAttachment } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskDetailModalProps {
  open: boolean;
  taskId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
  onDeleted: () => void;
}

export default function TaskDetailModal({
  open,
  taskId,
  canEdit,
  onClose,
  onEdit,
  onDeleted,
}: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active collaboration tab
  const [collabTab, setCollabTab] = useState<'checklists' | 'attachments' | 'comments'>('checklists');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);

  // Queries
  const taskQuery = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => getTaskApi(taskId!),
    enabled: open && !!taskId,
  });

  const attachmentsQuery = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => getAttachmentsApi(taskId!),
    enabled: open && !!taskId && collabTab === 'attachments',
  });

  // Mutations
  const statusMutation = useMutation({
    mutationFn: (newStatus: TaskStatus) => updateTaskStatusApi(taskId!, newStatus),
    onSuccess: () => {
      toast('success', 'Status task diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTaskApi(taskId!),
    onSuccess: () => {
      toast('success', 'Task berhasil dihapus.');
      setDeleteTaskOpen(false);
      onDeleted();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const createChecklistMutation = useMutation({
    mutationFn: (text: string) => createChecklistApi(taskId!, text),
    onSuccess: () => {
      setNewChecklistText('');
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ cid, isDone }: { cid: string; isDone: boolean }) =>
      updateChecklistApi(taskId!, cid, { isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (cid: string) => deleteChecklistApi(taskId!, cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const createCommentMutation = useMutation({
    mutationFn: (body: string) => createCommentApi(taskId!, body),
    onSuccess: () => {
      setNewCommentText('');
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (cid: string) => deleteCommentApi(taskId!, cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => uploadAttachmentApi(taskId!, file),
    onSuccess: () => {
      toast('success', 'Lampiran berhasil diunggah.');
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (aid: string) => deleteAttachmentApi(taskId!, aid),
    onSuccess: () => {
      toast('success', 'Lampiran berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const handleDownload = async (att: TaskAttachment) => {
    try {
      const url = await downloadAttachmentApi(taskId!, att.id);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', att.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      toast('error', extractErrorMessage(err));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast('error', 'Ukuran file melebihi 10 MB');
        e.target.value = '';
        return;
      }
      uploadAttachmentMutation.mutate(file);
      e.target.value = '';
    }
  };

  if (!open || !taskId) return null;

  const task = taskQuery.data as any; // Task detail with checklists, comments, attachments
  const checklists: ChecklistItem[] = task?.checklists ?? [];
  const comments: TaskComment[] = task?.comments ?? [];
  const attachments: TaskAttachment[] = attachmentsQuery.data ?? task?.attachments ?? [];

  const doneCount = checklists.filter((c) => c.isDone).length;
  const totalChecklists = checklists.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-[var(--radius-card-lg)] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border p-5 shrink-0 bg-background/50">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  task?.priority === 'tinggi'
                    ? 'bg-danger-tint text-danger'
                    : task?.priority === 'sedang'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Prioritas {task?.priority ?? 'sedang'}
              </span>
              {task?.phase && (
                <span className="rounded-full bg-background border border-border px-2.5 py-0.5 text-xs text-text-secondary">
                  {task.phase.name}
                </span>
              )}
            </div>
            <h2 className="font-heading text-lg font-bold text-text-primary">
              {task?.title ?? 'Memuat...'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && task && (
              <>
                <button
                  id="btn-edit-task"
                  onClick={() => onEdit(task)}
                  className="rounded-lg p-2 text-text-placeholder hover:bg-background hover:text-text-primary"
                  title="Edit Task"
                  aria-label="Edit Task"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  id="btn-delete-task"
                  onClick={() => setDeleteTaskOpen(true)}
                  className="rounded-lg p-2 text-text-placeholder hover:bg-danger-tint hover:text-danger"
                  title="Hapus Task"
                  aria-label="Hapus Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-placeholder hover:bg-background hover:text-text-primary"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {taskQuery.isPending ? (
          <div className="p-12 text-center text-xs text-text-placeholder">
            Memuat detail task...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status Changer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background p-3 border border-border">
              <span className="text-xs font-semibold text-text-secondary">Status Pengerjaan:</span>
              <div className="flex items-center gap-1">
                {(['belum_mulai', 'dikerjakan', 'review', 'selesai'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={!canEdit}
                    onClick={() => statusMutation.mutate(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      task?.status === st
                        ? 'gradient-primary text-white shadow-sm'
                        : 'text-text-secondary hover:bg-white hover:text-text-primary'
                    }`}
                  >
                    {st === 'belum_mulai'
                      ? 'Belum Mulai'
                      : st === 'dikerjakan'
                        ? 'Dikerjakan'
                        : st === 'review'
                          ? 'Review'
                          : 'Selesai'}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {task?.description && (
              <div>
                <h4 className="text-xs font-semibold text-text-primary mb-1">Deskripsi</h4>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line bg-background/50 rounded-lg p-3 border border-border/60">
                  {task.description}
                </p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs border-y border-border/60 py-3">
              <div>
                <p className="text-text-placeholder">Penanggung Jawab</p>
                <p className="font-medium text-text-primary mt-0.5 truncate flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-text-placeholder" />
                  {task?.assignee?.name ?? 'Belum ada'}
                </p>
              </div>
              <div>
                <p className="text-text-placeholder">Tenggat Waktu</p>
                <p className="font-medium text-text-primary mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-text-placeholder" />
                  {task?.dueDate ? formatDate(task.dueDate) : '-'}
                </p>
              </div>
              <div>
                <p className="text-text-placeholder">Estimasi Waktu</p>
                <p className="font-medium text-text-primary mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-text-placeholder" />
                  {task?.estimatedHours != null ? `${task.estimatedHours} jam` : '-'}
                </p>
              </div>
              <div>
                <p className="text-text-placeholder">Jam Aktual</p>
                <p className="font-medium text-text-primary mt-0.5">
                  {task?.actualHours != null ? `${task.actualHours} jam` : '-'}
                </p>
              </div>
            </div>

            {/* Collaboration Section */}
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-border text-xs font-semibold">
                <button
                  id="tab-collab-checklists"
                  onClick={() => setCollabTab('checklists')}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
                    collabTab === 'checklists'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Checklist ({doneCount}/{totalChecklists})
                </button>
                <button
                  id="tab-collab-attachments"
                  onClick={() => setCollabTab('attachments')}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
                    collabTab === 'attachments'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5" /> Lampiran ({attachments.length})
                </button>
                <button
                  id="tab-collab-comments"
                  onClick={() => setCollabTab('comments')}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
                    collabTab === 'comments'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Komentar ({comments.length})
                </button>
              </div>

              {/* Checklist Panel */}
              {collabTab === 'checklists' && (
                <div className="space-y-3">
                  {canEdit && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newChecklistText.trim()) {
                          createChecklistMutation.mutate(newChecklistText.trim());
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        id="input-new-checklist"
                        type="text"
                        placeholder="Tambah butir checklist baru..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        className="flex-1 rounded-[var(--radius-input)] border border-border bg-background py-2 px-3 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                      <Button
                        id="btn-add-checklist"
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={!newChecklistText.trim() || createChecklistMutation.isPending}
                        className="text-xs h-8 px-3"
                      >
                        <Plus className="h-3.5 w-3.5" /> Tambah
                      </Button>
                    </form>
                  )}

                  <div className="divide-y divide-border/60 border border-border rounded-xl bg-white overflow-hidden">
                    {checklists.length === 0 ? (
                      <p className="py-4 text-center text-xs text-text-placeholder">
                        Belum ada item checklist.
                      </p>
                    ) : (
                      checklists.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 hover:bg-background transition-colors group"
                        >
                          <div
                            onClick={() =>
                              canEdit && toggleChecklistMutation.mutate({ cid: c.id, isDone: !c.isDone })
                            }
                            className={`flex items-center gap-2.5 flex-1 min-w-0 ${
                              canEdit ? 'cursor-pointer' : ''
                            }`}
                          >
                            {c.isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-text-placeholder shrink-0" />
                            )}
                            <span
                              className={`text-xs truncate ${
                                c.isDone ? 'line-through text-text-placeholder' : 'text-text-primary'
                              }`}
                            >
                              {c.text}
                            </span>
                          </div>
                          {canEdit && (
                            <button
                              id={`delete-checklist-${c.id}`}
                              onClick={() => deleteChecklistMutation.mutate(c.id)}
                              className="rounded p-1 text-text-placeholder hover:text-danger hover:bg-danger-tint opacity-80 group-hover:opacity-100"
                              aria-label="Hapus checklist"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Attachments Panel */}
              {collabTab === 'attachments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-placeholder">
                      Format: PDF, Word, Excel, Gambar (Maks 10 MB)
                    </p>
                    {canEdit && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          loading={uploadAttachmentMutation.isPending}
                          className="text-xs h-8 px-3 gap-1.5"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Unggah Berkas
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="divide-y divide-border/60 border border-border rounded-xl bg-white overflow-hidden">
                    {attachments.length === 0 ? (
                      <p className="py-4 text-center text-xs text-text-placeholder">
                        Belum ada berkas lampiran.
                      </p>
                    ) : (
                      attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 hover:bg-background transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Paperclip className="h-4 w-4 text-text-placeholder shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">
                                {att.originalName}
                              </p>
                              <p className="text-[10px] text-text-placeholder">
                                {formatFileSize(att.size)} · {formatDate(att.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              id={`download-attachment-${att.id}`}
                              onClick={() => handleDownload(att)}
                              className="rounded p-1.5 text-text-placeholder hover:text-text-primary hover:bg-background"
                              title="Unduh"
                              aria-label={`Unduh ${att.originalName}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                id={`delete-attachment-${att.id}`}
                                onClick={() => deleteAttachmentMutation.mutate(att.id)}
                                className="rounded p-1.5 text-text-placeholder hover:text-danger hover:bg-danger-tint"
                                title="Hapus"
                                aria-label={`Hapus ${att.originalName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Comments Panel */}
              {collabTab === 'comments' && (
                <div className="space-y-3">
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="py-4 text-center text-xs text-text-placeholder">
                        Belum ada diskusi atau komentar pada task ini.
                      </p>
                    ) : (
                      comments.map((comm) => {
                        const canDeleteComment =
                          user?.id === comm.userId || user?.role === 'admin' || user?.role === 'super_admin';
                        return (
                          <div
                            key={comm.id}
                            className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-text-primary">
                                {comm.user?.name ?? 'Pengguna'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-placeholder">
                                  {formatDate(comm.createdAt)}
                                </span>
                                {canDeleteComment && (
                                  <button
                                    id={`delete-comment-${comm.id}`}
                                    onClick={() => deleteCommentMutation.mutate(comm.id)}
                                    className="text-text-placeholder hover:text-danger p-0.5 rounded"
                                    aria-label="Hapus komentar"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                              {comm.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Komentar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newCommentText.trim()) {
                        createCommentMutation.mutate(newCommentText.trim());
                      }
                    }}
                    className="flex items-center gap-2 border-t border-border/60 pt-2"
                  >
                    <input
                      id="input-new-comment"
                      type="text"
                      placeholder="Tulis tanggapan atau komentar..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 rounded-[var(--radius-input)] border border-border bg-background py-2 px-3 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <Button
                      id="btn-send-comment"
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={!newCommentText.trim() || createCommentMutation.isPending}
                      className="text-xs h-8 px-3"
                    >
                      <Send className="h-3.5 w-3.5" /> Kirim
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Task */}
      <ConfirmDialog
        open={deleteTaskOpen}
        title="Hapus Task"
        description="Apakah Anda yakin ingin menghapus task ini? Task yang memiliki catatan timesheet tidak dapat dihapus."
        confirmLabel="Hapus Task"
        cancelLabel="Batal"
        variant="danger"
        loading={deleteTaskMutation.isPending}
        onConfirm={() => deleteTaskMutation.mutate()}
        onCancel={() => setDeleteTaskOpen(false)}
      />
    </div>
  );
}
