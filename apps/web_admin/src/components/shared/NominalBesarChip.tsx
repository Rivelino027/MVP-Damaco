import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NominalBesarChipProps {
  className?: string;
}

export function NominalBesarChip({ className }: NominalBesarChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-warning-strong/20 bg-warning-tint px-3 py-1 text-xs font-semibold text-warning-text-strong',
        className,
      )}
    >
      <Flag className="h-3.5 w-3.5" />
      Nominal Besar
    </span>
  );
}
