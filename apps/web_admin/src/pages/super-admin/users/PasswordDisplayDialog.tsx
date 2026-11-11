import { useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, X } from 'lucide-react';
import { Button } from '@/components/shared';

interface PasswordDisplayDialogProps {
  open: boolean;
  userName: string;
  userEmail: string;
  password: string | null;
  type: 'initial' | 'reset';
  onClose: () => void;
}

export function PasswordDisplayDialog({
  open,
  userName,
  userEmail,
  password,
  type,
  onClose,
}: PasswordDisplayDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open || !password) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback jika clipboard API gagal
      const textarea = document.createElement('textarea');
      textarea.value = password;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-darkest/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Body */}
      <div className="relative z-10 w-full max-w-lg rounded-[var(--radius-card-lg)] bg-surface p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-tint text-navy">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 id="password-dialog-title" className="text-lg font-bold text-text-primary">
              {type === 'initial' ? 'Kata Sandi Akun Baru' : 'Kata Sandi Sementara'}
            </h2>
            <p className="text-xs text-text-secondary">
              Akun: <span className="font-semibold text-text-primary">{userName}</span> ({userEmail})
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-5 rounded-[var(--radius-card)] bg-warning-tint border border-warning/30 p-3.5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-warning-text-strong font-medium">
            <span className="font-bold">Peringatan Keamanan:</span> Catat sekarang, tidak akan
            ditampilkan lagi. Kata sandi ini hanya ditampilkan satu kali dan tidak akan disimpan di
            layar setelah dialog ditutup.
          </div>
        </div>

        {/* Password Display Box */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            {type === 'initial' ? 'Kata Sandi Otomatis' : 'Kata Sandi Sementara'}
          </label>
          <div className="flex items-center justify-between rounded-[var(--radius-input)] border-2 border-primary/30 bg-background px-4 py-3">
            <code
              data-testid="generated-password"
              className="font-mono text-base font-bold tracking-wider text-primary select-all break-all"
            >
              {password}
            </code>
            <Button
              type="button"
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleCopy}
              className="ml-3 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Salin</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Additional instructions */}
        <p className="mb-6 text-xs text-text-secondary leading-relaxed">
          {type === 'reset'
            ? 'Pengguna wajib mengganti kata sandi ini saat pertama kali masuk ke sistem. Seluruh sesi aktif sebelumnya telah dicabut.'
            : 'Berikan kata sandi ini kepada pengguna secara aman. Pengguna disarankan untuk segera mengubah kata sandi setelah masuk.'}
        </p>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="primary" onClick={onClose}>
            Saya Sudah Mencatat & Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
