import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared';
import { changePasswordApi, logoutApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AxiosError } from 'axios';

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Kata sandi lama wajib diisi'),
    newPassword: z
      .string()
      .min(10, 'Kata sandi baru minimal 10 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'Kata sandi baru tidak boleh sama dengan kata sandi lama',
    path: ['newPassword'],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { mustChangePassword, setMustChangePassword, logout } = useAuthStore();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setError(null);
    setLoading(true);

    try {
      await changePasswordApi({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      setMustChangePassword(false);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        setError(err.response.data?.message || 'Gagal mengganti kata sandi');
      } else {
        setError('Tidak dapat terhubung ke server');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutApi();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#1A0B10] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand / Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-xl shadow-black/20 border border-white/20">
            <img src="/logo.png" alt="PT. Dunia Maya Communica" className="h-9 w-auto object-contain" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-300 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
            KEAMANAN AKUN PORTAL
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Ganti Kata Sandi</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Perbarui kredensial akun Anda secara berkala demi menjaga keamanan data perusahaan
          </p>

          {mustChangePassword && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-xs text-amber-200">
                Anda wajib mengganti kata sandi sebelum melanjutkan.
              </span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-white p-7 shadow-2xl">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-danger-tint border border-danger/20 px-4 py-3" role="alert">
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
              <span className="text-sm font-medium text-danger">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Kata sandi lama */}
            <div>
              <label htmlFor="oldPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Kata Sandi Lama
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                <input
                  id="oldPassword"
                  type={showOld ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi lama"
                  className="h-11 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  {...register('oldPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                  onClick={() => setShowOld(!showOld)}
                >
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="mt-1 text-xs text-danger">{errors.oldPassword.message}</p>
              )}
            </div>

            {/* Kata sandi baru */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                <input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimal 10 karakter"
                  className="h-11 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-danger">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Konfirmasi kata sandi baru */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  className="h-11 w-full rounded-xl border border-border bg-slate-50/50 pl-10 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-text-placeholder focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" size="lg" loading={loading}>
              Ganti Kata Sandi
            </Button>
          </form>

          {mustChangePassword && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-xs text-text-secondary hover:text-danger transition-colors font-medium"
                onClick={handleLogout}
              >
                Keluar dari akun
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          PT. Dunia Maya Communica • Sistem Terenkripsi & Diaudit
        </p>
      </div>
    </div>
  );
}
