import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { logoutApi } from '@/lib/api';
import { RoleBadge } from '@/components/shared';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network errors
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-md lg:px-8">
      {/* Mobile Hamburger Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-text-secondary hover:bg-background lg:hidden"
          aria-label="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-text-secondary">
          Sistem Manajemen Proyek & Anggaran
        </span>
      </div>

      {/* Right User Bar */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <span className="text-xs font-semibold text-text-primary">{user.name}</span>
            <RoleBadge role={user.role} className="text-[11px]" />
          </div>

          <button
            onClick={handleLogout}
            title="Keluar dari Akun"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-danger transition-colors hover:bg-danger-tint"
            aria-label="Keluar dari Akun"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
