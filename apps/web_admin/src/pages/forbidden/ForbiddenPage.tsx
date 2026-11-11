import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, RoleBadge } from '@/components/shared';
import { useAuthStore } from '@/stores/auth';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-[75vh] flex-1 items-center justify-center p-6">
      <div className="flex max-w-lg flex-col items-center rounded-2xl border border-red-200/80 bg-white p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
        {/* Top subtle danger accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 gradient-primary" />

        {/* Danger tint icon container */}
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-danger/30 bg-danger-tint shadow-xs">
          <ShieldAlert className="h-10 w-10 text-danger" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 mb-2">
          OTORISASI TERBATAS
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-danger font-heading">Akses Ditolak</h1>

        <p className="mb-5 text-sm text-text-secondary leading-relaxed">
          Anda tidak memiliki hak akses untuk membuka halaman ini. Hak akses dan scope data dibatasi secara ketat di sisi server berdasarkan peran akun Anda.
        </p>

        {user && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-border bg-slate-50/80 px-4 py-2.5">
            <span className="text-xs font-medium text-text-secondary">Peran akun Anda:</span>
            <RoleBadge role={user.role} />
          </div>
        )}

        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="flex-1 sm:flex-initial rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/', { replace: true })}
            className="flex-1 sm:flex-initial rounded-xl"
          >
            Menuju ke Dasbor
          </Button>
        </div>
      </div>
    </div>
  );
}
