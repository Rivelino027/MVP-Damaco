# Panduan Uji Manual Web Admin (QA Guide)
Aplikasi: **BudgetFlow Web Admin** (`apps/web_admin`)  
Target Uji: Browser (Google Chrome / Edge / Firefox)  
Lingkungan: Windows, MariaDB XAMPP lokal, Backend NestJS (`http://localhost:3000`), Web Admin Vite (`http://localhost:5173`)

---

## 1. Persiapan & Akun Uji

Pastikan database telah di-seed dengan perintah:
```powershell
cd backend
npx prisma db seed
```

Kredensial bawaan:
| Peran | Email | Kata Sandi Bawaan |
|---|---|---|
| **Super Admin** | `superadmin@damaco.id` | `SuperAdmin#2026` |
| **Admin Departemen (Engineering)** | `admin.eng@damaco.id` | `Admin#2026` |
| **Admin Departemen (Marketing)** | `admin.mkt@damaco.id` | `Admin#2026` |
| **Finance** | `finance@damaco.id` | `Finance#2026` |
| **Pengguna / Karyawan (Mobile)** | `worker1@damaco.id` | `Worker#2026` |

---

## 2. Skenario Pengujian Manual

### SKENARIO A: Otentikasi, Guard Peran & Keamanan Sesi

#### A.1 Login Peran Pengguna (Ditolak)
1. Buka `http://localhost:5173/login`.
2. Masukkan email: `worker1@damaco.id`, sandi: `Worker#2026`.
3. Klik tombol **Masuk**.
- **Hasil yang Diharapkan:**
  - Login ditolak dengan banner peringatan merah muda: *"Akun Pengguna tidak dapat masuk ke Web Admin. Aplikasi Web Admin hanya diperuntukkan bagi Admin, Finance, dan Super Admin."*
  - Pengguna tidak masuk ke dalam aplikasi dan tetap di halaman login.

#### A.2 Login Sukses & Header Navigasi
1. Masuk menggunakan akun **Admin** (`admin.eng@damaco.id`).
- **Hasil yang Diharapkan:**
  - Diarahkan ke Dasbor Admin (`/`).
  - Header kanan menampilkan inisial nama, nama lengkap, dan badge peran berwarna biru (`ADMIN`).
  - Klik ikon lonceng notifikasi: Menampilkan dropdown jujur *"Notifikasi belum tersedia — Layanan backend untuk notifikasi in-app dan push belum diimplementasikan"*.
  - Klik nama profil: Menampilkan menu dropdown berisi nama, email, badge peran, tombol **Ubah Kata Sandi**, dan tombol **Keluar dari Akun**.

#### A.3 Pemaksaan Ganti Kata Sandi Pertama Kali
1. Masuk dengan akun baru atau akun dengan flag `mustChangePassword: true`.
- **Hasil yang Diharapkan:**
  - Otomatis diarahkan ke halaman `/ganti-kata-sandi`.
  - Upaya membuka menu lain di sidebar dialihkan kembali ke layar ganti kata sandi.
  - Form menolak kata sandi baru jika sama dengan kata sandi lama atau kurang dari 10 karakter.
  - Setelah berhasil ganti sandi, pengguna diarahkan ke Dasbor.

---

### SKENARIO B: Menu Sidebar & Route Guard per Peran

#### B.1 Menu Admin
1. Masuk sebagai **Admin**.
- **Hasil yang Diharapkan:**
  - Sidebar hanya menampilkan: **Dasbor**, **Proyek**, **Anggaran**, **Persetujuan**, **Timesheet Tim**, **Laporan**, **Nominal Besar**.
  - Buka URL terlarang secara manual di address bar: `http://localhost:5173/pembayaran` atau `http://localhost:5173/sistem/pengguna`.
  - Halaman menampilkan **Akses Ditolak (403)** dengan pesan bahwa peran Admin tidak memiliki izin untuk halaman tersebut.

#### B.2 Menu Finance
1. Masuk sebagai **Finance** (`finance@damaco.id`).
- **Hasil yang Diharapkan:**
  - Sidebar hanya menampilkan: **Dasbor**, **Proyek**, **Persetujuan**, **Pembayaran**, **Anggaran**, **Laporan Keuangan**, **Nominal Besar**.
  - Buka URL manual: `http://localhost:5173/timesheet` atau `http://localhost:5173/laporan`.
  - Halaman menampilkan **Akses Ditolak (403)**.

#### B.3 Menu Super Admin
1. Masuk sebagai **Super Admin** (`superadmin@damaco.id`).
- **Hasil yang Diharapkan:**
  - Sidebar menampilkan menu operasional dan menu sistem lengkap: **Manajemen Pengguna**, **Peran & Akses**, **Biaya per Jam**, **Departemen & Cost Center**, **Master Data**, **Log Aktivitas**, **Pengaturan Sistem**.
  - Buka `/sistem/peran`: Menampilkan matriks hak akses 4 peran dalam mode baca-saja.
  - Buka `/sistem/pengaturan`: Menampilkan banner *"Pengaturan Sistem Dinamis: Belum Tersedia (Menunggu Backend)"* dan parameter sistem baca-saja.

---

### SKENARIO C: Kotak Masuk Persetujuan & Aturan Rantai Persetujuan

Buka menu **Persetujuan** (`/persetujuan`):

#### C.1 Tab Terpadu & Penghitung Badge
- **Hasil yang Diharapkan:**
  - Terdapat 3 tab: **Pengeluaran**, **Timesheet**, dan **Anggaran**.
  - Tab memiliki badge penghitung jumlah dokumen yang menunggu tindakan peran saat ini.

#### C.2 Guard Self-Approval (Pencegahan Persetujuan Sendiri)
1. Masuk sebagai **Admin**.
2. Cari dokumen pengeluaran atau timesheet yang dibuat/diajukan oleh akun Admin itu sendiri.
- **Hasil yang Diharapkan:**
  - Tombol **Setujui** dinonaktifkan (disabled) dengan label/tooltip *"Pengajuan Sendiri"* atau *"Anda tidak dapat menyetujui pengajuan milik sendiri"*.
  - Admin tidak bisa menyetujui miliknya sendiri.

#### C.3 Tindakan Berdasarkan Peran & Langkah
1. Pada dokumen pengeluaran status `menunggu_admin`:
   - Admin melihat tombol **Setujui** dan **Tolak**.
   - Finance belum melihat tombol Verifikasi (menunggu Admin selesai).
   - Super Admin melihat badge abu-abu *"Hanya Baca"* tanpa tombol aksi persetujuan.
2. Pada status `menunggu_finance`:
   - Finance melihat tombol **Verifikasi** dan **Tolak**.
3. Klik tombol **Tolak**:
   - Membuka modal konfirmasi penolakan.
   - Kolom **Alasan Penolakan** wajib diisi. Jika kosong, muncul pesan error dan API tolak tidak dipanggil.
   - Tombol Tolak berpenampilan putih dengan border abu dan teks merah tua `#B0000F`.

---

### SKENARIO D: Pembayaran & Pencairan Kas (Finance)

Masuk sebagai **Finance**, buka menu **Pembayaran** (`/pembayaran`):
1. **Tab Siap Dibayar**:
   - Menampilkan pengeluaran yang telah disetujui Admin dan diverifikasi Finance.
   - Transaksi dengan nominal besar ditandai dengan chip kuning/oranye *"Nominal Besar"*.
   - Tidak ada data per orang (tarif/upah per jam pekerja) yang ditampilkan.
2. **Pencatatan Pembayaran**:
   - Klik **Catat Bayar** pada salah satu baris.
   - Masukkan metode pembayaran (Transfer / Kas), tanggal pencairan, dan nomor referensi bukti kasir.
   - Setelah konfirmasi, item berpindah dari tab *Siap Dibayar* ke tab *Riwayat Sudah Dibayar*.
3. **Tab Riwayat Sudah Dibayar**:
   - Menampilkan tanggal pencairan dan nomor referensi pembayaran.

---

### SKENARIO E: Batas Nominal Besar & Konfirmasi Dua Pihak

Buka menu **Nominal Besar** (`/nominal-besar`):

#### E.1 Super Admin (Baca Saja)
1. Masuk sebagai **Super Admin**.
- **Hasil yang Diharapkan:**
  - Di sudut kanan atas terdapat badge gembok *"Mode Baca Saja"*.
  - Tidak ada tombol *"Usulkan Perubahan"*.
  - Muncul banner penjelasan bahwa Super Admin hanya dapat membaca batas ini.

#### E.2 Usulan dan Konfirmasi Lintas Peran
1. Masuk sebagai **Admin**, klik **Usulkan Perubahan**, masukkan nominal baru (misal Rp 7.500.000) dan alasan.
2. Halaman Admin kini menampilkan banner *"Menunggu konfirmasi peran lain (Finance)"*. Admin tidak dapat mengonfirmasi usulannya sendiri.
3. Keluar dan masuk sebagai **Finance**.
4. Halaman Nominal Besar Finance kini memunculkan panel usulan dengan tombol **Konfirmasi Berlaku** dan **Tolak**.
5. Klik **Konfirmasi Berlaku**: Batas aktif berubah menjadi Rp 7.500.000 dan tercatat pada riwayat perubahan batas.

---

### SKENARIO F: Perlindungan Kerahasiaan Biaya Tenaga Kerja (Labor Cost Privacy)

#### F.1 Biaya Tersembunyi (Hidden Cost) pada Proyek
1. Buka proyek yang memiliki kontributor kurang dari batas minimum pekerja (misal 1 orang kontributor).
2. Buka tab **Biaya Tenaga Kerja** di halaman Detail Proyek atau pantau pada widget Dasbor.
- **Hasil yang Diharapkan:**
  - Status biaya menampilkan badge abu-abu *"Disembunyikan"*.
  - Muncul banner merah muda bahwa nilai biaya disembunyikan agar tarif individu tidak dapat disimpulkan.
  - Tampilan tidak menampilkan angka Rp 0 palsu.

#### F.2 Toggle Biaya per Orang di Timesheet (Khusus Super Admin)
1. Masuk sebagai **Admin** ke menu **Timesheet Tim**:
   - Tidak ada informasi tarif per jam (`ratePerHour`) maupun nominal biaya per pekerja (`costAmount`).
   - Tidak ada tombol toggle biaya.
2. Masuk sebagai **Super Admin** ke menu **Timesheet Tim**:
   - Terdapat tombol toggle *"Biaya per Orang"*.
   - Saat toggle diaktifkan, kolom Tarif per Jam dan Total Biaya ditampilkan secara eksplisit untuk keperluan audit pemilik.

---

### SKENARIO G: Keadaan Error Saat Jaringan Gangguan / Backend Mati

1. Matikan backend NestJS di terminal (Ctrl+C).
2. Muat ulang halaman Web Admin pada sembarang menu:
   - Halaman **Dasbor**, **Proyek**, **Anggaran**, **Persetujuan**, **Laporan**, **Timesheet**, dll.
- **Hasil yang Diharapkan:**
  - Aplikasi tidak crash (tidak layar putih kosong).
  - Setiap halaman menampilkan komponen **`ErrorState`** terstandarisasi:
    - Ikon peringatan bahaya di latar merah muda.
    - Judul *"Terjadi Kesalahan"*.
    - Pesan informatif mengenai kegagalan menghubungi server.
    - Tombol **Coba Lagi**.
  - Tidak ada angka bawaan atau data palsu yang muncul.
3. Hidupkan kembali backend NestJS, lalu klik tombol **Coba Lagi**: Data kembali termuat normal secara otomatis.

