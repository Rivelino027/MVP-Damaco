# BudgetFlow: Panduan Desain

Warna diambil dari logo PT. Dunia Maya Communica (merah dan biru). **Merah dominan.** Nilai warna ada di `design-tokens/tokens.json`. Jangan memakai warna di luar daftar ini.

## 1. Palet

| Fungsi | Hex |
|---|---|
| Primary (dominan) | `#E8141C` |
| Dark red (pasangan gradien, pressed) | `#B0000F` |
| Bright red (highlight, glow) | `#FF4D4D` |
| Red tint (latar lembut, terpilih) | `#FCE4E7` |
| Biru (info, grafik pembanding, jarang) | `#0A47B8` |
| Navy (judul kecil, badge Super Admin) | `#0A2E7F` |
| Blue tint (latar info) | `#E8F1FD` |
| Kartu | `#FFFFFF` |
| Latar halaman | `#FBF7F7` |
| Border dan pembatas | `#EBE3E4` |
| Disabled | `#D9D9D9` |
| Teks utama / sekunder / placeholder | `#1A0B0D` / `#6B5E60` / `#9A8D8F` |
| Paling gelap | `#1A0507` |
| Sukses (aman, disetujui, dibayar) | `#48742C` |
| Waspada: ikon dan border | `#F29D38`, `#B56910` |
| Waspada: latar tint | `#FDF0DC` |
| Waspada: teks | `#9A5A0A` atau `#8A550F` |

Catatan kontras: `#F29D38` jangan dipakai sebagai teks di atas putih.

## 2. Gradien

- **Linear** 135 derajat `#E8141C` ke `#B0000F`: tombol utama, kartu hero, pill aktif sidebar, panel login dan splash. Latar halaman: gradien halus `#FBF7F7` ke `#FFFFFF`.
- **Conic** `#FF4D4D`, `#E8141C`, `#B0000F`, `#FF4D4D`: ring progres, ring avatar, aksen donut. Di splash dan login, glow conic boleh memuat sedikit biru `#0A47B8` agar mirip logo.

## 3. Aturan merah (penting)

Merah dipakai untuk aksi utama sekaligus status bahaya, jadi bedakan tegas:

| Jenis | Tampilan |
|---|---|
| Aksi utama (Masuk, Ajukan, Setujui, Verifikasi, Tandai Dibayar, Simpan) | Gradien merah penuh, teks putih |
| Status bahaya (Ditolak, Melebihi anggaran, error) | Latar `#FCE4E7`, teks dan border `#B0000F`, SELALU dengan ikon dan label. Jangan pernah solid merah |
| Tombol Tolak dan aksi negatif | Putih, border `#EBE3E4`, teks `#B0000F`, ikon X |
| Tombol sekunder | Putih, border `#EBE3E4`, teks `#1A0B0D` |

## 4. Bar dan progres

- **Bar anggaran:** hijau `#48742C` (aman), orange (di atas 80%), merah tua `#B0000F` dengan ikon peringatan (melebihi anggaran).
- **Progres kerja** (ring dan bar): gradien merah.
- **Grafik:** merah sebagai seri utama, navy atau biru sebagai pembanding, hijau dan orange hanya bila bermakna status.
- Baris tabel yang serapannya melebihi progres: latar `#FCE4E7` dengan ikon dan tooltip.

## 5. Tipografi dan bentuk

- Plus Jakarta Sans untuk judul dan angka KPI (36-48px), Inter untuk isi.
- Radius kartu 16-20px, bayangan lembut berlapis, border 1px `#EBE3E4`.
- Grid 8px, target sentuh mobile minimal 44px.
- Ikon duotone membulat dalam chip bertint. Avatar bertumpuk untuk anggota tim.
- Web: dasbor bento-grid, sidebar melayang kaca (glass) dengan pill gradien merah aktif.

## 6. Logo

Perusahaan: PT. Dunia Maya Communica. Logo (oval biru-merah, huruf M putih, teks navy) dipakai apa adanya, jangan diwarnai ulang. Letakkan di kartu putih membulat bila di atas gradien merah.

Tempat: Splash, Login (mobile dan web), sidebar web (ikon kecil, logo penuh saat terbuka), Tentang Aplikasi, Pengaturan Sistem tab Umum. Footer login: "© PT. Dunia Maya Communica". Nama aplikasi: "BudgetFlow" di samping atau bawah logo. File logo: `design-tokens/assets/logo.png`.

## 7. Badge

### Status
| Objek | Nilai |
|---|---|
| Task | belum_mulai, dikerjakan, review, selesai |
| Timesheet | draft, menunggu_admin, disetujui, ditolak |
| Pengeluaran | draft, menunggu_admin, menunggu_finance, disetujui, ditolak, siap_dibayar, dibayar |
| Anggaran | draft, menunggu_admin, menunggu_finance, menunggu_super_admin, disetujui, ditolak |
| Proyek | diajukan, berjalan, ditutup |
| Batas | diusulkan, menunggu_konfirmasi, berlaku, ditolak |

Pemetaan warna: disetujui, dibayar, selesai = hijau; menunggu_* dan draft = netral atau tint biru; ditolak = tint bahaya; berjalan = tint merah; Nominal Besar = orange tint dengan ikon bendera.

### Peran (baca saja)
Pengguna (tint biru `#E8F1FD`, teks `#0A2E7F`), Admin (tint orange `#FDF0DC`, teks `#8A550F`), Finance (hijau `#48742C`, teks putih), Super Admin (navy `#0A2E7F`, teks putih).

## 8. Aturan UI lintas layar

1. **Tidak ada pengganti peran** (tab, dropdown, atau tombol) di UI mana pun. Peran ditentukan akun yang login. Profil hanya menampilkan badge peran dan tombol "Keluar dari Akun".
2. Tombol Setujui dan Tolak hanya aktif untuk langkah yang sesuai peran login, selain itu nonaktif dengan tooltip.
3. Pengeluaran selalu menampilkan rantai 3 langkah (Pengaju, Admin, Finance). Anggaran 4 langkah (ditambah Super Admin). Timesheet berhenti di Admin.
4. Pengguna tidak pernah melihat tarif, anggaran, atau data keuangan. Admin dan Finance tidak pernah melihat biaya per orang.
5. Form pengeluaran memberi tahu sebelum diajukan apakah nominal melewati batas (chip berubah orange, nota dan alasan ditandai wajib).
6. Aplikasi wajib online: state "Tidak ada koneksi" dan tombol kirim nonaktif saat offline.
7. Semua teks UI bahasa Indonesia.

## 9. Mobile (frame 390x844)

Bottom tab per peran:
- **Pengguna:** Beranda, Task, Timesheet, Pengeluaran, Profil
- **Admin:** Beranda, Persetujuan, Proyek, Notifikasi, Profil
- **Finance:** Beranda, Verifikasi, Pembayaran, Notifikasi, Profil

Layar bersama: Splash, Login (state gagal, akun tidak aktif), Notifikasi, Profil, Tidak ada koneksi, Batas Nominal Besar (Admin dan Finance).

Layar Pengguna: Beranda, Task Saya, Detail Task (timer), Timesheet, Ajukan Pengeluaran (foto nota, dua state), Pengeluaran Saya.
Layar Admin: Beranda, Persetujuan (swipe, pilih banyak), Detail Persetujuan, Proyek (baca saja).
Layar Finance: Beranda, Verifikasi (checklist), Pembayaran (Catat Pembayaran), Batas Nominal Besar.

Swipe kanan setujui (hijau, ikon centang), swipe kiri tolak (merah tua, ikon X).

## 10. Web Admin (1440px)

Sidebar per peran:
- **Admin:** Dasbor, Proyek, Anggaran, Persetujuan, Timesheet Tim, Laporan, Nominal Besar
- **Finance:** Dasbor, Persetujuan (Verifikasi), Pembayaran, Anggaran, Laporan Keuangan, Nominal Besar
- **Super Admin:** menu Admin plus bagian terpisah "Sistem": Manajemen Pengguna, Peran & Akses, Biaya per Jam, Departemen & Cost Center, Master Data, Log Aktivitas, Pengaturan Sistem

Layar: Login (panel kiri gradien merah, form kanan, state gagal, akun tidak aktif, "Akun Pengguna tidak dapat masuk ke Web Admin"), Dasbor per peran, Daftar Proyek, Detail Proyek (tab Ringkasan, Fase & Task, Anggaran, Timesheet, Pengeluaran, Tim), Pengajuan Anggaran, Persetujuan (tab Timesheet, Pengeluaran, Anggaran, panel detail), Timesheet Tim, Pembayaran & Rekonsiliasi, Laporan dan Laporan Keuangan, Nominal Besar, Manajemen Pengguna, Peran & Akses (matriks baca saja), Biaya per Jam, Departemen & Cost Center, Master Data, Log Aktivitas, Pengaturan Sistem.

## 11. Isi dasbor per peran

- **Admin:** KPI (proyek aktif, anggaran departemen, terpakai, sisa), peringatan dini serapan vs progres, kesehatan proyek, menunggu persetujuan, pengajuan anggaran berjalan, kartu Batas Nominal Besar.
- **Finance:** KPI perusahaan, serapan per departemen, arus kas keluar per bulan, antrean verifikasi, Nominal Besar menunggu, biaya tenaga kerja per departemen (agregat), siap dibayar, batas saat ini.
- **Super Admin:** KPI perusahaan, serapan per departemen, menunggu keputusan anggaran, notifikasi Nominal Besar (baca saja), batas saat ini (siapa mengusulkan dan mengonfirmasi), kesehatan proyek lintas departemen, aktivitas terbaru.

## 12. Dark mode (tahap 2)

Latar `#1A0507`, kartu `#2A0E10`, border `#B0000F`, teks `#FBF7F7` dan `#9A8D8F`, aksen merah `#E8141C`, warna status tetap.
