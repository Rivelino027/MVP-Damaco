import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Trash2, Mail, Calendar } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, toast } from '@/components/shared';
import { removeProjectMemberApi } from '@/lib/api-projects';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import AddMemberModal from './AddMemberModal';
import type { ProjectMember, ProjectDetail } from '@/types';

interface ProjectTeamTabProps {
  project: ProjectDetail;
  canEdit: boolean;
}

export default function ProjectTeamTab({ project, canEdit }: ProjectTeamTabProps) {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMemberApi(project.id, userId),
    onSuccess: () => {
      toast('success', 'Anggota berhasil dikeluarkan dari proyek.');
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const members = project.members ?? [];
  const existingUserIds = members.map((m) => m.userId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Anggota Tim Proyek ({members.length})
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Daftar pengguna yang ditugaskan dalam proyek ini
          </p>
        </div>
        {canEdit && project.status !== 'ditutup' && (
          <Button
            id="btn-tambah-anggota"
            variant="primary"
            onClick={() => setAddModalOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Anggota
          </Button>
        )}
      </div>

      {/* Empty State */}
      {members.length === 0 ? (
        <EmptyState
          title="Belum ada anggota tim"
          description={
            canEdit
              ? 'Tambahkan anggota tim agar dapat menugaskan task dan mencatat timesheet.'
              : 'Belum ada anggota yang ditugaskan ke proyek ini.'
          }
          icon={<Users className="h-10 w-10 text-text-placeholder" />}
        />
      ) : (
        /* Team Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const u = member.user;
            return (
              <div
                key={member.id}
                className="group relative flex flex-col justify-between rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-tint text-primary-dark font-bold text-sm shrink-0">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        u.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-text-primary truncate">{u.name}</h4>
                      <p className="text-xs text-text-placeholder truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {u.email}
                      </p>
                    </div>
                  </div>
                  {canEdit && project.status !== 'ditutup' && (
                    <button
                      id={`btn-remove-member-${member.userId}`}
                      onClick={() => setMemberToRemove(member)}
                      className="rounded-lg p-1.5 text-text-placeholder hover:bg-danger-tint hover:text-danger transition-colors shrink-0"
                      title="Keluarkan dari proyek"
                      aria-label={`Keluarkan ${u.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-background border border-border px-2 py-0.5 text-[11px] font-medium capitalize">
                      {u.role}
                    </span>
                    {u.jobTitle && (
                      <span className="text-text-placeholder truncate max-w-[120px]">
                        · {u.jobTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-text-placeholder text-[11px]">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(member.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Anggota */}
      <AddMemberModal
        open={addModalOpen}
        projectId={project.id}
        departmentId={project.departmentId}
        departmentName={project.department?.name}
        existingMemberUserIds={existingUserIds}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['project-detail', project.id] });
        }}
      />

      {/* Dialog Konfirmasi Hapus Anggota */}
      <ConfirmDialog
        open={!!memberToRemove}
        title="Keluarkan Anggota"
        description={`Keluarkan ${memberToRemove?.user.name} dari proyek ini? Anggota yang masih memiliki task aktif tidak dapat dikeluarkan.`}
        confirmLabel="Keluarkan"
        cancelLabel="Batal"
        variant="danger"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (memberToRemove) removeMutation.mutate(memberToRemove.userId);
        }}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
