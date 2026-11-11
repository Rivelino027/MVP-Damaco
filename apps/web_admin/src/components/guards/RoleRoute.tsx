import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types';

interface RoleRouteProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/akses-ditolak" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
