import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[75vh] flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-border bg-white p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
        {/* Top subtle stripe */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-300" />

        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-xs border border-slate-200">
          <FileQuestion className="h-10 w-10 text-slate-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 mb-2">
          ERROR 404
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary font-heading">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mb-6 text-sm text-text-secondary leading-relaxed">
          Halaman yang Anda tuju tidak ditemukan atau alamat URL yang Anda masukkan salah.
        </p>
        <Button variant="primary" onClick={() => navigate('/', { replace: true })} className="rounded-xl px-6">
          Kembali ke Dasbor
        </Button>
      </div>
    </div>
  );
}
