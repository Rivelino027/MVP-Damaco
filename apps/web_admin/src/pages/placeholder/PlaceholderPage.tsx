import { Construction, Sparkles } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  category?: string;
}

export default function PlaceholderPage({
  title,
  description = 'Fitur ini sedang dalam tahap pengembangan aktif.',
  category,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col p-6 lg:p-8">
      {/* Header section */}
      <div className="mb-6">
        {category && (
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {category}
          </span>
        )}
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary lg:text-3xl">{title}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-warning-strong/20 bg-warning-tint px-3 py-1 text-xs font-semibold text-warning-text-strong">
            <Sparkles className="h-3.5 w-3.5" />
            Segera Hadir
          </span>
        </div>
      </div>

      {/* Bento Card Placeholder */}
      <div className="flex flex-1 items-center justify-center rounded-[var(--radius-card-lg)] border border-border bg-white/70 p-12 shadow-sm backdrop-blur">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-tint">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
          <div className="mt-6 rounded-[var(--radius-input)] bg-background px-4 py-2.5 text-xs text-text-placeholder">
            Modul ini akan tersedia pada rilis iterasi berikutnya sesuai roadmap.
          </div>
        </div>
      </div>
    </div>
  );
}
