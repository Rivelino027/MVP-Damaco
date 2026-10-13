# BudgetFlow: aturan untuk agen

Aplikasi manajemen proyek + budgeting untuk tim internal PT. Dunia Maya Communica.

## Stack (monorepo)

| Bagian | Lokasi | Teknologi |
|---|---|---|
| Backend | `backend/` | NestJS, TypeScript strict, PostgreSQL, Prisma |
| Web Admin | `apps/web_admin/` | React, Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query/Table, React Hook Form + Zod, Zustand, Recharts |
| Mobile | `apps/mobile/` | Flutter (iOS, Android), Riverpod, go_router, Dio, flutter_secure_storage, local_auth |
| Design tokens | `design-tokens/` | Sumber tunggal warna, font, radius |
| Dokumen | `docs/` | Aturan bisnis, database, desain, roadmap |

## Wajib dibaca sebelum tugas apa pun

1. `docs/01-aturan-bisnis.md` (aturan bisnis, sumber kebenaran)
2. `docs/02-database.md` dan `backend/prisma/schema.prisma`
3. `docs/03-desain.md` dan `design-tokens/tokens.json` (untuk tugas UI)
4. `docs/04-roadmap.md` (untuk tahu posisi tugas saat ini)

Jika permintaan bertentangan dengan dokumen, berhenti dan tanyakan. Jangan mengubah aturan bisnis sendiri.

## Aturan wajib

1. **Satu akun satu peran** (`pengguna`, `admin`, `finance`, `super_admin`). Peran ditentukan server. Tidak ada endpoint atau UI untuk ganti peran.
2. **Hak akses dan scope data dicek di backend** (guard) pada setiap endpoint, bukan hanya di UI. Scope: pengguna = miliknya, admin = departemennya, finance dan super_admin = semua.
3. **Biaya per jam dan biaya per orang hanya untuk super_admin.** Admin dan Finance hanya menerima agregat. Jangan kirim data per orang ke klien lalu menyembunyikannya di UI.
4. **Rantai persetujuan** dibaca dari tabel `approval_rules`: pengeluaran Admin lalu Finance, timesheet Admin saja, anggaran Admin lalu Finance lalu Super Admin. Jangan menulis rantai kaku di kode.
5. **Nominal Besar hanya penanda**, bukan jalur beda. Backend menolak pengajuan Nominal Besar tanpa nota dan catatan alasan.
6. **Perubahan batas Nominal Besar** perlu dua pihak: pengusul dan pengonfirmasi beda orang dan beda peran (admin dan finance). Super Admin hanya baca.
7. **Uang** memakai `Decimal(18,2)` (Prisma) atau string desimal di API. Dilarang float.
8. **Semua input divalidasi di backend.** Klien tidak dipercaya.
9. **Log aktivitas** (`activity_logs`, append-only) untuk setiap persetujuan, perubahan batas, dan akses biaya per jam.
10. **Soft delete** untuk user, proyek, dan master data. Tidak ada hard delete pada data bertransaksi.
11. **Aplikasi wajib online.** Tidak ada penyimpanan lokal data transaksi di mobile. Draft disimpan di server.
12. **Bahasa:** teks UI Indonesia. Kode, nama variabel, komentar, dan pesan commit bahasa Inggris.

## Keamanan

- Password di-hash argon2. Access token 15 menit, refresh token tersimpan hash-nya, bisa dicabut, dirotasi.
- Rate limit pada login. Pesan gagal login tidak membocorkan email atau password mana yang salah.
- Validasi unggahan: tipe, ukuran, nama file diacak.
- Jangan commit rahasia. Pakai `.env`, sertakan `.env.example`. `.env` masuk `.gitignore`.
- Jangan menambah dependensi tanpa menyebut nama paket dan alasannya. Hindari paket tak dikenal atau tak terawat.
- Jangan menjalankan perintah destruktif (hapus massal, reset database produksi, force push) tanpa persetujuan.

## UI

- Merah `#E8141C` dominan. Status bahaya selalu tint `#FCE4E7` + teks `#B0000F` + ikon + label, jangan pernah solid merah.
- Tombol Tolak: putih, border abu, teks merah tua, ikon X.
- Tidak ada pengganti peran di UI mana pun. Badge peran hanya label baca saja.
- Detail visual ada di `docs/03-desain.md`.

## Cara bekerja

- Kerjakan satu tugas pada satu waktu, selesaikan sampai bisa diuji.
- Mulai dengan rencana singkat, tunggu persetujuan untuk perubahan besar.
- Setiap fitur disertai tes. Jalankan lint dan tes sebelum menyatakan selesai. Jangan melemahkan atau menghapus tes agar lolos.
- Akhiri setiap tugas dengan ringkasan: file yang berubah, tes yang dijalankan beserta hasilnya, dan hal yang belum selesai.
- Jangan mengerjakan fitur di luar tugas. Catat sebagai saran.
