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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <DollarSign className="h-6 w-6 text-primary" />
            Biaya per Jam (Hourly Costs)
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Kelola tarif dasar per jam karyawan untuk perhitungan snapshot biaya tenaga kerja
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedUserForNewRate(undefined);
            setIsFormModalOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Tetapkan Tarif Baru
        </Button>
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
