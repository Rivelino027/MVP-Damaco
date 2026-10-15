import { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  FileText,
  Globe,
  Layers,
  Shield,
  User,
  X,
} from 'lucide-react';
import { Button, RoleBadge } from '@/components/shared';
import { formatDateTime, sanitizeAuditData } from '@/lib/utils';
import type { ActivityLogItem } from '@/types';

interface ActivityLogDetailModalProps {
  open: boolean;
  log: ActivityLogItem | null;
  onClose: () => void;
}

export function ActivityLogDetailModal({
  open,
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  const [copiedBefore, setCopiedBefore] = useState(false);
  const [copiedAfter, setCopiedAfter] = useState(false);
  const [copiedEntityId, setCopiedEntityId] = useState(false);

  if (!open || !log) return null;

  const cleanBefore = log.beforeData ? sanitizeAuditData(log.beforeData) : null;
  const cleanAfter = log.afterData ? sanitizeAuditData(log.afterData) : null;

  const hasBefore =
    cleanBefore !== null &&
    cleanBefore !== undefined &&
    typeof cleanBefore === 'object' &&
    Object.keys(cleanBefore as object).length > 0;

  const hasAfter =
    cleanAfter !== null &&
    cleanAfter !== undefined &&
    typeof cleanAfter === 'object' &&
    Object.keys(cleanAfter as object).length > 0;

  const beforeJson = hasBefore ? JSON.stringify(cleanBefore, null, 2) : '';
  const afterJson = hasAfter ? JSON.stringify(cleanAfter, null, 2) : '';

  const handleCopy = (text: string, type: 'before' | 'after' | 'entity') => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    if (type === 'before') {
      setCopiedBefore(true);
      setTimeout(() => setCopiedBefore(false), 2000);
    } else if (type === 'after') {
      setCopiedAfter(true);
      setTimeout(() => setCopiedAfter(false), 2000);
    } else {
      setCopiedEntityId(true);
      setTimeout(() => setCopiedEntityId(false), 2000);
    }
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (
      act.includes('CREATE') ||
      act.includes('ADD') ||
      act.includes('LOGIN_SUCCESS') ||
      act.includes('REACTIVATE')
    ) {
      return 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RESET')) {
      return 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]';
    }
    if (
      act.includes('DELETE') ||
      act.includes('REMOVE') ||
      act.includes('DEACTIVATE') ||
      act.includes('LOGIN_FAILED')
    ) {
      return 'bg-[#FCE4E7] text-[#B0000F] border-[#F7C3C7]';
    }
    return 'bg-muted/70 text-text-primary border-border';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-log-detail-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-[var(--radius-card)] shadow-xl border border-border my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] bg-navy-tint text-navy">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="activity-log-detail-title"
                className="text-base font-bold text-text-primary"
              >
                Detail Log Aktivitas
              </h2>
              <p className="text-xs text-text-secondary">
                ID Log: <span className="font-mono">{log.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-input)] p-1.5 text-text-secondary hover:bg-muted hover:text-text-primary transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-[var(--radius-card)] bg-background border border-border">
            {/* Pelaku */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">Pelaku</span>
              </div>
              {log.user ? (
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {log.user.name}
                  </div>
                  <div className="text-xs text-text-secondary mb-1.5">
                    {log.user.email}
                  </div>
                  <RoleBadge role={log.user.role} className="text-[10px] px-2 py-0.5" />
                </div>
              ) : (
                <div className="text-sm font-medium text-text-secondary italic">
                  Sistem / Anonim
                </div>
              )}
            </div>

            {/* Waktu */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Waktu Eksekusi</span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {formatDateTime(log.createdAt)}
              </div>
              <div className="text-[11px] text-text-secondary font-mono mt-0.5">
                {log.createdAt}
              </div>
            </div>

            {/* Modul & Aksi */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span className="font-medium">Modul & Aksi</span>
              </div>
              <div className="text-xs font-semibold text-text-primary mb-1">
                {log.module}
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getActionBadgeClass(
                  log.action,
                )}`}
              >
                {log.action}
              </span>
            </div>

            {/* ID Entitas */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">ID Entitas Target</span>
              </div>
              {log.entityId ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-primary bg-white px-2 py-1 rounded border border-border">
                    {log.entityId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(log.entityId!, 'entity')}
                    className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-muted"
                    title="Salin ID Entitas"
                  >
                    {copiedEntityId ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-text-secondary italic">-</span>
              )}
            </div>

            {/* IP Address */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
                <Globe className="h-3.5 w-3.5" />
                <span className="font-medium">Alamat IP</span>
              </div>
              <span className="text-xs font-mono text-text-primary">
                {log.ipAddress || '-'}
              </span>
            </div>
          </div>

          {/* Audit Diff: Sebelum & Sesudah */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">
              Perubahan Data (Audit Diff)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sebelum */}
              <div className="flex flex-col border border-border rounded-[var(--radius-card)] overflow-hidden bg-white">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-background border-b border-border">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Sebelum Perubahan (Before)
                  </span>
                  {hasBefore && (
                    <button
                      type="button"
                      onClick={() => handleCopy(beforeJson, 'before')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text-primary py-0.5 px-1.5 rounded hover:bg-muted"
                    >
                      {copiedBefore ? (
                        <>
                          <Check className="h-3 w-3 text-success" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Salin JSON</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="p-3 flex-1 min-h-[160px] max-h-[360px] overflow-auto">
                  {hasBefore ? (
                    <pre className="text-xs font-mono text-text-primary whitespace-pre leading-relaxed">
                      {beforeJson}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-text-secondary italic bg-background/40 rounded">
                      Data baru dibuat (tidak ada riwayat sebelumnya)
                    </div>
                  )}
                </div>
              </div>

              {/* Sesudah */}
              <div className="flex flex-col border border-border rounded-[var(--radius-card)] overflow-hidden bg-white">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-background border-b border-border">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Sesudah Perubahan (After)
                  </span>
                  {hasAfter && (
                    <button
                      type="button"
                      onClick={() => handleCopy(afterJson, 'after')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text-primary py-0.5 px-1.5 rounded hover:bg-muted"
                    >
                      {copiedAfter ? (
                        <>
                          <Check className="h-3 w-3 text-success" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Salin JSON</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="p-3 flex-1 min-h-[160px] max-h-[360px] overflow-auto">
                  {hasAfter ? (
                    <pre className="text-xs font-mono text-text-primary whitespace-pre leading-relaxed">
                      {afterJson}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-text-secondary italic bg-background/40 rounded">
                      Data dihapus (tidak ada riwayat sesudahnya)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Catatan Keamanan */}
          <div className="flex items-start gap-3 p-3 rounded-[var(--radius-input)] bg-navy-tint/40 border border-navy/20">
            <Shield className="h-4 w-4 text-navy shrink-0 mt-0.5" />
            <div className="text-xs text-navy leading-normal">
              <span className="font-semibold">Catatan Kepatuhan & Keamanan:</span> Seluruh
              log aktivitas tersimpan dalam tabel append-only tanpa izin modifikasi atau
              penghapusan. Nilai sensitif seperti kata sandi dan token otomatis disaring.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-border bg-background/50">
          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
