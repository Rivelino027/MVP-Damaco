import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Lock,
  Trash2,
  Calendar,
  Users,
  Layers,
  FolderKanban,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import {
  getProjectsApi,
  closeProjectApi,
  deleteProjectApi,
} from '@/lib/api-projects';
import { getDepartmentsApi, getCostCentersApi } from '@/lib/api-super-admin';
import { Button, StatusBadge, ConfirmDialog, EmptyState, toast } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, extractErrorMessage } from '@/lib/utils';
import ProjectFormModal from './ProjectFormModal';
import type { ProjectItem, ProjectStatus } from '@/types';

// ─── Helpers ─────────────────────────────────────────────

function ProgressBar({ value }: { value: number | string }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="w-full bg-[#EBE3E4] rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: pct >= 100 ? '#48742C' : pct >= 80 ? '#F29D38' : 'linear-gradient(90deg, #E8141C, #B0000F)',
        }}
      />
    </div>
  );
}

function AvatarGroup({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Users className="h-3.5 w-3.5 text-text-placeholder" />
      <span className="text-xs text-text-secondary">{count}</span>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectItem;
  canEdit: boolean;
  onEdit: (p: ProjectItem) => void;
  onClose: (p: ProjectItem) => void;
  onDelete: (p: ProjectItem) => void;
  onNavigate: (p: ProjectItem) => void;
}

function ProjectCard({ project, canEdit, onEdit, onClose, onDelete, onNavigate }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = Number(project.progressPercent) || 0;

  return (
    <div
      className="group relative flex flex-col rounded-[var(--radius-card)] border border-border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      onClick={() => onNavigate(project)}
    >
      {/* Top accent stripe based on status */}
      <div
        className={cn(
          'h-1 w-full rounded-t-[var(--radius-card)]',
          project.status === 'berjalan' && 'gradient-primary',
          project.status === 'diajukan' && 'bg-blue',
          project.status === 'ditutup' && 'bg-[#D9D9D9]',
        )}
      />

      <div className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-text-placeholder mt-0.5 truncate">
              {project.department?.name}
              {project.costCenter?.code ? ` · ${project.costCenter.code}` : ''}
            </p>
          </div>
          {canEdit && (
            <div
              className="relative shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                id={`card-menu-${project.id}`}
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary transition-colors"
                aria-label="Menu proyek"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-40 rounded-[var(--radius-input)] border border-border bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-1">
                    <button
                      id={`edit-project-${project.id}`}
                      onClick={() => { setMenuOpen(false); onEdit(project); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-background hover:text-text-primary"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    {project.status === 'berjalan' && (
                      <button
                        id={`close-project-${project.id}`}
                        onClick={() => { setMenuOpen(false); onClose(project); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-background hover:text-text-primary"
                      >
                        <Lock className="h-3.5 w-3.5" /> Tutup Proyek
                      </button>
                    )}
                    <button
                      id={`delete-project-${project.id}`}
                      onClick={() => { setMenuOpen(false); onDelete(project); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger-tint"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status & Type */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={project.status} />
          {project.projectType && (
            <span className="inline-flex items-center rounded-full bg-background px-2.5 py-0.5 text-[11px] text-text-placeholder border border-border">
              {project.projectType.name}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-placeholder">Progres</span>
            <span className="font-semibold text-text-primary">{pct.toFixed(0)}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-4 text-xs text-text-secondary border-t border-border/60 pt-2.5 mt-0.5">
          <AvatarGroup count={project._count?.members ?? 0} />
          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-text-placeholder" />
            <span>{project._count?.tasks ?? 0} task</span>
          </div>
          {project.endDate && (
            <div className="flex items-center gap-1 ml-auto">
              <Calendar className="h-3.5 w-3.5 text-text-placeholder" />
              <span>{formatDate(project.endDate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Project Table Row ────────────────────────────────────

interface ProjectRowProps {
  project: ProjectItem;
  canEdit: boolean;
  onEdit: (p: ProjectItem) => void;
  onClose: (p: ProjectItem) => void;
  onDelete: (p: ProjectItem) => void;
  onNavigate: (p: ProjectItem) => void;
}

function ProjectRow({ project, canEdit, onEdit, onClose, onDelete, onNavigate }: ProjectRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = Number(project.progressPercent) || 0;

  return (
    <tr
      className="border-b border-border/60 hover:bg-[#FBF7F7] transition-colors cursor-pointer"
      onClick={() => onNavigate(project)}
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </p>
          <p className="text-xs text-text-placeholder mt-0.5">{project.department?.name}</p>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-text-secondary">{project.costCenter?.code} · {project.costCenter?.name}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-2 min-w-[100px]">
          <ProgressBar value={pct} />
          <span className="text-xs font-medium text-text-secondary w-8 shrink-0">{pct.toFixed(0)}%</span>
        </div>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs text-text-secondary">
        <div className="flex items-center gap-4">
          <AvatarGroup count={project._count?.members ?? 0} />
          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-text-placeholder" />
            <span>{project._count?.tasks ?? 0}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs text-text-secondary">
        {project.endDate ? formatDate(project.endDate) : '-'}
      </td>
      <td className="px-4 py-3">
        {canEdit ? (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              id={`row-menu-${project.id}`}
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary"
              aria-label="Menu"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-40 rounded-[var(--radius-input)] border border-border bg-white py-1 shadow-xl animate-in fade-in">
                  <button onClick={() => { setMenuOpen(false); onEdit(project); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-background">
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  {project.status === 'berjalan' && (
                    <button onClick={() => { setMenuOpen(false); onClose(project); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-background">
                      <Lock className="h-3.5 w-3.5" /> Tutup Proyek
                    </button>
                  )}
                  <button onClick={() => { setMenuOpen(false); onDelete(project); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger-tint">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(project); }}
            className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-primary"
            aria-label="Buka proyek"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
  const isFinance = user?.role === 'finance';

  // ─── View & Filters ───────────────────────────────────
  const [view, setView] = useState<'card' | 'table'>('card');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCC, setFilterCC] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // ─── Modal states ─────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; project?: ProjectItem }>({ open: false });
  const [closeTarget, setCloseTarget] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);

  // ─── Queries ──────────────────────────────────────────
  const projectsQuery = useQuery({
    queryKey: ['projects', { search, filterStatus, filterDept, filterCC, page }],
    queryFn: () =>
      getProjectsApi({
        page,
        limit,
        search: search || undefined,
        status: (filterStatus as ProjectStatus) || undefined,
        departmentId: filterDept || undefined,
        costCenterId: filterCC || undefined,
      }),
  });

  const deptsQuery = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => getDepartmentsApi({ limit: 100, isActive: true }),
    enabled: !isFinance || user?.role === 'super_admin',
  });

  const ccQuery = useQuery({
    queryKey: ['cost-centers-filter', filterDept],
    queryFn: () => getCostCentersApi({ limit: 100, isActive: true, departmentId: filterDept || undefined }),
    enabled: !!filterDept || user?.role === 'super_admin' || isFinance,
  });

  // ─── Mutations ────────────────────────────────────────
  const closeMutation = useMutation({
    mutationFn: (id: string) => closeProjectApi(id),
    onSuccess: () => {
      toast('success', 'Proyek berhasil ditutup.');
      setCloseTarget(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectApi(id),
    onSuccess: () => {
      toast('success', 'Proyek berhasil dihapus.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => toast('error', extractErrorMessage(err)),
  });

  // ─── Handlers ─────────────────────────────────────────
  const handleNavigate = useCallback((p: ProjectItem) => {
    navigate(`/proyek/${p.id}`);
  }, [navigate]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterStatus = (val: string) => {
    setFilterStatus(val as ProjectStatus | '');
    setPage(1);
  };

  const handleFilterDept = (val: string) => {
    setFilterDept(val);
    setFilterCC('');
    setPage(1);
  };

  const projects = projectsQuery.data?.data ?? [];
  const meta = projectsQuery.data?.meta;
  const depts = deptsQuery.data?.data ?? [];
  const costCenters = ccQuery.data?.data ?? [];

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">Proyek</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {meta ? `${meta.total} proyek ditemukan` : 'Kelola semua proyek'}
          </p>
        </div>
        {canEdit && (
          <Button
            id="btn-ajukan-proyek"
            variant="primary"
            onClick={() => setFormModal({ open: true })}
            className="gap-2 self-start"
          >
            <Plus className="h-4 w-4" />
            Ajukan Proyek
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
          <input
            id="search-proyek"
            type="text"
            placeholder="Cari nama proyek..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => handleFilterStatus(e.target.value)}
            className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2 pl-9 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="diajukan">Diajukan</option>
            <option value="berjalan">Berjalan</option>
            <option value="ditutup">Ditutup</option>
          </select>
        </div>

        {/* Dept filter (hide for admin - fixed to own dept) */}
        {user?.role !== 'admin' && depts.length > 0 && (
          <select
            id="filter-departemen"
            value={filterDept}
            onChange={(e) => handleFilterDept(e.target.value)}
            className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
          >
            <option value="">Semua Departemen</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Cost center filter */}
        {costCenters.length > 0 && (
          <select
            id="filter-cost-center"
            value={filterCC}
            onChange={(e) => { setFilterCC(e.target.value); setPage(1); }}
            className="appearance-none rounded-[var(--radius-input)] border border-border bg-background py-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
          >
            <option value="">Semua Cost Center</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>{cc.code} · {cc.name}</option>
            ))}
          </select>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-[var(--radius-input)] border border-border bg-background p-1 ml-auto">
          <button
            id="view-card"
            onClick={() => setView('card')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              view === 'card'
                ? 'gradient-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
            aria-label="Tampilan kartu"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kartu
          </button>
          <button
            id="view-table"
            onClick={() => setView('table')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              view === 'table'
                ? 'gradient-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
            aria-label="Tampilan tabel"
          >
            <List className="h-3.5 w-3.5" />
            Tabel
          </button>
        </div>
      </div>

      {/* Loading / Error / Content */}
      {projectsQuery.isPending && (
        <div className="flex flex-col items-center justify-center py-20 text-text-placeholder">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm">Memuat proyek...</p>
        </div>
      )}
      {projectsQuery.isError && (
        <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-tint p-6 text-center text-sm text-danger">
          Gagal memuat daftar proyek. Coba muat ulang halaman.
        </div>
      )}

      {projectsQuery.isSuccess && projects.length === 0 && (
        <EmptyState
          title="Belum ada proyek"
          description={
            canEdit
              ? 'Klik "Ajukan Proyek" untuk membuat proyek pertama.'
              : 'Belum ada proyek yang dapat ditampilkan.'
          }
          icon={<FolderKanban className="h-10 w-10" />}
        />
      )}

      {/* Card View */}
      {projectsQuery.isSuccess && projects.length > 0 && view === 'card' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              canEdit={canEdit}
              onEdit={(proj) => setFormModal({ open: true, project: proj })}
              onClose={setCloseTarget}
              onDelete={setDeleteTarget}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {projectsQuery.isSuccess && projects.length > 0 && view === 'table' && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-white shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder">Nama Proyek</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder hidden md:table-cell">Cost Center</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder hidden lg:table-cell">Progres</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder hidden xl:table-cell">Tim / Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-placeholder hidden xl:table-cell">Tenggat</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  canEdit={canEdit}
                  onEdit={(proj) => setFormModal({ open: true, project: proj })}
                  onClose={setCloseTarget}
                  onDelete={setDeleteTarget}
                  onNavigate={handleNavigate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-white p-3 shadow-sm">
          <p className="text-xs text-text-secondary">
            Halaman <span className="font-semibold">{meta.page}</span> dari{' '}
            <span className="font-semibold">{meta.totalPages}</span>
            {' '}({meta.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              id="pagination-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40 hover:bg-background hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <button
              id="pagination-next"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40 hover:bg-background hover:text-text-primary transition-colors"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProjectFormModal
        open={formModal.open}
        project={formModal.project}
        departments={depts}
        costCenters={costCenters}
        allCostCenters={[]}
        onClose={() => setFormModal({ open: false })}
        onSuccess={() => {
          setFormModal({ open: false });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }}
      />

      <ConfirmDialog
        open={!!closeTarget}
        title="Tutup Proyek"
        description={`Proyek "${closeTarget?.name}" akan ditandai sebagai ditutup dan tidak dapat diubah kembali ke status berjalan. Lanjutkan?`}
        confirmLabel="Tutup Proyek"
        cancelLabel="Batal"
        variant="danger"
        loading={closeMutation.isPending}
        onConfirm={() => { if (closeTarget) closeMutation.mutate(closeTarget.id); }}
        onCancel={() => setCloseTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Proyek"
        description={`Proyek "${deleteTarget?.name}" akan dihapus secara permanen (soft delete). Proyek yang sudah memiliki transaksi tidak dapat dihapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
