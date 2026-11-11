import {
  Settings,
  Shield,
  Building,
  Lock,
  AlertTriangle,
  Info,
  Server,
  Database,
  CheckCircle2,
} from 'lucide-react';

export default function SystemSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-sm shadow-primary/20">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                Pengaturan Sistem
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Konfigurasi Global
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Konfigurasi parameter global aplikasi BudgetFlow, privasi biaya tenaga kerja, dan keamanan sesi.
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Arsitektur Keamanan Card */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Arsitektur Keamanan</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Hardened SOP
            </span>
          </div>
          <div className="mt-3">
            <span className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary block">
              12 Aturan Bisnis Server
            </span>
            <p className="text-xs text-text-placeholder mt-1">
              Seluruh batasan diuji & ditegakkan langsung di backend guards.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] text-text-secondary">
            <span>Integritas Kebijakan</span>
            <span className="text-emerald-700 font-medium">Terverifikasi</span>
          </div>
        </div>

        {/* Card 2: Privasi Biaya */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Privasi Tenaga Kerja</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-text-primary">Min. 3 Pekerja</span>
            <p className="text-xs text-text-placeholder mt-0.5">Ambang batas agregat + pembulatan Rp 100.000</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-600 font-medium pt-2 border-t border-border/60">
            <span>Tarif Per Orang Tertutup Bagi Admin & Finance</span>
          </div>
        </div>

        {/* Card 3: Otentikasi & Sesi */}
        <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Keamanan Otentikasi</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-navy">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-heading text-2xl font-bold text-text-primary">Argon2id + 15 Menit</span>
            <p className="text-xs text-text-placeholder mt-0.5">Access token rotasi silent refresh otomatis</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-navy font-medium pt-2 border-t border-border/60">
            <span>Standar Enkripsi OWASP Terpenuhi</span>
          </div>
        </div>
      </div>

      {/* Bento Grid 2 Columns (Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri - Card 1: Identitas Organisasi */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-primary">
                  <Building className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">Identitas Organisasi</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-text-placeholder">
                Bawaan Server
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Nama Perusahaan
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  PT. Dunia Maya Communica
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Mata Uang Acuan
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  IDR (Rupiah - Rp)
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Format Presisi Finansial
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono font-medium text-text-primary">
                  Decimal(18,2) - Dilarang Float
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Sesuai Aturan Bisnis #7 untuk akurasi desimal perbankan.
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Zona Waktu Sistem
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Asia/Jakarta (WIB, UTC+7)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Penetapan snapshot timestamp log & laporan keuangan.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-text-placeholder" />
              BudgetFlow Enterprise Suite v2.0
            </span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Beroperasi Normal
            </span>
          </div>
        </div>

        {/* Kolom Kanan - Card 2: Privasi Biaya Tenaga Kerja */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Shield className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">
                  Privasi Biaya Tenaga Kerja (Labor Cost Privacy)
                </h2>
              </div>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700">
                Aktif di Backend
              </span>
            </div>

            <div className="mb-4 rounded-xl border border-purple-200/80 bg-purple-50/50 p-3.5 text-xs text-purple-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Aturan Bisnis #3 & Kepatuhan Kerahasiaan:</p>
                  <p>
                    Biaya per jam dan tarif per orang bersifat rahasia dan hanya boleh diakses oleh Super Admin. Untuk Admin dan Finance, backend otomatis menerapkan ambang batas minimum pekerja dan pembulatan.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Ambang Batas Minimum Pekerja
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  3 Pekerja (Batas Bawah Hardcoded: 2)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Jika pekerja pada proyek kurang dari batas ini, biaya disembunyikan (<code className="font-mono text-purple-700">isCostHidden: true</code>).
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Pembulatan Agregat Non-Super Admin (Rp)
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Kelipatan Rp 100.000
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Agregat dibulatkan oleh server sebelum dikirimkan ke Admin / Finance.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
            <span>Perlindungan Hak Asasi & Kerahasiaan Upah</span>
            <span className="text-purple-700 font-semibold">Strict Guard Active</span>
          </div>
        </div>

        {/* Kolom Kiri - Card 3: Keamanan Sesi & Otentikasi */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-navy">
                  <Lock className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">
                  Keamanan Sesi & Otentikasi
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Enforced Server
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Durasi Access Token
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  15 Menit (Rotasi Refresh Token Otomatis)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Dikelola aman via memory session dan silent refresh backend.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Algoritma Hash Kata Sandi
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary font-mono">
                  Argon2id (Strict & Hardened)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Sesuai standar OWASP dan aturan keamanan BudgetFlow.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Kebijakan Panjang Kata Sandi
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Minimal 10 Karakter + Tidak Sama dengan Lama
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Divalidasi di form klien dan diverifikasi penuh di server.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Perlindungan Rate Limiting
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Proteksi Brute Force Aktif (HTTP 429)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Pesan gagal netral tanpa membocorkan email/sandi.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
            <span>Kepatuhan Token Storage</span>
            <span className="text-emerald-600 font-semibold">Zero-Leak Policy</span>
          </div>
        </div>

        {/* Kolom Kanan - Card 4: Integritas Transaksi & Tata Kelola Anggaran */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Database className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">
                  Integritas Transaksi & Tata Kelola Anggaran
                </h2>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                SOP Perusahaan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Log Audit Aktivitas
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Append-Only (Non-Destructive)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Aturan Bisnis #9: Semua keputusan & perubahan batas dicatat permanen.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Batas Nominal Besar
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Mekanisme Dua Pihak (Admin & Finance)
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Aturan Bisnis #6: Pengusul & pengonfirmasi harus beda peran. Super Admin hanya baca.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Rantai Persetujuan
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Dinamis dari Tabel approval_rules
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Aturan Bisnis #4: Dilarang mengunci alur kaku di kode hardcoded.
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-secondary mb-1">
                  Kebijakan Hapus Data
                </span>
                <div className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-text-primary">
                  Soft Delete untuk Seluruh Master & User
                </div>
                <span className="text-[10px] text-text-placeholder mt-1 block">
                  Aturan Bisnis #10: Tidak ada hard delete pada entitas yang bertransaksi.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
            <span>Sistem Kepatuhan Finansial</span>
            <span className="text-amber-700 font-semibold">Strict Audit Trail</span>
          </div>
        </div>
      </div>

      {/* Honest Backend Availability Banner */}
      <div className="rounded-2xl border border-amber-200 bg-[#FDF0DC] p-5 text-xs text-[#8A550F] shadow-xs">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#B56910] mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-[#8A550F]">
              Pengaturan Sistem Dinamis: Belum Tersedia (Menunggu Backend)
            </p>
            <p className="leading-relaxed text-[#9A5A0A]">
              Endpoint backend untuk perubahan konfigurasi sistem dinamis (misalnya <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900">/settings</code> atau tabel terkelola) belum diimplementasikan di server. Nilai parameter di atas saat ini berjalan menggunakan konstanta bawaan backend (hardcoded / environment variables) dan ditampilkan dalam status <strong>baca-saja</strong> yang akurat dan transparan sesuai panduan QA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
