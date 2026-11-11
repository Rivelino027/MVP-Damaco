import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared';

interface RejectTimesheetModalProps {
  isOpen: boolean;
  timesheetId: string;
  workerName: string;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

export default function RejectTimesheetModal({
  isOpen,
  timesheetId,
  workerName,
  onClose,
  onConfirm,
  isLoading,
}: RejectTimesheetModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }
    setError('');
    await onConfirm(timesheetId, reason.trim());
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-1.5 text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-tint border border-danger/20 text-danger">
            <X className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-text-primary tracking-tight">
              Tolak Timesheet
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Pekerja: <span className="font-semibold text-text-primary">{workerName}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reject-reason"
              className="block text-xs font-semibold text-text-primary mb-1.5"
            >
              Alasan Penolakan <span className="text-danger">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Jelaskan alasan mengapa timesheet ini ditolak..."
              className="w-full rounded-xl border border-border bg-slate-50/50 p-3 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              disabled={isLoading}
            />
            {error && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="reject"
              size="md"
              rejectIcon
              disabled={isLoading}
            >
              {isLoading ? 'Menolak...' : 'Tolak Timesheet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
