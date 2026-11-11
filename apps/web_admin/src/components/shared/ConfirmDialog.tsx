import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  loading: externalLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading ?? internalLoading;

  if (!open) return null;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-darkest/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-[var(--radius-card-lg)] bg-surface p-6 shadow-2xl">
        {variant === 'danger' && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-tint">
            <AlertTriangle className="h-6 w-6 text-danger" />
          </div>
        )}
        <h3 className="mb-2 text-lg font-bold text-text-primary">{title}</h3>
        <p className="mb-6 text-sm text-text-secondary">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'reject' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            rejectIcon={variant === 'danger'}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
