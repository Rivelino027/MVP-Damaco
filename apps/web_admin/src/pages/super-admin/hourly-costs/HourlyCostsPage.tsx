import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Plus,
  Search,
  History,
  Edit,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getHourlyCostsApi, createHourlyCostApi } from '@/lib/api-hourly-costs';
import {
  Button,
  RoleBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  toast,
} from '@/components/shared';
import { formatDate, formatCurrency, extractErrorMessage } from '@/lib/utils';
import HourlyCostFormModal from './HourlyCostFormModal';
import HourlyCostHistoryModal from './HourlyCostHistoryModal';
import type { CreateHourlyCostPayload, HourlyCost } from '@/types';

export default function HourlyCostsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUserForNewRate, setSelectedUserForNewRate] = useState<string | undefined>(undefined);
  const [historyModalData, setHistoryModalData] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
  });

  // Query hourly costs
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hourly-costs-list'],
    queryFn: () => getHourlyCostsApi({ limit: 100 }),
    enabled: isSuperAdmin,
  });

  // Mutation to create/update hourly cost
  const createMutation = useMutation({
    mutationFn: (payload: CreateHourlyCostPayload) => createHourlyCostApi(payload),
    onSuccess: () => {
      toast.success('Tarif per jam berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['hourly-costs-list'] });
      queryClient.invalidateQueries({ queryKey: ['hourly-cost-history'] });
      setIsFormModalOpen(false);
      setSelectedUserForNewRate(undefined);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Gagal menyimpan tarif per jam'));
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-danger mx-auto mb-3" />
        <h2 className="text-lg font-bold text-text-primary">Akses Ditolak</h2>
        <p className="text-xs text-text-secondary mt-1">
          Hanya Super Admin yang memiliki hak akses untuk mengelola tarif biaya per jam.
        </p>
      </div>
    );
  }

  // Deduplicate and get the latest rate per user from the list
  const allCosts = data?.data ?? [];
  const latestCostsByUser = new Map<string, HourlyCost>();
  for (const item of allCosts) {
    if (!latestCostsByUser.has(item.userId)) {
      latestCostsByUser.set(item.userId, item);
    }
  }
  const displayItems = Array.from(latestCostsByUser.values());

  const filteredItems = searchTerm.trim()
    ? displayItems.filter(
        (c) =>
          c.user?.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          c.user?.email.toLowerCase().includes(searchTerm.toLowerCase().trim()),
      )
    : displayItems;

  const handleOpenHistory = (userId: string, userName: string) => {
    setHistoryModalData({
      isOpen: true,
      userId,
      userName,
    });
  };

  const handleOpenEditRate = (userId: string) => {
    setSelectedUserForNewRate(userId);
    setIsFormModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Biaya per Jam
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                Khusus Super Admin
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Kelola tarif dasar per jam karyawan untuk perhitungan snapshot biaya tenaga kerja
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedUserForNewRate(undefined);
            setIsFormModalOpen(true);
          }}
          className="self-start sm:self-auto rounded-xl shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Tetapkan Tarif Baru
        </Button>
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Karyawan Bertarif Card */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Karyawan Bertarif</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Snapshot Aktif
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold text-text-primary tracking-tight">
              {displayItems.length}
            </span>
            <span className="text-xs text-text-placeholder">tarif terkonfigurasi</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Sesuai Aturan Bisnis #3</span>
            <span className="text-purple-600 font-medium">Kerahasiaan Tinggi</span>
          </div>
        </div>

        {/* Card 2: Snapshot Non-Retroaktif */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Mekanisme Snapshot</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue">
              <History className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-sm font-bold text-text-primary">Non-Retroaktif</span>
            <p className="text-xs text-text-placeholder mt-0.5">Perubahan tarif hanya berlaku untuk timesheet mendatang</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue font-medium">
            <span>Histori Masa Lalu Terkunci</span>
          </div>
        </div>

        {/* Card 3: Pembatasan Scope */}
        <div className="rounded-2xl bg-white p-4 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Isolasi Server</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#48742C]">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-sm font-bold text-text-primary">Admin & Finance Agregat</span>
            <p className="text-xs text-text-placeholder mt-0.5">Backend menyembunyikan nominal per individu</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#48742C] font-medium">
            <span>Perlindungan Guard Backend</span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="rounded-[var(--radius-card)] border border-blue/20 bg-blue-tint p-4 text-xs text-navy flex items-start gap-3">
        <DollarSign className="h-4 w-4 text-blue shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Informasi Keamanan & Snapshot Biaya</strong>
          <p>
            Tarif per jam hanya dapat diakses dan diubah oleh Super Admin. Setiap kali timesheet disetujui, tarif yang berlaku pada saat itu akan di-snapshot ke dalam entri timesheet. Perubahan tarif baru tidak akan mengubah riwayat biaya masa lalu.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama karyawan atau email..."
            className="w-full rounded-[var(--radius-input)] border border-border bg-white pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-[var(--radius-card)] border border-border bg-white shadow-xs overflow-hidden">
        {isLoading && <LoadingState message="Memuat daftar tarif per jam..." />}
        {error && <ErrorState message="Gagal memuat tarif per jam" onRetry={() => refetch()} />}

        {!isLoading && !error && filteredItems.length === 0 && (
          <EmptyState
            title="Belum Ada Tarif per Jam"
            description={
              searchTerm
                ? 'Tidak ditemukan tarif karyawan yang sesuai dengan kata kunci pencarian.'
                : 'Belum ada tarif per jam yang ditetapkan untuk karyawan mana pun.'
            }
            icon={<DollarSign className="h-8 w-8 text-text-placeholder" />}
          />
        )}

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#FBF7F7] border-b border-border text-xs text-text-secondary font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Tarif Aktif</th>
                  <th className="py-3 px-4">Berlaku Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">
                        {item.user?.name ?? 'Tanpa Nama'}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {item.user?.email ?? '-'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.user?.role ? (
                        <RoleBadge role={item.user.role} />
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-heading font-bold text-text-primary">
                        {formatCurrency(item.ratePerHour)}
                      </span>
                      <span className="text-xs text-text-secondary"> / jam</span>
                    </td>

                    <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap text-xs">
                      {formatDate(item.effectiveFrom)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            handleOpenHistory(item.userId, item.user?.name ?? 'Karyawan')
                          }
                          className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-neutral-50 transition-colors"
                          title="Lihat Riwayat Tarif"
                        >
                          <History className="h-3.5 w-3.5 text-text-secondary" />
                          Riwayat
                        </button>
                        <button
                          onClick={() => handleOpenEditRate(item.userId)}
                          className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-tint transition-colors"
                          title="Perbarui Tarif"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Perbarui
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <HourlyCostFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedUserForNewRate(undefined);
        }}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isLoading={createMutation.isPending}
        preselectedUserId={selectedUserForNewRate}
      />

      <HourlyCostHistoryModal
        isOpen={historyModalData.isOpen}
        userId={historyModalData.userId}
        userName={historyModalData.userName}
        onClose={() =>
          setHistoryModalData({ isOpen: false, userId: null, userName: '' })
        }
      />
    </div>
  );
}
