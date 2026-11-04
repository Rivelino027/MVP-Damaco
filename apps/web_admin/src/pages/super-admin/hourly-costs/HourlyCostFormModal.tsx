import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, DollarSign, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';
import { getUsersApi } from '@/lib/api-super-admin';
import { Button } from '@/components/shared';
import type { CreateHourlyCostPayload } from '@/types';

interface HourlyCostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateHourlyCostPayload) => Promise<void>;
  isLoading: boolean;
  preselectedUserId?: string;
}

function getInitialEffectiveDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function HourlyCostFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  preselectedUserId,
}: HourlyCostFormModalProps) {
  const [userId, setUserId] = useState(preselectedUserId ?? '');
  const [ratePerHour, setRatePerHour] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(getInitialEffectiveDate);
  const [error, setError] = useState('');

  // Fetch users for the dropdown
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['super-admin-users-list-for-rate'],
    queryFn: () => getUsersApi({ limit: 100 }),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Pilih pengguna terlebih dahulu');
      return;
    }
    const rateNum = Number(ratePerHour);
    if (!rateNum || rateNum <= 0) {
      setError('Tarif per jam harus berupa angka lebih besar dari 0');
      return;
    }
    if (!effectiveFrom) {
      setError('Tanggal berlaku efektif wajib diisi');
      return;
    }

    setError('');
    await onSubmit({
      userId,
      ratePerHour: rateNum,
      effectiveFrom,
    });
  };

  const users = usersData?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] border border-border bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-tint border border-primary/20 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-text-primary">
                Tetapkan Tarif per Jam
              </h3>
              <p className="text-xs text-text-secondary">
                Atur biaya per jam karyawan untuk perhitungan snapshot timesheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-1 text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-tint p-3 text-xs text-danger flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select User */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-text-secondary" />
              Pengguna / Karyawan <span className="text-danger">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading || isLoadingUsers || !!preselectedUserId}
              className="w-full rounded-[var(--radius-input)] border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:bg-neutral-100"
            >
              <option value="">-- Pilih Karyawan --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Rate Input */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-text-secondary" />
              Tarif per Jam (Rupiah) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">
                Rp
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={ratePerHour}
                onChange={(e) => setRatePerHour(e.target.value)}
                placeholder="Contoh: 100000"
                disabled={isLoading}
                className="w-full rounded-[var(--radius-input)] border border-border bg-white pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="text-[11px] text-text-placeholder mt-1">
              Biaya per jam akan berlaku untuk timesheet yang disetujui setelah tanggal efektif.
            </p>
          </div>

          {/* Effective From Date */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-secondary" />
              Berlaku Efektif Sejak <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-[var(--radius-input)] border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Tarif'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
