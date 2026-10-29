import { useState } from 'react';
import {
  Shield,
  Building,
  Save,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { toast } from '@/components/shared';

export default function SystemSettingsPage() {
  const [companyName, setCompanyName] = useState('PT. Dunia Maya Communica');
  const [minLaborThreshold, setMinLaborThreshold] = useState('3');
  const [laborRounding, setLaborRounding] = useState('100000');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('15');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseInt(minLaborThreshold, 10);
    if (isNaN(threshold) || threshold < 2) {
      toast.error('Ambang batas pekerja minimum tidak boleh kurang dari 2 (perlindungan de-anonimisasi tarif)');
      return;
    }

    setIsSaved(true);
    toast.success('Pengaturan sistem berhasil disimpan');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Pengaturan Sistem</h1>
        <p className="text-sm text-text-secondary mt-1">
          Konfigurasi parameter global aplikasi BudgetFlow, privasi biaya tenaga kerja, dan keamanan sesi.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Organisasi */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Building className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">Identitas Organisasi</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Nama Perusahaan
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-text-primary focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Mata Uang Acuan
              </label>
              <input
                type="text"
                value="IDR (Rupiah - Rp)"
                disabled
                className="w-full rounded-xl border border-border bg-gray-100 px-3.5 py-2 text-xs text-text-placeholder cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Keamanan & Agregasi Biaya Tenaga Kerja */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">
              Privasi Biaya Tenaga Kerja (Labor Cost Privacy)
            </h2>
          </div>

          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-[#0A2E7F] leading-relaxed">
            <p className="font-semibold mb-1">Aturan Bisnis & Kepatuhan Kerahasiaan:</p>
            Biaya per jam dan tarif per orang bersifat rahasia dan hanya boleh diakses oleh Super Admin. Untuk Admin dan Finance, sistem wajib menampilkan agregat dengan ambang batas minimum pekerja dan pembulatan.
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Ambang Batas Minimum Pekerja
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={minLaborThreshold}
                onChange={(e) => setMinLaborThreshold(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-text-primary focus:border-primary focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-text-placeholder mt-1 block">
                Minimal 2 pekerja (default 3) agar tarif individu tidak dapat ditebak.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Pembulatan Agregat Non-Super Admin (Rp)
              </label>
              <select
                value={laborRounding}
                onChange={(e) => setLaborRounding(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-text-primary focus:border-primary focus:bg-white focus:outline-none"
              >
                <option value="100000">Kelipatan Rp 100.000 (Rekomendasi)</option>
                <option value="50000">Kelipatan Rp 50.000</option>
                <option value="10000">Kelipatan Rp 10.000</option>
              </select>
              <span className="text-[10px] text-text-placeholder mt-1 block">
                Agregat dibulatkan sebelum dikirimkan ke klien Admin atau Finance.
              </span>
            </div>
          </div>
        </div>

        {/* Keamanan Sesi & Token */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">
              Keamanan Sesi & Otentikasi
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Durasi Access Token (Menit)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={sessionDurationMinutes}
                onChange={(e) => setSessionDurationMinutes(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-text-primary focus:border-primary focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-text-placeholder mt-1 block">
                Standar 15 menit dengan rotasi refresh token otomatis.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Algoritma Hash Kata Sandi
              </label>
              <input
                type="text"
                value="Argon2id (Strict & Hardened)"
                disabled
                className="w-full rounded-xl border border-border bg-gray-100 px-3.5 py-2 text-xs text-text-placeholder cursor-not-allowed"
              />
              <span className="text-[10px] text-text-placeholder mt-1 block">
                Sesuai standar OWASP dan aturan keamanan BudgetFlow.
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isSaved && (
            <span className="flex items-center gap-1.5 text-xs text-[#48742C] font-semibold">
              <CheckCircle className="h-4 w-4" />
              Perubahan tersimpan
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow transition-all"
          >
            <Save className="h-4 w-4" />
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}
