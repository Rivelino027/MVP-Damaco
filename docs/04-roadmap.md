# BudgetFlow: Roadmap

Perkiraan untuk tim kecil: 15-17 minggu. Centang fase yang selesai agar agen tahu posisi proyek.
Kerjakan satu alur utuh dulu: login, Super Admin membuat akun, Pengguna mengisi timesheet, Admin menyetujui.

| Status | Fase | Isi | Definisi selesai |
|---|---|---|---|
| [x] | 0. Persiapan | Aturan proyek, tokens, repo monorepo, MySQL lokal (XAMPP), backend `/health`, CI dasar | Backend hidup, `prisma validate` lolos, README jelas |
| [x] | 1. Fondasi | Migrasi, trigger dan CHECK, seed, auth, guard peran, manajemen pengguna, departemen, cost center, master data, audit log, web admin dasar | Login 4 peran, 403 benar, Super Admin bisa membuat akun |
| [x] | 2. Proyek dan task | Proyek, fase, milestone, task, anggota, lampiran, kanban | Admin membuat proyek dan task, pengguna melihat task miliknya |
| [x] | 3. Timesheet | Isi jam, persetujuan Admin, biaya per jam (Super Admin), agregat biaya tenaga kerja | Snapshot biaya benar, tidak ada kebocoran per orang |
| [x] | 4. Pengeluaran | Form dan foto nota, rantai Admin lalu Finance, Nominal Besar, pembayaran | Alur lengkap sampai dibayar, aturan Nominal Besar teruji |
| [x] | 5. Batas dan anggaran | Batas dua pihak, pengajuan anggaran, baseline, Budget vs Aktual | Anggaran terkunci, batas hanya berubah lewat dua pihak |
| [x] | 6. Dasbor dan laporan | Dasbor per peran, laporan, ekspor Excel dan PDF, peringatan dini | Angka dasbor cocok dengan data uji |
| [ ] | 7. Mobile | Fondasi Flutter, lalu Pengguna, Admin, Finance | Tiap peran bisa menjalankan alurnya di emulator |
| [ ] | 8. Notifikasi dan pengaman | FCM, deteksi pemecahan, pengaturan sistem, audit keamanan | Audit tanpa temuan tinggi |
| [ ] | 9. UAT dan rilis | Uji dengan pengguna nyata, perbaikan, deploy, distribusi | Disetujui PIC bisnis |

Urutan kerja yang disarankan: fase 0 sampai 3 berurutan. Fase 7 (mobile) dapat berjalan paralel dengan fase 5 dan 6 setelah API fase 4 stabil.

## Fase tahap 2 (setelah rilis pertama)

Addendum formal, impor anggaran dari Excel, template proyek, komitmen biaya (PO), dark mode.

## Keputusan yang masih perlu dikonfirmasi

- Hosting: server internal atau cloud.
- Apple Developer account dan Mac untuk build iOS.
- Distribusi: Play Store dan App Store atau distribusi internal.
- Login: email dan password saja atau SSO (Google Workspace).
- Nilai awal batas Nominal Besar (contoh Rp5.000.000).
- Mata uang dan pajak: hanya Rupiah tanpa PPN?
- Pembayaran hanya dicatat di aplikasi, tanpa integrasi bank?

## Catatan fase

(Agen: tambahkan ringkasan singkat di sini setiap akhir fase: apa yang selesai, keputusan penting, utang teknis.)

- Produksi: aplikasi harus memakai user database terbatas (bukan root): hanya SELECT, INSERT, UPDATE, DELETE. Tanpa DROP, TRUNCATE, ALTER, TRIGGER. Hapus /auth/test-super-admin atau matikan di production.

- Fase 2 (sebagian): API proyek, anggota, fase, milestone selesai. Menyusul: task (6B) dan halaman web (6C).
- Fase 2: API task, checklist, komentar, dan lampiran selesai. Menyusul halaman web proyek dan task (6C).
- Fase 2 selesai: API dan halaman web proyek, fase, milestone, task, kanban, lampiran. Perapian tertunda: ukuran bundel web (860 kB), peringatan act() di tes, nama berkas di header unduhan.
- Fase 3 (backend): API timesheet, biaya per jam, dan agregat biaya tenaga kerja selesai beserta pengamanan tahap 7B (respons persetujuan tanpa biaya, filter kalender bulan penuh untuk admin/finance, ambang batas minimum pekerja dari app_settings dengan fallback default 3 dan batas bawah 2, pembulatan kelipatan Rp 100.000 untuk admin/finance, audit log akses_agregat_biaya tanpa nilai biaya, dan validasi UUID tanpa kebocoran identitas pekerja).
- Fase 4 (web admin): Halaman Pengeluaran (ExpensesPage) dengan rantai Admin → Finance, chip Nominal Besar, checklist Finance untuk Nominal Besar, deteksi flag pemecahan, Modal Detail/Tolak/Catat Pembayaran. Halaman Nominal Besar (NominalBesarPage) dengan batas saat ini, usulan (Admin/Finance), konfirmasi pihak lain, Super Admin read-only, riwayat perubahan.
- Fase 5 (web admin): Halaman Anggaran (BudgetRequestsPage) dengan rantai 4 langkah Admin→Finance→Super Admin, modal detail dengan rincian per kategori. Tab Anggaran di Project Detail (ProjectBudgetTab) dengan bar serapan berwarna (hijau/orange/merah), peringatan dini serapan>progres, rincian per kategori, info baseline terkunci.
- Fase 6 (web admin): Dasbor per peran (AdminDashboard, FinanceDashboard, SuperAdminDashboard), dynamic dashboard router di `/`, halaman Laporan Operasional & Proyek (`/laporan`), Laporan Realisasi Keuangan & Kas (`/laporan-keuangan`), matriks hak akses baca-saja (`/sistem/peran`), dan Pengaturan Sistem (`/sistem/pengaturan`). Fitur ekspor CSV/Excel dan Cetak/PDF tersedia.
- Penyelesaian Web Admin (Integrasi Penuh):
  - Kotak Masuk Persetujuan Terpadu (`ApprovalsInboxPage`) dengan 3 tab (Pengeluaran, Timesheet, Anggaran), counter per tab, filter, rantai persetujuan, modal alasan tolak wajib, guard self-approval (Admin tidak bisa menyetujui pengajuan/timesheet milik sendiri), Super Admin baca-saja pada pengeluaran.
  - Halaman Pembayaran (`PaymentsPage`) khusus Finance dengan tab Siap Dibayar & Riwayat Dibayar, filter Nominal Besar, dan modal catat bayar tanpa eksposur data per orang.
  - Timesheet Tim (`TimesheetsPage`): Filter proyek, self-approval guard, toggle biaya per orang khusus Super Admin.
  - Anggaran (`BudgetRequestsPage`): Visual rantai 4 langkah, modal alasan penolakan wajib, detail per kategori.
  - Laporan & Keuangan (`ReportsPage` & `FinancialReportsPage`): Filter kalender bulan penuh, ekspor CSV agregat aman.
  - Header & Profil: Dropdown profil lengkap dan dropdown notifikasi jujur ("Notifikasi belum tersedia — backend belum diimplementasikan").
  - Pengaturan Sistem (`SystemSettingsPage`): Banner jujur "Belum Tersedia (Menunggu Backend)", parameter disajikan baca-saja.
  - Seluruh 23 suite tes (171 tes) lolos 100%, lint 0 warnings/0 errors, build exit 0.

## Daftar Kekurangan yang Menunggu Backend

Berikut adalah fitur atau halaman pada Web Admin yang saat ini berstatus **Belum Tersedia** atau memerlukan dukungan backend tambahan:
1. **Layanan Notifikasi In-App & Push (FCM)**:
   - Backend belum menyediakan endpoint `/notifications`, model database notifikasi, maupun integrasi FCM.
   - Frontend menampilkan status jujur *"Notifikasi belum tersedia — backend belum diimplementasikan"* pada dropdown lonceng di Header.
2. **Pengaturan Sistem Dinamis (`/settings`)**:
   - Backend belum memiliki controller/endpoint untuk mengubah konfigurasi aplikasi secara dinamis (seperti ambang batas pekerja atau konfigurasi identitas).
   - `SystemSettingsPage` menyajikan parameter sistem dalam mode baca-saja berdasarkan konstanta bawaan backend.
3. **Ekspor Laporan Sisi Server (Server-Side Report Generation)**:
   - Ekspor CSV dan Cetak saat ini digenerate langsung di browser klien dari data agregat API untuk menjamin tidak ada kebocoran data tarif/biaya per orang. Pembuatan laporan PDF formal berbasis server (misal template Puppeteer/HTML-to-PDF) belum tersedia di backend.
4. **Deteksi Pemecahan Transaksi Otomatis (Splitting Detection Service)**:
   - Fitur deteksi otomatis pengeluaran berulang di bawah batas Nominal Besar dalam selang waktu berdekatan belum tersedia sebagai cron/service mandiri di backend.
5. **Formulir Pengajuan Pengeluaran dan Timesheet Pekerja di Web**:
   - Sesuai arsitektur produk, pekerja lapangan mengajukan pengeluaran dan mengisi timesheet melalui aplikasi Mobile Flutter (`apps/mobile`), sedangkan Web Admin difokuskan untuk peran manajerial (Admin, Finance, Super Admin). Web Admin mengelola persetujuan, pembayaran, proyek, dan pengawasan sistem.

## Daftar Perapian Tertunda (Technical Debt)

1. **Ukuran Bundel Frontend (Bundle Size)**:
   - Bundel utama JavaScript hasil build Vite berukuran ~1.097 kB (> 500 kB). Disarankan menerapkan *code-splitting* menggunakan `React.lazy()` / *dynamic import()* pada routing halaman.
2. **Peringatan `act(...)` di Pengujian Vitest**:
   - Beberapa pengujian yang melibatkan navigasi dan resolusi single-flight refresh token (seperti `session-recovery.test.tsx`) memicu peringatan React `act(...)` meskipun semua pengujian lulus. Perlu pembungkusan `act(...)` yang lebih presisi pada pengujian simulasi state reload.
3. **Nama Berkas di Header Unduhan**:
   - Backend saat ini menyajikan berkas blob dengan penamaan acak/UUID. Nama berkas asli ditangani secara manual oleh frontend via atribut `download` elemen `<a>`. Disarankan backend menyertakan `Content-Disposition: attachment; filename="..."` yang sudah disanitasi.
4. **DTO Backend Menggunakan `@IsString()`**:
   - Beberapa DTO backend masih menggunakan `@IsString()` alih-alih `@IsUUID()` pada field ID relasi (seperti departmentId atau costCenterId). Perlu pengetatan validasi di backend.
5. **Upgrade Prisma 7**:
   - Upgrade ke Prisma versi 7 ditunda sementara karena pertimbangan stabilitas koneksi MySQL/MariaDB 10.4+ pada XAMPP lokal.
