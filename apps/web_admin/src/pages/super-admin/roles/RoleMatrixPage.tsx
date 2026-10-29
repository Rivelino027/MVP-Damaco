import { Shield, Info, Check, X } from 'lucide-react';

interface AccessRow {
  feature: string;
  category: string;
  pengguna: string;
  admin: string;
  finance: string;
  super_admin: string;
}

const ACCESS_MATRIX: AccessRow[] = [
  {
    category: 'Task & Timesheet',
    feature: 'Lihat task sendiri, isi timesheet, ajukan pengeluaran',
    pengguna: 'Y',
    admin: 'Y',
    finance: 'Y',
    super_admin: 'Y',
  },
  {
    category: 'Proyek & Task',
    feature: 'Buat proyek, fase, task',
    pengguna: 'N',
    admin: 'Y (dept.)',
    finance: 'N',
    super_admin: 'Y',
  },
  {
    category: 'Anggaran',
    feature: 'Ajukan anggaran',
    pengguna: 'N',
    admin: 'Y',
    finance: 'N',
    super_admin: 'Y',
  },
  {
    category: 'Persetujuan',
    feature: 'Setujui timesheet',
    pengguna: 'N',
    admin: 'Y (dept.)',
    finance: 'N',
    super_admin: 'Y',
  },
  {
    category: 'Persetujuan',
    feature: 'Setujui pengeluaran (langkah 1)',
    pengguna: 'N',
    admin: 'Y (dept.)',
    finance: 'N',
    super_admin: 'N',
  },
  {
    category: 'Persetujuan',
    feature: 'Verifikasi pengeluaran (semua nominal)',
    pengguna: 'N',
    admin: 'N',
    finance: 'Y',
    super_admin: 'N',
  },
  {
    category: 'Keuangan',
    feature: 'Catat pembayaran',
    pengguna: 'N',
    admin: 'N',
    finance: 'Y',
    super_admin: 'N',
  },
  {
    category: 'Anggaran',
    feature: 'Cek kelayakan anggaran',
    pengguna: 'N',
    admin: 'N',
    finance: 'Y',
    super_admin: 'N',
  },
  {
    category: 'Anggaran',
    feature: 'Putuskan anggaran proyek',
    pengguna: 'N',
    admin: 'N',
    finance: 'N',
    super_admin: 'Y',
  },
  {
    category: 'Nominal Besar',
    feature: 'Usulkan / konfirmasi batas Nominal Besar',
    pengguna: 'N',
    admin: 'Y',
    finance: 'Y',
    super_admin: 'N',
  },
  {
    category: 'Nominal Besar',
    feature: 'Lihat batas dan notifikasi Nominal Besar',
    pengguna: 'N',
    admin: 'Y',
    finance: 'Y',
    super_admin: 'Y (baca saja)',
  },
  {
    category: 'Laporan',
    feature: 'Laporan keuangan',
    pengguna: 'N',
    admin: 'Y (dept.)',
    finance: 'Y (semua)',
    super_admin: 'Y (semua)',
  },
  {
    category: 'Biaya Tenaga Kerja',
    feature: 'Total biaya tenaga kerja (agregat)',
    pengguna: 'N',
    admin: 'Y (dept.)',
    finance: 'Y (semua)',
    super_admin: 'Y',
  },
  {
    category: 'Biaya Tenaga Kerja',
    feature: 'Biaya per jam / biaya per orang',
    pengguna: 'N',
    admin: 'N',
    finance: 'N',
    super_admin: 'Y (lihat dan ubah)',
  },
  {
    category: 'Sistem',
    feature: 'Kelola akun, peran, master data, cost center',
    pengguna: 'N',
    admin: 'N',
    finance: 'N',
    super_admin: 'Y',
  },
  {
    category: 'Sistem',
    feature: 'Log aktivitas dan pengaturan sistem',
    pengguna: 'N',
    admin: 'N',
    finance: 'N',
    super_admin: 'Y',
  },
];

function RenderAccessCell({ value }: { value: string }) {
  if (value === 'N') {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#EBE3E4]/50 text-text-placeholder">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }

  const isLimited = value.includes('dept.') || value.includes('baca saja') || value.includes('lihat');

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-50 text-[#48742C]">
        <Check className="h-3.5 w-3.5" />
      </span>
      {isLimited && (
        <span className="text-[10px] text-text-secondary font-medium">
          {value.replace('Y', '').trim()}
        </span>
      )}
    </div>
  );
}

export default function RoleMatrixPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Peran & Hak Akses</h1>
        <p className="text-sm text-text-secondary mt-1">
          Matriks referensi hak akses sistem BudgetFlow sesuai aturan bisnis resmi PT Dunia Maya Communica.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <Info className="h-5 w-5 text-[#0A47B8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#0A2E7F] leading-relaxed">
          <p className="font-semibold text-sm mb-1">Prinsip Keamanan Peran & Hak Akses:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Satu akun = satu peran.</strong> Peran ditentukan di server saat login dan dienkripsi dalam token otentikasi.</li>
            <li>Tidak ada antarmuka atau tombol untuk mengganti peran secara dinamis pada sesi yang sama.</li>
            <li>Seluruh otorisasi dan cakupan data (scope) dicek ketat di backend melalui server guards.</li>
            <li>Biaya per jam dan tarif per orang bersifat rahasia dan hanya dapat diakses oleh Super Admin.</li>
          </ul>
        </div>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            role: 'Pengguna',
            code: 'pengguna',
            focus: 'Mengerjakan task, isi timesheet, ajukan pengeluaran',
            scope: 'Milik sendiri',
            badge: 'bg-gray-100 text-gray-700',
            client: 'Khusus Mobile App',
          },
          {
            role: 'Admin',
            code: 'admin',
            focus: 'Kelola proyek & task, persetujuan langkah 1, monitoring anggaran dept.',
            scope: 'Departemennya',
            badge: 'bg-blue-50 text-[#0A47B8]',
            client: 'Web Admin & Mobile',
          },
          {
            role: 'Finance',
            code: 'finance',
            focus: 'Verifikasi pengeluaran, cek kelayakan anggaran, pencatatan kas/pembayaran',
            scope: 'Semua departemen',
            badge: 'bg-green-50 text-[#48742C]',
            client: 'Web Admin & Mobile',
          },
          {
            role: 'Super Admin',
            code: 'super_admin',
            focus: 'Kelola akun, master data, tarif biaya per jam, keputusan akhir anggaran',
            scope: 'Semua departemen (Global)',
            badge: 'bg-[#FCE4E7] text-[#B0000F]',
            client: 'Khusus Web Admin',
          },
        ].map(({ role, code, focus, scope, badge, client }) => (
          <div key={code} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
                {code}
              </span>
              <span className="text-[10px] text-text-placeholder">{client}</span>
            </div>
            <h3 className="font-heading text-base font-bold text-text-primary mt-1">{role}</h3>
            <p className="text-xs text-text-secondary mt-1.5 min-h-[36px]">{focus}</p>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-placeholder">Cakupan Data:</span>
              <span className="font-semibold text-text-primary">{scope}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Access Matrix Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-text-primary">
              Matriks Hak Akses Fitur (Read-Only)
            </h2>
          </div>
          <span className="text-xs text-text-placeholder">16 Kontrol Hak Akses</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Fitur & Modul</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Pengguna</th>
                <th className="py-3 px-4 text-center">Admin</th>
                <th className="py-3 px-4 text-center">Finance</th>
                <th className="py-3 px-4 text-center">Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {ACCESS_MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-background/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-text-primary max-w-sm">
                    {row.feature}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {row.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <RenderAccessCell value={row.pengguna} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <RenderAccessCell value={row.admin} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <RenderAccessCell value={row.finance} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <RenderAccessCell value={row.super_admin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
