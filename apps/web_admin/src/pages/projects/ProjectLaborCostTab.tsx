import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getProjectLaborCostApi } from '@/lib/api-labor-costs';
import { LoadingState, ErrorState } from '@/components/shared';
import { formatCurrency } from '@/lib/utils';

interface ProjectLaborCostTabProps {
  projectId: string;
}

export default function ProjectLaborCostTab({ projectId }: ProjectLaborCostTabProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Month-Year calendar filter state (default: all periods / no filter)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Compute full calendar month startDate and endDate if a specific month is selected
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (selectedPeriod !== 'all') {
    const [yearStr, monthStr] = selectedPeriod.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    const lastDay = new Date(year, month, 0).getDate();
    startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const { data: laborCost, isLoading, error, refetch } = useQuery({
    queryKey: ['project-labor-cost', projectId, startDate, endDate],
    queryFn: () => getProjectLaborCostApi(projectId, { startDate, endDate }),
  });

  // Generate options for the last 12 months
  const now = new Date();
  const periodOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Seluruh Periode Proyek' },
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    periodOptions.push({ value: val, label });
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter bar */}
      <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Agregat Biaya Tenaga Kerja
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Perhitungan akumulasi jam kerja disetujui dan serapan biaya tenaga kerja proyek
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary shrink-0" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-[var(--radius-input)] border border-border bg-white px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Pilih Periode Bulan"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <LoadingState message="Memuat ringkasan biaya tenaga kerja..." />}
      {error && <ErrorState message="Gagal memuat biaya tenaga kerja" onRetry={() => refetch()} />}

      {!isLoading && !error && laborCost && (
        <div className="space-y-6">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Worker Count */}
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-text-secondary mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Pekerja Kontributor
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-tint text-navy">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-heading text-text-primary">
                {laborCost.workerCount}
                <span className="text-xs font-normal text-text-secondary ml-1.5">orang</span>
              </div>
              <p className="text-[11px] text-text-placeholder mt-1">
                Karyawan dengan timesheet disetujui pada periode ini
              </p>
            </div>

            {/* Card 2: Total Hours */}
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-text-secondary mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Jam Kerja
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-heading text-text-primary">
                {laborCost.totalHours}
                <span className="text-xs font-normal text-text-secondary ml-1.5">jam</span>
              </div>
              <p className="text-[11px] text-text-placeholder mt-1">
                Akumulasi durasi tugas yang telah disetujui
              </p>
            </div>

            {/* Card 3: Total Labor Cost */}
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-text-secondary mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Biaya Tenaga Kerja
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>

              {laborCost.isCostHidden ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs font-semibold text-text-secondary">
                    Disembunyikan
                  </span>
                  <p className="text-[11px] text-danger mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {laborCost.hiddenReason || 'Pekerja kurang dari batas minimum'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold font-heading text-text-primary">
                    {formatCurrency(laborCost.costAmount ?? laborCost.totalCost ?? 0)}
                  </div>
                  <p className="text-[11px] text-text-placeholder mt-1 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-success shrink-0" />
                    {isSuperAdmin
                      ? 'Nilai akurat (decimal precision)'
                      : 'Dibulatkan ke kelipatan Rp 100.000'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Protection Banner */}
          {laborCost.isCostHidden && (
            <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-tint p-4 text-xs text-danger flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Perlindungan Privasi Tarif Tenaga Kerja
                </strong>
                <p>
                  Sesuai kebijakan keamanan data PT. Dunia Maya Communica, nilai biaya tenaga kerja pada proyek dengan jumlah kontributor kurang dari batas minimum sistem disembunyikan agar tarif individu tidak dapat disimpulkan.
                </p>
              </div>
            </div>
          )}

          {!laborCost.isCostHidden && !isSuperAdmin && (
            <div className="rounded-[var(--radius-card)] border border-blue/20 bg-blue-tint p-4 text-xs text-navy flex items-start gap-3">
              <Info className="h-4 w-4 text-blue shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Kebijakan Pembulatan Agregat
                </strong>
                <p>
                  Untuk peran Admin dan Finance, nilai total biaya tenaga kerja dibulatkan ke kelipatan Rp 100.000 terdekat guna mencegah pelacakan tarif per jam individu pekerja.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
