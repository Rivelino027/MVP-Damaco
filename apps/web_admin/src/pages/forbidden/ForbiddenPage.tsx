import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, RoleBadge } from '@/components/shared';
import { useAuthStore } from '@/stores/auth';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-[70vh] flex-1 items-center justify-center p-6">
      <div className="flex max-w-lg flex-col items-center rounded-[var(--radius-card-lg)] border border-danger/20 bg-danger-tint/40 p-8 text-center shadow-lg backdrop-blur">
        {/* Danger tint icon container */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-danger/30 bg-danger-tint">
          <ShieldAlert className="h-8 w-8 text-danger" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-danger">Akses Ditolak</h1>

        <p className="mb-4 text-sm text-text-secondary">
          Anda tidak memiliki hak akses untuk membuka halaman ini. Hak akses dan scope data dibatasi berdasarkan peran akun Anda.
        </p>

        {user && (
          <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-input)] border border-border bg-white/80 px-4 py-2">
            <span className="text-xs text-text-secondary">Peran akun Anda:</span>
            <RoleBadge role={user.role} />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/', { replace: true })}
          >
            Menuju ke Dasbor
          </Button>
        </div>
      </div>
    </div>
  );
}
