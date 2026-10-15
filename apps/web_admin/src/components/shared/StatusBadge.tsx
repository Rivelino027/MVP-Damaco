import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  CircleDot,
} from 'lucide-react';
import type { ReactNode } from 'react';

type StatusType =
  | 'draft'
  | 'menunggu'
  | 'disetujui'
  | 'ditolak'
  | 'dibayar'
  | 'selesai'
  | 'berjalan'
  | 'error';

const STATUS_CONFIG: Record<
  StatusType,
  { bg: string; text: string; border: string; icon: ReactNode; label: string }
> = {
  draft: {
    bg: 'bg-blue-tint',
    text: 'text-navy',
    border: 'border-blue/20',
    icon: <FileText className="h-3.5 w-3.5" />,
    label: 'Draft',
  },
  menunggu: {
    bg: 'bg-blue-tint',
    text: 'text-blue',
    border: 'border-blue/20',
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Menunggu',
  },
  disetujui: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Disetujui',
  },
  ditolak: {
    bg: 'bg-danger-tint',
    text: 'text-danger',
    border: 'border-danger/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Ditolak',
  },
  dibayar: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Dibayar',
  },
  selesai: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Selesai',
  },
  berjalan: {
    bg: 'bg-primary-tint',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    icon: <CircleDot className="h-3.5 w-3.5" />,
    label: 'Berjalan',
  },
  error: {
    bg: 'bg-danger-tint',
    text: 'text-danger',
    border: 'border-danger/20',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: 'Error',
  },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-semibold',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {config.icon}
      {label ?? config.label}
    </span>
  );
}

export type { StatusType };
