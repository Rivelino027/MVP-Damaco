import { useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  CreditCard,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
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
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'danger' | 'warning' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Animasi intro sebelum masuk ke login (aktif di browser, dinonaktifkan di mode test agar tes instan)
  const [isIntroActive, setIsIntroActive] = useState(() => import.meta.env.MODE !== 'test');
  const [isIntroFading, setIsIntroFading] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (mustChangePassword) {
        navigate('/ganti-kata-sandi', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, mustChangePassword, navigate]);

  // Efek progress bar dan transisi halus untuk animasi pembuka
  useEffect(() => {
    if (!isIntroActive) return;

    const progressInterval = setInterval(() => {
      setIntroProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 45);

    const fadeTimer = setTimeout(() => {
      setIsIntroFading(true);
    }, 1150);

    const completeTimer = setTimeout(() => {
      setIsIntroActive(false);
      setIsIntroFading(false);
    }, 1650);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isIntroActive]);

  const handleSkipIntro = () => {
    setIsIntroFading(true);
    setTimeout(() => {
      setIsIntroActive(false);
      setIsIntroFading(false);
    }, 200);
  };

  const handleReplayIntro = () => {
    setIntroProgress(0);
    setIsIntroFading(false);
    setIsIntroActive(true);
  };

  const handlePasswordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const isCaps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockActive(Boolean(isCaps));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const data = await loginApi(values.email, values.password);
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
    <div className="relative min-h-screen w-full flex justify-center bg-[#0B0F19] overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 0. INTRO / SPLASH SCREEN OVERLAY SEBELUM MASUK KE LOGIN     */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isIntroActive && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#090D18] via-[#121829] to-[#0A0E1A] text-white px-6 transition-all duration-500 ease-out ${
            isIntroFading
              ? 'opacity-0 scale-105 pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
          aria-label="Animasi Pembuka BudgetFlow"
        >
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-primary/30 via-[#E8141C]/20 to-transparent blur-3xl animate-pulse" />
            <div className="absolute top-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-blue/20 blur-3xl" />
          </div>

          <button
            type="button"
            onClick={handleSkipIntro}
            className="absolute top-6 right-6 z-20 flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>Lewati Animasi</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center max-w-md">
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute -inset-5 rounded-[34px] bg-gradient-to-tr from-primary via-primary-bright to-blue opacity-45 blur-xl animate-pulse" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(232,20,28,0.35)] transition-transform duration-700 hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Logo BudgetFlow"
                  className="h-16 w-16 object-contain drop-shadow-md"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                Budget<span className="text-primary-bright font-black">Flow</span>
              </h1>
            </div>

            <p className="mt-2 text-xs sm:text-sm font-medium text-white/70 tracking-wide">
              Sistem Manajemen Proyek & Pengendalian Anggaran
            </p>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mt-1">
              PT. Dunia Maya Communica
            </p>

            <div className="mt-8 w-56 sm:w-64">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden backdrop-blur-xs p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary-bright to-[#F29D38] transition-all duration-150 ease-out shadow-[0_0_12px_rgba(232,20,28,0.8)]"
                  style={{ width: `${introProgress}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/60 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-bright animate-ping" />
                  Menyiapkan Workspace
                </span>
                <span className="font-mono text-white/80">{introProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* WRAPPER DUA KOLOM DENGAN RESPONSIVITAS ZOOM SEMPURNA        */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[1920px] min-h-screen flex flex-col lg:flex-row">
        {/* ─────────────────────────────────────────────────────────── */}
        {/* 1. SISI KIRI: DARK WORKSPACE SHOWCASE (RESPONSIF ZOOM)      */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex relative w-full lg:w-[50%] xl:w-[54%] 2xl:w-[56%] flex-col justify-between p-6 sm:p-8 xl:p-12 2xl:p-14 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-[#0B0F19] via-[#101627] to-[#151221] text-white border-r border-white/5">
          {/* Glow ambient latar */}
          <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute top-1/3 -right-32 h-[450px] w-[450px] rounded-full bg-[#E8141C]/15 blur-3xl" />

          {/* Top Header Kiri */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-xl mx-auto mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] border border-white/20 p-1.5 transition-transform hover:scale-105">
                <img src="/logo.png" alt="Logo BudgetFlow" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-heading text-lg font-black tracking-tight text-white">
                    Budget<span className="text-primary-bright">Flow</span>
                  </span>
                </div>
                <p className="text-[10px] font-bold tracking-wider uppercase text-rose-300/80">
                  ENTERPRISE WORKSPACE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistem aktif</span>
            </div>
          </div>

          {/* Headline, Deskripsi & Mockup Dashboard */}
          <div className="relative z-10 w-full max-w-xl mx-auto my-auto py-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-bold tracking-wider text-white/80 uppercase mb-3">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[9px] font-black">
                01
              </span>
              <span>FINANCIAL CONTROL CENTER</span>
            </div>

            <h1 className="font-heading text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-[1.12] text-white">
              Kendalikan anggaran.{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D4D] via-[#E8141C] to-[#FF7070]">
                Gerakkan bisnis.
              </span>
            </h1>

            <p className="mt-3 text-xs sm:text-sm text-white/70 font-medium leading-relaxed max-w-lg">
              Satu ruang kerja untuk melihat performa, mengatur persetujuan, dan mengambil keputusan dengan lebih percaya diri.
            </p>

            {/* MOCKUP DASHBOARD VISUAL (DENGAN BOUNDING BOX AMAN ZOOM) */}
            <div className="relative mt-6 mb-8 group perspective-[1200px]">
              <div className="relative rounded-3xl bg-[#F8FAFC] p-4 text-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/20 transition-transform duration-500 group-hover:scale-[1.01]">
                <div className="flex gap-3.5">
                  {/* Mini Sidebar Mockup */}
                  <div className="w-11 sm:w-12 rounded-2xl bg-[#111827] p-2 flex flex-col items-center gap-2.5 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-xs p-1">
                      <img src="/logo.png" alt="Mini Logo" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <div className="mt-auto h-1.5 w-1.5 rounded-full bg-white/20" />
                  </div>

                  {/* Dashboard Body Mockup */}
                  <div className="flex-1 min-w-0">
                    {/* Top Bar Mockup */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400">Pengelolaan Internal</p>
                        <h4 className="font-heading text-xs sm:text-sm font-bold text-slate-900 truncate">
                          Halo, Administrator
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white border-2 border-white" title="Admin">
                            ADM
                          </div>
                          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white border-2 border-white" title="Finance">
                            FIN
                          </div>
                          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white border-2 border-white" title="Super Admin">
                            SUP
                          </div>
                          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white border-2 border-white">
                            +4
                          </div>
                        </div>
                        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-700">
                          ADM
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Cards Mockup */}
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      <div className="rounded-xl bg-[#111827] p-2 text-white min-w-0 overflow-hidden">
                        <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate">Total anggaran</p>
                        <p className="font-heading text-[11px] sm:text-xs font-bold mt-0.5 truncate">Rp 4,82 M</p>
                        <span className="text-[7px] sm:text-[8px] text-emerald-400 font-semibold block truncate">
                          +12.4% SESUAI DIPA
                        </span>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200/80 p-2 min-w-0 overflow-hidden">
                        <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate">Realisasi</p>
                        <p className="font-heading text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5 truncate">Rp 3,17 M</p>
                        <span className="text-[7px] sm:text-[8px] text-slate-500 block truncate">65.7% digunakan</span>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200/80 p-2 min-w-0 overflow-hidden">
                        <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate">Sisa aktif</p>
                        <p className="font-heading text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5 truncate">Rp 1,65 M</p>
                        <span className="text-[7px] sm:text-[8px] text-slate-500 block truncate">Alokasi tersedia</span>
                      </div>
                    </div>

                    {/* Bar Chart Mockup */}
                    <div className="mt-2.5 rounded-xl bg-white border border-slate-200/80 p-2.5 pb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Arus Anggaran</p>
                          <p className="text-[10px] font-bold text-slate-800">Performa 6 bulan</p>
                        </div>
                        <span className="text-[8px] font-semibold text-slate-400 bg-slate-100 px-1 py-0.2 rounded">2026</span>
                      </div>

                      <div className="flex items-end gap-2 h-11 sm:h-12 pt-1">
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 h-[35%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 h-[50%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-indigo-600 to-indigo-400 h-[65%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-indigo-600 to-indigo-400 h-[45%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-purple-400 h-[75%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-purple-400 h-[85%]" />
                        <div className="w-full rounded-t-sm bg-gradient-to-t from-primary to-[#FF5252] h-[95%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Widget Kiri: 24 Pengajuan */}
                <div className="absolute -bottom-4 left-4 z-20 flex items-center gap-2 rounded-2xl bg-[#111827] text-white px-3 py-1.5 shadow-xl border border-white/10">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[7px] uppercase tracking-wider text-slate-400 font-semibold">Approval queue</p>
                    <p className="text-[11px] font-bold text-white">24 pengajuan</p>
                  </div>
                </div>

                {/* Floating Widget Kanan: Budget Health Gauge */}
                <div className="absolute -bottom-4 right-4 z-20 rounded-2xl bg-[#131B2E] text-white p-2.5 shadow-2xl border border-white/15 w-40 sm:w-44">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-bold text-slate-300">Budget health</p>
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[7px] font-bold text-emerald-400">LIVE</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border-2 border-primary shrink-0">
                      <span className="text-[11px] font-black text-white">84%</span>
                    </div>
                    <div className="text-[8px] space-y-0.5 min-w-0">
                      <p className="flex items-center gap-1 text-slate-300 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Terpakai
                      </p>
                      <p className="flex items-center gap-1 text-slate-400 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" /> Tersedia
                      </p>
                      <span className="inline-block rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-1 text-[7px] font-bold">
                        ON TRACK
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Sisi Kiri */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-xl mx-auto pt-4 border-t border-white/10 text-xs text-white/50">
            <span>PT. Dunia Maya Communica</span>
            <div className="flex items-center gap-1.5 text-white/70">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Infrastruktur terenkripsi</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 2. SISI KANAN: CLEAN WHITE MODERN LOGIN FORM                */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 w-full flex flex-col justify-between bg-white px-6 sm:px-10 lg:px-10 xl:px-16 2xl:px-20 py-8 lg:py-10 min-h-screen overflow-y-auto">
          {/* Top Header Mobile / Tablet (Tampil jika layar sempit) */}
          <div className="flex lg:hidden items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs p-1">
                <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain" />
              </div>
              <span className="font-heading text-base font-black tracking-tight text-slate-900">
                Budget<span className="text-primary font-black">Flow</span>
              </span>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              Sistem aktif
            </span>
          </div>

          {/* Form Container (Responsif & Tahan Zoom) */}
          <div className="w-full max-w-[420px] mx-auto my-auto py-4">
            {/* Header Formulir */}
            <div>
              <p className="text-[11px] font-extrabold tracking-widest uppercase text-primary">
                PORTAL ADMINISTRATOR
              </p>

              <h2 className="mt-1.5 font-heading text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                Selamat datang kembali.
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
                <span className="font-semibold text-slate-700">Masuk ke Akun</span> untuk melanjutkan pengelolaan proyek dan anggaran perusahaan.
              </p>
            </div>

            {/* Role / Access Pill Card */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-2xs shrink-0">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Akses berdasarkan akun
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    Admin • Finance • Super Admin
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Khusus Admin, Finance & Super Admin
                  </p>
                </div>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>

            {/* Alert Error / Warning */}
            {error && (
              <div
                className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs animate-in fade-in zoom-in-95 ${
                  error.type === 'warning'
                    ? 'bg-warning-tint/80 border-warning/35 text-warning-text-strong'
                    : 'bg-danger-tint border-danger/30 text-danger'
                }`}
                role="alert"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error.message}</span>
              </div>
            )}

            {/* Form Login */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              {/* Input Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@perusahaan.com"
                    className="h-11 sm:h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 hover:border-slate-300"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-[11px] font-medium text-danger">{errors.email.message}</p>
                )}
              </div>

              {/* Input Kata Sandi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    Kata Sandi
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotInfo(!showForgotInfo)}
                    className="text-xs font-semibold text-primary hover:text-primary-dark cursor-pointer transition-colors"
                  >
                    Lupa kata sandi?
                  </button>
                </div>

                {capsLockActive && (
                  <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-warning-strong bg-warning-tint px-2 py-0.5 rounded-full border border-warning/30 animate-pulse w-fit">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Caps Lock Aktif
                  </div>
                )}

                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    onKeyDown={handlePasswordKeyDown}
                    onKeyUp={handlePasswordKeyDown}
                    className="h-11 sm:h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-11 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 hover:border-slate-300"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-[11px] font-medium text-danger">{errors.password.message}</p>
                )}
              </div>

              {/* Checkbox: Pertahankan sesi saya */}
              <div className="pt-0.5">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded-md border-slate-300 accent-[#111827] cursor-pointer"
                    {...register('rememberMe')}
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Pertahankan sesi saya</span>
                    <p className="text-[11px] text-slate-400 font-normal">Hanya gunakan pada perangkat pribadi</p>
                  </div>
                </label>
              </div>

              {/* Popup Info Lupa Kata Sandi */}
              {showForgotInfo && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-blue-tint/90 border border-blue/20 p-3 text-xs text-navy animate-in fade-in">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  <p className="leading-relaxed font-medium">
                    Hubungi Super Admin untuk reset kata sandi Anda.
                  </p>
                </div>
              )}

              {/* Tombol Masuk ke Dashboard */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex h-11 sm:h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#131929] hover:bg-[#1C243B] font-heading text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Memproses...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Masuk ke dashboard</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Security Assurance Badge */}
            <div className="mt-4.5 rounded-xl bg-[#E8F8F0] border border-[#C8EED9] p-2.5 text-center">
              <p className="text-[11px] text-[#2D6A4F] leading-relaxed font-medium">
                Peran Anda ditentukan oleh akun yang diberikan administrator.
              </p>
            </div>

            {/* Security Features Tagline */}
            <div className="mt-3.5 flex items-center justify-center gap-4 text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-slate-400" />
                SSL terenkripsi
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-slate-400" />
                Audit tercatat
              </span>
            </div>
          </div>

          {/* Footer Sisi Kanan */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-medium text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>© 2026 BudgetFlow</span>
              <span>•</span>
              <span>© PT. Dunia Maya Communica</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReplayIntro}
                className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors cursor-pointer font-semibold"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Animasi Pembuka</span>
              </button>
              <span>•</span>
              <span>Kebijakan privasi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
