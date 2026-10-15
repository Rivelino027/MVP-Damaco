import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertTriangle, Info, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/shared';
import { loginApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AxiosError } from 'axios';

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, mustChangePassword, setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'danger' | 'warning' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (mustChangePassword) {
        navigate('/ganti-kata-sandi', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, mustChangePassword, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const data = await loginApi(values.email, values.password);
      // Simpan token
      setAuth(data.accessToken, data.user);
      sessionStorage.setItem('refreshToken', data.refreshToken);

      if (data.mustChangePassword) {
        navigate('/ganti-kata-sandi', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        const msg = err.response.data?.message || 'Terjadi kesalahan';
        const status = err.response.status;

        if (status === 403) {
          // Akun tidak aktif ATAU pengguna coba masuk ke web
          if (msg.includes('tidak dapat masuk ke Web Admin') || msg.includes('Pengguna')) {
            setError({ message: 'Akun Pengguna tidak dapat masuk ke Web Admin', type: 'warning' });
          } else {
            setError({ message: 'Akun tidak aktif, hubungi administrator', type: 'danger' });
          }
        } else if (status === 429) {
          setError({
            message: 'Terlalu banyak percobaan login. Coba lagi setelah beberapa saat.',
            type: 'danger',
          });
        } else {
          setError({ message: 'Email atau kata sandi salah', type: 'danger' });
        }
      } else {
        setError({ message: 'Tidak dapat terhubung ke server', type: 'danger' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel Kiri — Gradien merah */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden gradient-primary lg:flex">
        {/* Glow dekoratif */}
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-primary-bright/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue/10 blur-3xl" />

        {/* Logo di kartu putih */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[var(--radius-card-lg)] bg-white/95 shadow-2xl backdrop-blur">
            <img src="/logo.png" alt="Logo BudgetFlow" className="h-24 w-24 object-contain" />
          </div>
          <h1 className="mb-3 text-center text-3xl font-bold text-white">BudgetFlow</h1>
          <p className="max-w-sm text-center text-lg text-white/80">
            Kelola proyek & anggaran dengan terkendali
          </p>
        </div>

        {/* Pattern dots dekoratif */}
        <div className="absolute bottom-8 left-8 grid grid-cols-5 gap-2 opacity-20">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* Panel Kanan — Form Login */}
      <div className="flex w-full flex-col justify-center bg-surface px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
            <span className="text-xl font-bold text-text-primary">BudgetFlow</span>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-text-primary">Masuk ke Akun</h2>

          {/* Badge info — Peran ditentukan akun */}
          <div className="mb-6 mt-3 flex items-center gap-2 rounded-[var(--radius-input)] bg-blue-tint px-4 py-2.5">
            <Info className="h-4 w-4 shrink-0 text-navy" />
            <span className="text-xs text-navy">
              Khusus Admin, Finance & Super Admin
            </span>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-4 flex items-center gap-3 rounded-[var(--radius-input)] border px-4 py-3 bg-danger-tint border-danger/20"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
              <span className="text-sm font-medium text-danger">{error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
                  className="h-11 w-full rounded-[var(--radius-input)] border border-border bg-white pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Kata Sandi */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  className="h-11 w-full rounded-[var(--radius-input)] border border-border bg-white pl-10 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Ingat saya & Lupa kata sandi */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-primary"
                  {...register('rememberMe')}
                />
                Ingat saya
              </label>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:text-primary-dark"
                onClick={() => setShowForgotInfo(!showForgotInfo)}
              >
                Lupa kata sandi?
              </button>
            </div>

            {/* Info lupa kata sandi */}
            {showForgotInfo && (
              <div className="flex items-start gap-2 rounded-[var(--radius-input)] bg-blue-tint px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
                <p className="text-xs text-navy">
                  Hubungi Super Admin untuk reset kata sandi Anda.
                </p>
              </div>
            )}

            {/* Tombol Masuk */}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Masuk
            </Button>
          </form>

          {/* Info peran */}
          <p className="mt-6 text-center text-xs text-text-placeholder">
            Peran Anda ditentukan oleh akun yang diberikan administrator.
          </p>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-text-placeholder">
            © PT. Dunia Maya Communica
          </p>
        </div>
      </div>
    </div>
  );
}
