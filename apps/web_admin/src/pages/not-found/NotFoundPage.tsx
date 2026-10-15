import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center rounded-[var(--radius-card-lg)] border border-border bg-white p-8 text-center shadow-md">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background">
          <FileQuestion className="h-8 w-8 text-text-placeholder" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Halaman Tidak Ditemukan</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Halaman yang Anda tuju tidak ditemukan atau alamat URL yang Anda masukkan salah.
        </p>
        <Button variant="primary" onClick={() => navigate('/', { replace: true })}>
          Kembali ke Dasbor
        </Button>
      </div>
    </div>
  );
}
