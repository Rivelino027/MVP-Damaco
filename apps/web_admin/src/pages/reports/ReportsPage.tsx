import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  Building2,
  Calendar,
  Clock,
} from 'lucide-react';
import { getProjectsApi } from '@/lib/api-projects';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import type { ProjectItem } from '@/types';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: res, isLoading } = useQuery({
    queryKey: ['reports-projects'],
    queryFn: () => getProjectsApi({ limit: 100 }),
  });

  const projects = res?.data || [];

  const filteredProjects = projects.filter((p: ProjectItem) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.costCenter.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter((p) => p.status === 'berjalan').length;
  const completedProjects = filteredProjects.filter((p) => p.status === 'ditutup').length;
  const proposedProjects = filteredProjects.filter((p) => p.status === 'diajukan').length;

  // CSV Export handler
  const exportToCSV = () => {
    const headers = [
      'Kode Cost Center',
      'Nama Proyek',
      'Departemen',
      'Status',
      'Progres (%)',
      'Tanggal Mulai',
      'Tanggal Selesai',
    ];
    const rows = filteredProjects.map((p) => [
      `"${p.costCenter?.code || '-'}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.department?.name || '-'}"`,
      `"${p.status}"`,
      `"${p.progressPercent || 0}"`,
      `"${p.startDate || '-'}"`,
      `"${p.endDate || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Proyek_BudgetFlow_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Laporan Operasional & Proyek</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Analitik status proyek, jadwal kerja tim, dan progres pelaksanaan proyek.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Proyek Terdata',
            value: totalProjects,
            sub: `${user?.role === 'admin' ? 'Departemen Anda' : 'Seluruh Departemen'}`,
            icon: BarChart3,
            color: 'text-text-primary',
          },
          {
            label: 'Proyek Berjalan',
            value: activeProjects,
            sub: 'Sedang dikerjakan',
            icon: Clock,
            color: 'text-[#0A47B8]',
          },
          {
            label: 'Proyek Selesai / Ditutup',
            value: completedProjects,
            sub: 'Tuntas & diarsipkan',
            icon: CheckCircle,
            color: 'text-[#48742C]',
          },
          {
            label: 'Proyek Diajukan',
            value: proposedProjects,
            sub: 'Menunggu persetujuan awal',
            icon: Calendar,
            color: 'text-[#F29D38]',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{label}</span>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            <p className={cn('font-heading text-2xl font-bold mt-2', color)}>{value}</p>
            <p className="text-[11px] text-text-placeholder mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-placeholder" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-secondary focus:border-primary focus:bg-white focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="diajukan">Diajukan</option>
            <option value="berjalan">Berjalan</option>
            <option value="ditutup">Ditutup</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Daftar Proyek & Status Pelaksanaan
          </h2>
          <span className="text-xs text-text-placeholder">{filteredProjects.length} proyek ditampilkan</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-text-placeholder mb-2" />
            <p className="text-sm font-medium text-text-primary">Tidak ada proyek yang sesuai filter</p>
            <p className="text-xs text-text-placeholder mt-0.5">Coba ubah kata kunci pencarian atau status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Kode & Nama Proyek</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progres Kerja</th>
                  <th className="py-3 px-4">Jadwal Pelaksanaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-mono text-[10px] text-text-placeholder font-semibold">
                        {p.costCenter?.code || '-'}
                      </span>
                      <p className="font-semibold text-text-primary text-sm mt-0.5">{p.name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-text-placeholder" />
                        <span>{p.department?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          p.status === 'berjalan'
                            ? 'bg-blue-50 text-[#0A47B8]'
                            : p.status === 'ditutup'
                              ? 'bg-green-50 text-[#48742C]'
                              : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {p.status === 'berjalan' ? 'Berjalan' : p.status === 'ditutup' ? 'Ditutup' : 'Diajukan'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-heading font-semibold text-text-primary">
                      {Math.round(Number(p.progressPercent) || 0)}%
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="h-3.5 w-3.5 text-text-placeholder" />
                        <span>
                          {p.startDate ? new Date(p.startDate).toLocaleDateString('id-ID') : '-'} s/d{' '}
                          {p.endDate ? new Date(p.endDate).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
