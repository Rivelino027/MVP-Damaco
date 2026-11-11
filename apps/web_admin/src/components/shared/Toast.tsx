import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerToastListener, type Toast, type ToastType } from './toast-utils';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning-strong" />,
  info: <Info className="h-5 w-5 text-blue" />,
};

const BG_STYLES: Record<ToastType, string> = {
  success: 'bg-success/5 border-success/20',
  error: 'bg-danger-tint border-danger/20',
  warning: 'bg-warning-tint border-warning-strong/20',
  info: 'bg-blue-tint border-blue/20',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    registerToastListener(addToast);
    return () => {
      registerToastListener(null);
    };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-[var(--radius-card)] border p-4 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right',
            'min-w-[320px] max-w-[420px]',
            BG_STYLES[t.type],
          )}
        >
          <div className="mt-0.5 shrink-0">{ICONS[t.type]}</div>
          <p className="flex-1 text-sm font-medium text-text-primary">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 rounded-full p-1 hover:bg-darkest/5"
          >
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      ))}
    </div>
  );
}
