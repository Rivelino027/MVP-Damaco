import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, UserPlus, Search, Check } from 'lucide-react';
import { Button, toast } from '@/components/shared';
import { addProjectMemberApi } from '@/lib/api-projects';
import { getUsersApi } from '@/lib/api-super-admin';
import { useAuthStore } from '@/stores/auth';
import { extractErrorMessage } from '@/lib/utils';
import type { SuperAdminUser } from '@/types';

interface AddMemberModalProps {
  open: boolean;
  projectId: string;
  departmentId: string;
  departmentName?: string;
  existingMemberUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberModal({
  open,
  projectId,
  departmentId,
  departmentName,
  existingMemberUserIds,
  onClose,
  onSuccess,
}: AddMemberModalProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [manualUserId, setManualUserId] = useState<string>('');

  // Muat daftar pengguna aktif
  const usersQuery = useQuery({
    queryKey: ['available-users-for-project', projectId, departmentId],
    queryFn: () =>
      getUsersApi({
        isActive: true,
        limit: 100,
        departmentId: isAdmin ? departmentId : undefined,
      }),
    // Hanya coba jika modal terbuka
    enabled: open,
    retry: false,
  });

  const isUsersForbidden = usersQuery.isError;
  const rawUsers: SuperAdminUser[] = usersQuery.data?.data ?? [];

  // Filter kandidat: hanya pengguna/admin, belum jadi anggota, sesuai search
  const candidates = rawUsers.filter((u) => {
    if (existingMemberUserIds.includes(u.id)) return false;
    if (u.role !== 'pengguna' && u.role !== 'admin') return false;
    if (isAdmin && u.departmentId !== departmentId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addProjectMemberApi(projectId, userId),
    onSuccess: () => {
      toast('success', 'Anggota tim berhasil ditambahkan.');
      onSuccess();
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUserId = selectedUserId || manualUserId.trim();
    if (!finalUserId) {
      toast('error', 'Pilih salah satu pengguna atau masukkan ID Pengguna.');
      return;
    }
    addMutation.mutate(finalUserId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-[var(--radius-card-lg)] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary-dark">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-text-primary">
                Tambah Anggota Tim
              </h2>
              <p className="text-xs text-text-placeholder">
                {isAdmin
                  ? `Hanya pengguna dari departemen ${departmentName ?? 'ini'}`
                  : 'Pilih pengguna aktif untuk proyek'}
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
          {!isUsersForbidden ? (
            <>
              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
                <input
                  id="search-user-candidate"
                  type="text"
                  placeholder="Cari nama atau email pengguna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Candidates list */}
              <div className="flex-1 overflow-y-auto border border-border rounded-[var(--radius-input)] divide-y divide-border/60 max-h-60">
                {usersQuery.isPending && (
                  <div className="py-8 text-center text-xs text-text-placeholder">
                    Memuat daftar pengguna...
                  </div>
                )}
                {usersQuery.isSuccess && candidates.length === 0 && (
                  <div className="py-8 text-center text-xs text-text-placeholder">
                    Tidak ada pengguna yang dapat ditambahkan.
                  </div>
                )}
                {candidates.map((cand) => {
                  const isSelected = selectedUserId === cand.id;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedUserId(cand.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-tint/40 border-l-4 border-primary'
                          : 'hover:bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBE3E4] text-xs font-bold text-text-primary shrink-0">
                          {cand.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {cand.name}
                          </p>
                          <p className="text-xs text-text-placeholder truncate">
                            {cand.email} {cand.jobTitle ? `· ${cand.jobTitle}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-background border border-border px-2 py-0.5 text-[10px] text-text-secondary capitalize">
                          {cand.role}
                        </span>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Fallback input ID jika Admin tidak memiliki akses GET /users */
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary">
                ID Pengguna <span className="text-danger">*</span>
              </label>
              <input
                id="input-manual-user-id"
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                placeholder="Masukkan UUID pengguna yang akan ditambahkan..."
                className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="text-xs text-text-placeholder">
                Pastikan pengguna aktif dan terdaftar pada departemen {departmentName ?? 'proyek'}.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4 shrink-0">
            <Button variant="secondary" type="button" onClick={onClose} disabled={addMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={addMutation.isPending}
              disabled={!selectedUserId && !manualUserId.trim()}
            >
              Tambahkan ke Proyek
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
