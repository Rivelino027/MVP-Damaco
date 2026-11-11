import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, Bell, BellOff, KeyRound, ChevronDown } from 'lucide-react';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:px-8">
      {/* Mobile Hamburger Button & Portal Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-text-secondary hover:bg-background lg:hidden cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-slate-800">
            PT. Dunia Maya Communica
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline text-xs font-medium text-slate-500">
            Sistem Manajemen Proyek & Anggaran
          </span>
        </div>
      </div>

      {/* Right User Bar */}
      {user && (
        <div className="flex items-center gap-3">
          {/* Notifications Button & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileOpen(false);
              }}
              title="Notifikasi"
              aria-label="Notifikasi"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            >
              <Bell className="h-4 w-4" />
            </button>

            {notificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <h3 className="font-heading text-sm font-bold text-text-primary">Notifikasi</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-text-placeholder">
                    0 Baru
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border mb-2.5 text-text-placeholder">
                    <BellOff className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">Notifikasi belum tersedia</p>
                  <p className="text-[11px] text-text-secondary mt-1 max-w-[220px]">
                    Layanan backend untuk notifikasi in-app dan push belum diimplementasikan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-full border border-border bg-white p-1 pr-3 transition-colors hover:bg-background"
              aria-label="Menu Profil"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex sm:items-center sm:gap-2 text-left">
                <span className="text-xs font-semibold text-text-primary max-w-[120px] truncate">
                  {user.name}
                </span>
                <RoleBadge role={user.role} className="text-[10px] px-2 py-0.5" />
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-text-placeholder" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="border-b border-border/60 pb-3 px-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                  <p className="truncate text-xs text-text-placeholder">{user.email}</p>
                  <div className="mt-2">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/ganti-kata-sandi');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
                  >
                    <KeyRound className="h-4 w-4 text-text-placeholder" />
                    Ubah Kata Sandi
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#B0000F] hover:bg-[#FCE4E7] transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-[#B0000F]" />
                    Keluar dari Akun
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
