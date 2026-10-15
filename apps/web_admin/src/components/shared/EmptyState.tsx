import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Tidak ada data',
  description = 'Belum ada data yang tersedia saat ini.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 rounded-full bg-background p-4">
        {icon ?? <Inbox className="h-10 w-10 text-text-placeholder" />}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-text-secondary">{description}</p>
      {action}
    </div>
  );
}
