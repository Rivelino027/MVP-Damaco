import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute() {
  const { isAuthenticated, mustChangePassword, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pengguna role is strictly blocked from Web Admin
  if (user.role === 'pengguna') {
    return <Navigate to="/akses-ditolak" replace />;
  }

  // Jika akun diwajibkan ganti password dan belum di halaman ganti kata sandi
  if (mustChangePassword && location.pathname !== '/ganti-kata-sandi') {
    return <Navigate to="/ganti-kata-sandi" replace />;
  }

  return <Outlet />;
}
