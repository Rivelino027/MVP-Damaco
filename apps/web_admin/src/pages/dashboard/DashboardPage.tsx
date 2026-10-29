import { useAuthStore } from '@/stores/auth';
import AdminDashboard from './AdminDashboard';
import FinanceDashboard from './FinanceDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (user?.role === 'finance') {
    return <FinanceDashboard />;
  }

  // Default for 'admin'
  return <AdminDashboard />;
}
