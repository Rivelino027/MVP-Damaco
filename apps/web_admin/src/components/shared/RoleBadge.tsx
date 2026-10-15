import { cn } from '@/lib/utils';
import type { Role } from '@/types';

const ROLE_STYLES: Record<Role, { bg: string; text: string; label: string }> = {
  pengguna: { bg: 'bg-blue-tint', text: 'text-navy', label: 'Pengguna' },
  admin: { bg: 'bg-warning-tint', text: 'text-warning-text-strong', label: 'Admin' },
  finance: { bg: 'bg-success', text: 'text-white', label: 'Finance' },
  super_admin: { bg: 'bg-navy', text: 'text-white', label: 'Super Admin' },
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style = ROLE_STYLES[role];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold',
        style.bg,
        style.text,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
