# BudgetFlow: Roadmap

Perkiraan untuk tim kecil: 15-17 minggu. Centang fase yang selesai agar agen tahu posisi proyek.
Kerjakan satu alur utuh dulu: login, Super Admin membuat akun, Pengguna mengisi timesheet, Admin menyetujui.

| Status | Fase | Isi | Definisi selesai |
|---|---|---|---|
| [ ] | 0. Persiapan | Aturan proyek, tokens, repo monorepo, MySQL lokal (XAMPP), backend `/health`, CI dasar | Backend hidup, `prisma validate` lolos, README jelas |
| [ ] | 1. Fondasi | Migrasi, trigger dan CHECK, seed, auth, guard peran, manajemen pengguna, departemen, cost center, master data, audit log, web admin dasar | Login 4 peran, 403 benar, Super Admin bisa membuat akun |
| [ ] | 2. Proyek dan task | Proyek, fase, milestone, task, anggota, lampiran, kanban | Admin membuat proyek dan task, pengguna melihat task miliknya |
| [ ] | 3. Timesheet | Isi jam, persetujuan Admin, biaya per jam (Super Admin), agregat biaya tenaga kerja | Snapshot biaya benar, tidak ada kebocoran per orang |
| [ ] | 4. Pengeluaran | Form dan foto nota, rantai Admin lalu Finance, Nominal Besar, pembayaran | Alur lengkap sampai dibayar, aturan Nominal Besar teruji |
| [ ] | 5. Batas dan anggaran | Batas dua pihak, pengajuan anggaran, baseline, Budget vs Aktual | Anggaran terkunci, batas hanya berubah lewat dua pihak |
| [ ] | 6. Dasbor dan laporan | Dasbor per peran, laporan, ekspor Excel dan PDF, peringatan dini | Angka dasbor cocok dengan data uji |
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