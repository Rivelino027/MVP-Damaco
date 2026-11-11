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
import { cn, extractErrorMessage } from '@/lib/utils';
import { ErrorState } from '@/components/shared';
import type { ProjectItem } from '@/types';

function getProjectReportFilename(): string {
  return `Laporan_Proyek_BudgetFlow_${new Date().toISOString().slice(0, 10)}.csv`;
}

const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const { data: res, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports-projects'],
    queryFn: () => getProjectsApi({ limit: 100 }),
  });

  const projects = res?.data || [];

  const filteredProjects = projects.filter((p: ProjectItem) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.costCenter?.code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;

    // Filter bulan kalender penuh berdasarkan startDate atau createdAt
    let matchMonth = true;
    if (selectedMonth !== 'all' && p.startDate) {
      const d = new Date(p.startDate);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const yStr = String(d.getFullYear());
      matchMonth = mStr === selectedMonth && yStr === selectedYear;
    } else if (selectedYear && p.startDate) {
      const d = new Date(p.startDate);
      matchMonth = String(d.getFullYear()) === selectedYear;
    }

    return matchSearch && matchStatus && matchMonth;
  });

  // Calculate statistics
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter((p) => p.status === 'berjalan').length;
  const completedProjects = filteredProjects.filter((p) => p.status === 'ditutup').length;
  const proposedProjects = filteredProjects.filter((p) => p.status === 'diajukan').length;

  // CSV Export handler (Tanpa data per orang)
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
      getProjectReportFilename()
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Laporan Operasional & Proyek
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Status Pelaksanaan
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Analitik status proyek, jadwal kerja tim, dan progres pelaksanaan proyek.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Terdata Card */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Terdata</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Portofolio
            </span>
          </div>
          <div className="mt-2">
            <p className="font-heading text-3xl font-extrabold tracking-tight text-text-primary">{totalProjects}</p>
            <p className="text-xs text-text-placeholder mt-0.5">{user?.role === 'admin' ? 'Departemen Anda' : 'Seluruh Departemen'}</p>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Pelaksanaan Proyek</span>
            <span className="text-emerald-700 font-medium">Aktif</span>
          </div>
        </div>

        {/* Proyek Berjalan */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider">Proyek Berjalan</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-blue-600 mt-2">{activeProjects}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 font-medium pt-2 border-t border-border/60">
            <span>Sedang dikerjakan</span>
          </div>
        </div>

        {/* Proyek Selesai */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider">Proyek Selesai / Ditutup</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#48742C]">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-[#48742C] mt-2">{completedProjects}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#48742C] font-medium pt-2 border-t border-border/60">
            <span>Tuntas & diarsipkan</span>
          </div>
        </div>

        {/* Proyek Diajukan */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider">Proyek Diajukan</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#F29D38]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-[#8A550F] mt-2">{proposedProjects}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8A550F] font-medium pt-2 border-t border-border/60">
            <span>Menunggu persetujuan awal</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar: Added Full Calendar Month Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Bulan Kalender Penuh */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-text-placeholder" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-secondary focus:border-primary focus:bg-white focus:outline-none"
              aria-label="Filter Bulan"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-secondary focus:border-primary focus:bg-white focus:outline-none"
              aria-label="Filter Tahun"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-text-placeholder" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-secondary focus:border-primary focus:bg-white focus:outline-none"
              aria-label="Filter Status"
            >
              <option value="all">Semua Status</option>
              <option value="diajukan">Diajukan</option>
              <option value="berjalan">Berjalan</option>
              <option value="ditutup">Ditutup</option>
            </select>
          </div>
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
        ) : isError ? (
          <div className="py-8">
            <ErrorState
              message={extractErrorMessage(error, 'Gagal memuat data laporan operasional')}
              onRetry={() => refetch()}
            />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-text-placeholder mb-2" />
            <p className="text-sm font-medium text-text-primary">Tidak ada proyek yang sesuai filter</p>
            <p className="text-xs text-text-placeholder mt-0.5">Coba ubah kata kunci pencarian atau filter bulan/status.</p>
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
