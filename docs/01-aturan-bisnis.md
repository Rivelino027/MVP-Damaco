# BudgetFlow: Aturan Bisnis (Final)

Aplikasi manajemen proyek + budgeting untuk tim internal PT. Dunia Maya Communica.
Konsep inti: **setiap task punya biaya**, sehingga progres kerja dan serapan anggaran terbaca bersamaan.

Tidak ada klien, invoice, atau margin. Aplikasi wajib online (tanpa mode offline). Draft disimpan di server.

## 1. Platform

| Platform | Peran yang memakai | Teknologi |
|---|---|---|
| Mobile (iOS, Android) | Pengguna, Admin, Finance | Flutter |
| Web Admin | Admin, Finance, Super Admin | React + Vite + TypeScript |
| Backend | Semua | NestJS + PostgreSQL + Prisma |

Akun Pengguna tidak boleh login ke Web Admin (pesan: "Akun Pengguna tidak dapat masuk ke Web Admin").
Akun Super Admin hanya login di Web Admin.

## 2. Empat peran

**Satu akun = satu peran.** Peran ditentukan server saat login dan dibawa lewat token. Tidak ada endpoint atau UI untuk ganti peran. Untuk berganti peran, pengguna keluar lalu login dengan akun lain.

| Peran | Fokus | Cakupan data |
|---|---|---|
| `pengguna` | Mengerjakan task, isi timesheet, ajukan pengeluaran | Milik sendiri |
| `admin` | Kelola proyek, setujui timesheet dan pengeluaran (langkah 1) | Departemennya |
| `finance` | Verifikasi pengeluaran, cek kelayakan anggaran, catat pembayaran, laporan keuangan | Semua departemen |
| `super_admin` | Sistem, akun, hak akses, biaya per jam, keputusan anggaran | Semua departemen |

## 3. Matriks hak akses

| Fitur | pengguna | admin | finance | super_admin |
|---|:---:|:---:|:---:|:---:|
| Lihat task sendiri, isi timesheet, ajukan pengeluaran | Y | Y | Y | Y |
| Buat proyek, fase, task | N | Y (dept.) | N | Y |
| Ajukan anggaran | N | Y | N | Y |
| Setujui timesheet | N | Y (dept.) | N | Y |
| Setujui pengeluaran (langkah 1) | N | Y (dept.) | N | N |
| Verifikasi pengeluaran (semua nominal) | N | N | Y | N |
| Catat pembayaran | N | N | Y | N |
| Cek kelayakan anggaran | N | N | Y | N |
| Putuskan anggaran proyek | N | N | N | Y |
| Usulkan / konfirmasi batas Nominal Besar | N | Y | Y | N |
| Lihat batas dan notifikasi Nominal Besar | N | Y | Y | Y (baca saja) |
| Laporan keuangan | N | Y (dept.) | Y (semua) | Y (semua) |
| Total biaya tenaga kerja (agregat) | N | Y (dept.) | Y (semua) | Y |
| Biaya per jam / biaya per orang | N | N | N | Y (lihat dan ubah) |
| Kelola akun, peran, master data, cost center | N | N | N | Y |
| Log aktivitas dan pengaturan sistem | N | N | N | Y |

## 4. Rantai persetujuan

```
Pengeluaran (semua nominal) : Pengaju -> Admin -> Finance -> Siap Dibayar -> Dibayar
Timesheet                   : Pengaju -> Admin -> Disetujui
Anggaran proyek             : Admin mengajukan -> Finance (cek kelayakan) -> Super Admin (putuskan)
Perubahan batas nominal     : Admin/Finance mengusulkan -> peran lainnya mengonfirmasi -> Berlaku
```

Rantai disimpan sebagai konfigurasi di tabel `approval_rules`, bukan ditulis kaku di kode.
Setiap dokumen punya satu baris `approvals` per langkah (siapa, kapan, alasan jika ditolak).
Tombol Setujui/Tolak hanya aktif untuk langkah yang sesuai dengan peran pengguna yang login.
Jika ditolak di langkah mana pun, dokumen berstatus `ditolak` dan pengaju dapat mengajukan ulang.

## 5. Nominal Besar

Ada satu angka batas (contoh Rp5.000.000, nilai awal diisi Admin dan Finance). Batas **tidak mengubah jalur persetujuan**, hanya penanda.

Pengeluaran di atas batas (`is_large_amount = true`):

1. Chip "Nominal Besar" tampil di semua daftar dan detail.
2. **Nota dan catatan alasan wajib.** Backend menolak pengajuan jika salah satunya kosong.
3. Muncul paling atas di antrean Finance.
4. Finance mendapat checklist tambahan: "Vendor valid" dan "Tidak dipecah dari pengeluaran lain".
5. Super Admin hanya menerima notifikasi informasi (tanpa tombol setuju/tolak).

`is_large_amount` dan `limit_at_submission` dihitung dan disimpan saat pengajuan. Perubahan batas tidak berlaku surut untuk dokumen yang sedang berjalan.

## 6. Aturan perubahan batas (dua pihak)

1. Pengusul adalah admin atau finance.
2. Pengonfirmasi harus **orang berbeda dan peran berbeda** (satu admin, satu finance).
3. Batas baru berlaku hanya setelah status `berlaku`.
4. Super Admin hanya bisa melihat dan menerima notifikasi. Percobaan mengubah ditolak (403).
5. Semua usulan, konfirmasi, dan penolakan dicatat di `activity_logs`.

## 7. Biaya per jam dan biaya tenaga kerja

- `hourly_costs` hanya terbaca dan terubah oleh Super Admin.
- Biaya tenaga kerja = jam disetujui x tarif berlaku. Disimpan sebagai snapshot di `timesheet_entries.cost_amount` saat timesheet disetujui, jadi perubahan tarif tidak mengubah biaya lama.
- Admin dan Finance **hanya menerima agregat** (per proyek atau departemen), tidak pernah per orang. Jangan kirim data per orang ke klien lalu menyembunyikannya di UI.
- Agregat dengan satu orang: jika satu proyek hanya dikerjakan satu orang, total biaya tenaga kerja sama dengan biayanya. Tampilkan biaya tenaga kerja ke Finance di level departemen, atau gabungkan dengan kategori lain, bila jumlah orang di proyek kurang dari 2.
- Setiap akses Super Admin ke biaya per jam dicatat di `activity_logs`.

## 8. Anggaran

- Anggaran per fase dan kategori (Tenaga Kerja, Material, Vendor, Lain-lain).
- Anggaran awal diajukan, lalu melewati Admin -> Finance -> Super Admin.
- Setelah disetujui menjadi `budget` aktif dengan `is_baseline = true` dan **terkunci**.
- Perubahan selalu lewat `budget_requests` (tipe `perubahan`), versi lama tetap tersimpan.
- Peringatan dini: tampil jika serapan > progres, dan ambang serapan (default 80%) dapat diatur.
- Warna bar anggaran: aman (hijau), waspada di atas 80% (orange), melebihi anggaran (merah tua dengan ikon).

## 9. Status

| Objek | Status |
|---|---|
| Task | belum_mulai, dikerjakan, review, selesai |
| Timesheet | draft, menunggu_admin, disetujui, ditolak |
| Pengeluaran | draft, menunggu_admin, menunggu_finance, disetujui, ditolak, siap_dibayar, dibayar |
| Anggaran (request) | draft, menunggu_admin, menunggu_finance, menunggu_super_admin, disetujui, ditolak |
| Proyek | diajukan, berjalan, ditutup |
| Batas | diusulkan, menunggu_konfirmasi, berlaku, ditolak |

Timesheet disetujui Admin = selesai (Finance tidak terlibat).
Pengeluaran "disetujui" berarti lolos Finance, lalu otomatis `siap_dibayar`. Finance mengubah ke `dibayar` saat mencatat pembayaran.

## 10. Deteksi pemecahan pengeluaran

Job terjadwal menandai pengeluaran dari pengaju, vendor, atau kategori yang sama dalam rentang waktu dekat (default 7 hari, bisa diatur) yang jumlahnya mendekati atau melewati batas. Hasil masuk `expense_flags` ("terindikasi_dipecah") dan tampil untuk Finance. Ini hanya penanda, tidak memblokir proses.

## 11. Keamanan

- Hak akses dan scope data dicek di backend pada setiap endpoint (guard), bukan hanya di UI.
- Password di-hash (argon2). Access token 15 menit, refresh token tersimpan dan bisa dicabut. Rate limit pada login.
- Akun nonaktif ditolak dengan pesan "Akun tidak aktif, hubungi administrator".
- Validasi unggahan: tipe file, ukuran maksimum, nama file diacak.
- `activity_logs` append-only: tidak boleh diubah atau dihapus.
- Soft delete untuk user, proyek, master data. Tidak ada hard delete pada data bertransaksi.
- Uang memakai `NUMERIC(18,2)`, dalam Rupiah.

## 12. Notifikasi

Push (FCM) dan in-app untuk: task baru, tenggat besok, timesheet/pengeluaran menunggu persetujuan, disetujui/ditolak, pengeluaran siap dibayar, Nominal Besar (informasi ke Super Admin), usulan batas menunggu konfirmasi, anggaran menunggu keputusan.

## 13. Di luar cakupan versi pertama (tahap 2)

Addendum formal, impor anggaran dari Excel, template proyek, komitmen biaya (PO), dark mode.
