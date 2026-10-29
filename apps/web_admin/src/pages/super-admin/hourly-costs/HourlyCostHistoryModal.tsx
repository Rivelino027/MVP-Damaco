import { useQuery } from '@tanstack/react-query';
import { X, History, Calendar } from 'lucide-react';
import { getUserHourlyCostHistoryApi } from '@/lib/api-hourly-costs';
import { Button, LoadingState, ErrorState } from '@/components/shared';
import { formatDate, formatCurrency } from '@/lib/utils';

interface HourlyCostHistoryModalProps {
  isOpen: boolean;
  userId: string | null;
  userName: string;
  onClose: () => void;
}

export default function HourlyCostHistoryModal({
  isOpen,
  userId,
  userName,
  onClose,
}: HourlyCostHistoryModalProps) {
  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['hourly-cost-history', userId],
    queryFn: () => getUserHourlyCostHistoryApi(userId!),
    enabled: isOpen && !!userId,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-white shadow-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-navy">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-text-primary">
                Riwayat Tarif per Jam
              </h3>
              <p className="text-xs text-text-secondary">
                Pengguna: <strong className="text-text-primary">{userName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <LoadingState message="Memuat riwayat tarif..." />}
          {error && <ErrorState message="Gagal memuat riwayat tarif" onRetry={() => refetch()} />}

          {!isLoading && !error && (!history || history.length === 0) && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-xs text-text-placeholder">
              Belum ada riwayat penetapan tarif untuk pengguna ini.
            </div>
          )}

          {!isLoading && !error && history && history.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Daftar penetapan tarif per jam yang berlaku dan tercatat di sistem:
              </p>

              <div className="relative border-l-2 border-border ml-3.5 space-y-6 py-1">
                {history.map((item, index) => {
                  const isLatest = index === 0;

                  return (
                    <div key={item.id} className="relative pl-6">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-xs ${
                          isLatest ? 'bg-primary ring-2 ring-primary/20' : 'bg-border'
                        }`}
                      />

                      <div className="rounded-[var(--radius-card)] border border-border bg-[#FBF7F7] p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-base font-bold text-text-primary">
                            {formatCurrency(item.ratePerHour)}
                            <span className="text-xs font-normal text-text-secondary"> / jam</span>
                          </span>
                          {isLatest && (
                            <span className="rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[11px] font-semibold text-success">
                              Tarif Terkini
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Berlaku efektif sejak:</span>
                          <strong className="text-text-primary font-medium">
                            {formatDate(item.effectiveFrom)}
                          </strong>
                        </div>

                        <div className="text-[11px] text-text-placeholder pt-1 border-t border-border/50">
                          Dicatat pada: {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 bg-[#FBF7F7] flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
