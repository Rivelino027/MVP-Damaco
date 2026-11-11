import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/components/shared';
import LoginPage from '@/pages/login/LoginPage';
import ChangePasswordPage from '@/pages/change-password/ChangePasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import UserManagementPage from '@/pages/super-admin/users/UserManagementPage';
import DepartmentCostCenterPage from '@/pages/super-admin/departments/DepartmentCostCenterPage';
import MasterDataPage from '@/pages/super-admin/master-data/MasterDataPage';
import ActivityLogsPage from '@/pages/super-admin/activity-logs/ActivityLogsPage';
import ForbiddenPage from '@/pages/forbidden/ForbiddenPage';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RoleRoute } from '@/components/guards/RoleRoute';
import { SessionInitializer } from '@/components/auth/SessionInitializer';
import ProjectsPage from '@/pages/projects/ProjectsPage';
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage';
import ProjectKanbanPage from '@/pages/projects/ProjectKanbanPage';
import TimesheetsPage from '@/pages/timesheets/TimesheetsPage';
import HourlyCostsPage from '@/pages/super-admin/hourly-costs/HourlyCostsPage';
import ApprovalsInboxPage from '@/pages/approvals/ApprovalsInboxPage';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import NominalBesarPage from '@/pages/expenses/NominalBesarPage';
import BudgetRequestsPage from '@/pages/budgets/BudgetRequestsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import FinancialReportsPage from '@/pages/reports/FinancialReportsPage';
import RoleMatrixPage from '@/pages/super-admin/roles/RoleMatrixPage';
import SystemSettingsPage from '@/pages/super-admin/settings/SystemSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionInitializer>
          <Routes>
            {/* Rute Publik */}
            <Route path="/login" element={<LoginPage />} />

          {/* Rute Terproteksi Otentikasi */}
          <Route element={<ProtectedRoute />}>
            {/* Halaman Ganti Kata Sandi (bisa diakses saat mustChangePassword = true) */}
            <Route path="/ganti-kata-sandi" element={<ChangePasswordPage />} />

            {/* Layout Utama dengan Sidebar & Header */}
            <Route element={<AppLayout />}>
              {/* Dasbor (Admin, Finance, Super Admin) */}
              <Route
                path="/"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <DashboardPage />
                  </RoleRoute>
                }
              />

              {/* Menu Admin, Finance & Super Admin */}
              <Route
                path="/proyek"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <ProjectsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/proyek/:id"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <ProjectDetailPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/proyek/:id/task"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <ProjectKanbanPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/anggaran"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <BudgetRequestsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/persetujuan"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <ApprovalsInboxPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/timesheet"
                element={
                  <RoleRoute allowedRoles={['admin', 'super_admin']}>
                    <TimesheetsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/laporan"
                element={
                  <RoleRoute allowedRoles={['admin', 'super_admin']}>
                    <ReportsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/nominal-besar"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <NominalBesarPage />
                  </RoleRoute>
                }
              />

              {/* Menu Khusus Finance */}
              <Route
                path="/pembayaran"
                element={
                  <RoleRoute allowedRoles={['finance']}>
                    <PaymentsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/laporan-keuangan"
                element={
                  <RoleRoute allowedRoles={['finance']}>
                    <FinancialReportsPage />
                  </RoleRoute>
                }
              />

              {/* Menu Khusus Super Admin (Bagian Sistem) */}
              <Route
                path="/sistem/pengguna"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <UserManagementPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/peran"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <RoleMatrixPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/biaya-per-jam"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <HourlyCostsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/departemen"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <DepartmentCostCenterPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/master-data"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <MasterDataPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/log-aktivitas"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <ActivityLogsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/pengaturan"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <SystemSettingsPage />
                  </RoleRoute>
                }
              />

              {/* Halaman Akses Ditolak & Not Found */}
              <Route path="/akses-ditolak" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect to login jika belum terotentikasi */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionInitializer>
    </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}
