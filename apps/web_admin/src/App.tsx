import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/components/shared';
import LoginPage from '@/pages/login/LoginPage';
import ChangePasswordPage from '@/pages/change-password/ChangePasswordPage';
import PlaceholderPage from '@/pages/placeholder/PlaceholderPage';
import UserManagementPage from '@/pages/super-admin/users/UserManagementPage';
import ForbiddenPage from '@/pages/forbidden/ForbiddenPage';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RoleRoute } from '@/components/guards/RoleRoute';
import { SessionInitializer } from '@/components/auth/SessionInitializer';

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
                    <PlaceholderPage title="Dasbor" category="Ringkasan" />
                  </RoleRoute>
                }
              />

              {/* Menu Admin & Super Admin */}
              <Route
                path="/proyek"
                element={
                  <RoleRoute allowedRoles={['admin', 'super_admin']}>
                    <PlaceholderPage title="Proyek" category="Manajemen Proyek" />
                  </RoleRoute>
                }
              />
              <Route
                path="/anggaran"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <PlaceholderPage title="Anggaran" category="Keuangan" />
                  </RoleRoute>
                }
              />
              <Route
                path="/persetujuan"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <PlaceholderPage title="Persetujuan" category="Alur Kerja" />
                  </RoleRoute>
                }
              />
              <Route
                path="/timesheet"
                element={
                  <RoleRoute allowedRoles={['admin', 'super_admin']}>
                    <PlaceholderPage title="Timesheet Tim" category="Aktivitas" />
                  </RoleRoute>
                }
              />
              <Route
                path="/laporan"
                element={
                  <RoleRoute allowedRoles={['admin', 'super_admin']}>
                    <PlaceholderPage title="Laporan" category="Analitik" />
                  </RoleRoute>
                }
              />
              <Route
                path="/nominal-besar"
                element={
                  <RoleRoute allowedRoles={['admin', 'finance', 'super_admin']}>
                    <PlaceholderPage title="Nominal Besar" category="Batas Finansial" />
                  </RoleRoute>
                }
              />

              {/* Menu Khusus Finance */}
              <Route
                path="/pembayaran"
                element={
                  <RoleRoute allowedRoles={['finance']}>
                    <PlaceholderPage title="Pembayaran" category="Keuangan" />
                  </RoleRoute>
                }
              />
              <Route
                path="/laporan-keuangan"
                element={
                  <RoleRoute allowedRoles={['finance']}>
                    <PlaceholderPage title="Laporan Keuangan" category="Keuangan" />
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
                    <PlaceholderPage title="Peran & Akses" category="Sistem" />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/biaya-per-jam"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <PlaceholderPage title="Biaya per Jam" category="Sistem" />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/departemen"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <PlaceholderPage title="Departemen & Cost Center" category="Sistem" />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/master-data"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <PlaceholderPage title="Master Data" category="Sistem" />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/log-aktivitas"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <PlaceholderPage title="Log Aktivitas" category="Sistem" />
                  </RoleRoute>
                }
              />
              <Route
                path="/sistem/pengaturan"
                element={
                  <RoleRoute allowedRoles={['super_admin']}>
                    <PlaceholderPage title="Pengaturan Sistem" category="Sistem" />
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
