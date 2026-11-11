import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  CheckSquare,
  Clock,
  BarChart3,
  Flag,
  CreditCard,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  Building2,
  Database,
  History,
  Settings,
  KeyRound,
  LogOut,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { logoutApi } from '@/lib/api';
import { RoleBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dasbor', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Proyek', to: '/proyek', icon: FolderKanban },
  { label: 'Anggaran', to: '/anggaran', icon: Wallet },
  { label: 'Persetujuan', to: '/persetujuan', icon: CheckSquare },
  { label: 'Timesheet Tim', to: '/timesheet', icon: Clock },
  { label: 'Laporan', to: '/laporan', icon: BarChart3 },
  { label: 'Nominal Besar', to: '/nominal-besar', icon: Flag },
];

const FINANCE_NAV_ITEMS: NavItem[] = [
  { label: 'Dasbor', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Proyek', to: '/proyek', icon: FolderKanban },
  { label: 'Persetujuan', to: '/persetujuan', icon: CheckSquare },
  { label: 'Pembayaran', to: '/pembayaran', icon: CreditCard },
  { label: 'Anggaran', to: '/anggaran', icon: Wallet },
  { label: 'Laporan Keuangan', to: '/laporan-keuangan', icon: TrendingUp },
  { label: 'Nominal Besar', to: '/nominal-besar', icon: Flag },
];

const SYSTEM_NAV_ITEMS: NavItem[] = [
  { label: 'Manajemen Pengguna', to: '/sistem/pengguna', icon: Users },
  { label: 'Peran & Akses', to: '/sistem/peran', icon: Shield },
  { label: 'Biaya per Jam', to: '/sistem/biaya-per-jam', icon: DollarSign },
  { label: 'Departemen & Cost Center', to: '/sistem/departemen', icon: Building2 },
  { label: 'Master Data', to: '/sistem/master-data', icon: Database },
  { label: 'Log Aktivitas', to: '/sistem/log-aktivitas', icon: History },
  { label: 'Pengaturan Sistem', to: '/sistem/pengaturan', icon: Settings },
];

function getNavItemsByRole(role: Role): { main: NavItem[]; system?: NavItem[] } {
  switch (role) {
    case 'finance':
      return { main: FINANCE_NAV_ITEMS };
    case 'super_admin':
      return {
        main: ADMIN_NAV_ITEMS,
        system: SYSTEM_NAV_ITEMS,
      };
    case 'admin':
    default:
      return { main: ADMIN_NAV_ITEMS };
  }
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const { main, system } = getNavItemsByRole(user.role);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Abaikan bila request network gagal
    }
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-[var(--radius-pill)] px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200',
      isActive
        ? 'gradient-primary text-white shadow-[0_4px_15px_rgba(232,20,28,0.35)] font-semibold'
        : 'text-slate-400 hover:bg-white/10 hover:text-white',
    );

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container (Dark Enterprise Workspace Theme) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#1E293B] bg-[#0B0F19] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-md border border-white/20 p-1.5 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-black tracking-tight text-white">
                Budget<span className="text-primary-bright">Flow</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80">
                ENTERPRISE WORKSPACE
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Menu Utama
            </div>
            {main.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  className={navLinkClass}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Bagian Sistem untuk Super Admin */}
          {system && (
            <div className="mt-6 space-y-1 border-t border-white/10 pt-5">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Sistem
              </div>
              {system.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={navLinkClass}
                  >
                    <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile Menu Bottom */}
        <div className="relative border-t border-white/10 p-4">
          {/* Popover Menu Profil */}
          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute bottom-full left-4 right-4 z-20 mb-2 rounded-2xl border border-slate-700 bg-[#161F32] p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 text-white">
                <div className="border-b border-white/10 pb-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.email}
                  </p>
                  <div className="mt-2">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onCloseMobile?.();
                      navigate('/ganti-kata-sandi');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    Ubah Kata Sandi
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onCloseMobile?.();
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-danger hover:bg-danger-tint cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-danger" />
                    Keluar dari Akun
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Trigger button for profile */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-xs font-bold text-white shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.name}
                </p>
                <div className="mt-0.5">
                  <RoleBadge role={user.role} className="px-2 py-0.5 text-[10px]" />
                </div>
              </div>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                profileOpen && 'rotate-180',
              )}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
