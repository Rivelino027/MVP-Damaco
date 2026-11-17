# DamacoFlow / BudgetFlow: Panduan & Aturan Agen Mobile

Dokumen ini adalah **sumber kebenaran utama** dan **aturan kerja agen** untuk pengembangan aplikasi mobile Flutter **DamacoFlow / BudgetFlow** (Android & iOS). Setiap agen yang mengerjakan fitur apa pun di aplikasi mobile **wajib** membaca dan mematuhi seluruh isi dokumen ini.

---

## 1. Ikhtisar Proyek

- **Nama Aplikasi:** DamacoFlow (default), diselaraskan di `AppConfig.appName`.
- **Organisasi:** PT. Dunia Maya Communica (klien internal, tanpa invoice/margin).
- **Domain:** Manajemen proyek + budgeting berbasis jam kerja dan serapan biaya internal.
- **Backend API:** NestJS REST API (`http://localhost:3000/api`), MariaDB 10.4+ / MySQL 8.0.16+, Prisma ORM.
- **Cakupan Mobile:** Melayani peran `pengguna`, `admin`, dan `finance`. Akun `super_admin` ditolak dengan pesan agar mengakses Web Admin.
- **Konsep Kunci:** Setiap task memiliki biaya, progres kerja dan serapan anggaran terbaca bersamaan.

---

## 2. Aturan Keras (Non-Negotiable Rules)

1. **Dilarang Mengarang Endpoint API**
   - Periksa selalu rute backend di `backend/src/` (controller, DTO, services).
   - Seluruh interaksi API wajib melalui domain repository interface + satu file terpusat `lib/core/network/api_endpoints.dart`.
   - Jika ada endpoint backend yang belum tersedia atau belum pasti, tandai dengan comment: `// TODO: konfirmasi endpoint`.
   - Sediakan implementasi Mock Repository yang dapat diaktifkan melalui flag konfigurasi `AppConfig.useMockData`.

2. **Validasi Role Berdasarkan Respons Server**
   - Role asli ditentukan oleh token & respon autentikasi dari server (`user.role`), **bukan** dari tab selector yang ditekan pengguna di halaman login.
   - Jika role dari server tidak cocok dengan tab yang sedang aktif di UI login (misal tab "Pengguna" dipilih tetapi akun adalah role "admin"), batalkan proses login dan tampilkan pesan error yang jelas: `"Akun ini bukan akun {Role}"`.

3. **Kerahasiaan Biaya Tenaga Kerja (Hourly Costs)**
   - Kolom `hourly_costs` dan snapshot biaya `timesheet_entries.cost_amount` adalah **rahasia tingkat tinggi**.
   - **Jangan pernah** menampilkan atau memaparkan tarif per jam maupun `costAmount` kepada role `pengguna`.
   - Role `admin` dan `finance` hanya boleh menerima data agregat (per departemen/proyek). Jangan pernah memuat data per orang ke aplikasi mobile lalu menyembunyikannya di UI.

4. **Semua Logika Bisnis Dikelola di Server**
   - Server memegang kendali atas: batas persetujuan (`approval_limit`), deteksi pemecahan pengeluaran (`terindikasi_dipecah`), deteksi vendor baru (`vendor_baru`), perhitungan serapan biaya, dan status approval.
   - Aplikasi mobile adalah presentation layer yang menampilkan hasil kalkulasi server dan melakukan validasi input format di sisi klien.

5. **Penyimpanan Kredensial Aman**
   - Access token dan refresh token wajib disimpan menggunakan `flutter_secure_storage`.
   - **Dilarang keras** mencetak (log) token, password, atau data sensitif ke console / debugger.

6. **Aplikasi Wajib Online (No Offline Mode)**
   - Tidak ada sinkronisasi lokal transaksi atau local database (SQLite/Hive/Isar untuk transaksi).
   - Semua draft (timesheet draft, expense draft) disimpan di server.
   - Jika koneksi terputus, aplikasi harus menampilkan state layar penuh: `"Tidak ada koneksi"` disertai tombol `"Coba Lagi"`.

7. **Empat (4) State Wajib di Setiap Layar**
   Setiap layar yang memuat data wajib mengimplementasikan 4 state secara eksplisit:
   - **Loading State:** Menggunakan Shimmer / Skeleton List yang proporsional sesuai bentuk data (bukan sekadar `CircularProgressIndicator` polos di tengah).
   - **Data State:** Menampilkan konten sebenarnya ketika data berhasil dimuat.
   - **Empty State:** Menggunakan ilustrasi/ikon halus, judul bersahabat, deskripsi informatif, dan tombol aksi jika relevan.
   - **Error State:** Menampilkan pesan kesalahan dalam Bahasa Indonesia yang ramah disertai tombol `"Coba Lagi"` (retry).

8. **Disiplin Scope & Pertanyaan Diskrepansi**
   - Jangan menambahkan fitur di luar apa yang diminta pada prompt aktif tanpa persetujuan.
   - Jika terjadi ketidaksesuaian antara desain visual, dokumen bisnis, dan skema database, **berhenti dan tanyakan**, jangan membuat asumsi sepihak.

9. **Verifikasi Kualitas Berkala**
   - Setiap kali menyelesaikan tugas fitur/prompt:
     1. Jalankan `flutter analyze` dan pastikan tidak ada error maupun warning.
     2. Pastikan build proyek berjalan sukses.
     3. Tulis ringkasan jelas: daftar file yang dibuat/diubah, status pengujian, serta item yang masih `TODO`.

---

## 3. Tech Stack Mobile

- **SDK:** Flutter Stable terbaru (3.35+ / Dart 3.9+)
- **State Management:** Riverpod (`flutter_riverpod`, `riverpod_annotation`, `riverpod_generator`)
- **Navigasi & Routing:** `go_router` dengan redirect guards (autentikasi login, otorisasi role, dan penanganan wajib ganti kata sandi `mustChangePassword`)
- **HTTP Client & Jaringan:**
  - `dio` dengan interceptor khusus:
    - Injeksi otomatis header wajib `X-Client: mobile`.
    - Injeksi `Authorization: Bearer <token>`.
    - Refresh token otomatis saat menerima HTTP 401: panggil `/auth/refresh`, antre request yang tertahan, retry 1x.
    - Jika refresh token kedaluwarsa atau gagal: hapus token dari storage dan paksa logout ke layar login.
  - `connectivity_plus`: deteksi status koneksi internet secara reaktif.
- **Serialisasi Data:** `freezed` + `freezed_annotation`, `json_serializable`
  - Perlakuan khusus nilai uang `DECIMAL(18,2)`: parser kustom aman yang dapat menerima format string maupun number dari JSON.
- **Keamanan & Penyimpanan:** `flutter_secure_storage`
- **Lokalisasi:** `intl` (locale `id_ID`), format tanggal dan mata uang Rupiah.
- **Media & Kamera:** `image_picker`, `camera`, `flutter_image_compress`
- **Notifikasi:** `firebase_messaging` + `flutter_local_notifications`
- **UI & Tampilan:** `shimmer`, `google_fonts` (Inter), `package_info_plus`

---

## 4. Arsitektur Folder (Feature-First)

```
lib/
├── core/
│   ├── config/             # AppConfig (appName, baseUrl, useMockData, environment)
│   ├── theme/              # AppTheme, AppColors, AppTextStyles, AppSpacing, gradients
│   ├── network/            # DioClient, AuthInterceptor, ApiEndpoints, AppException, Connectivity
│   ├── storage/            # SecureStorageService, StorageKeys
│   ├── utils/              # Formatters (Rupiah, tanggal id_ID, zona Asia/Jakarta, Decimal converter)
│   ├── widgets/            # Reusable components: AppButton, AppTextField, StatusChip,
│   │                       # PriorityChip, GradientCard, EmptyState, ErrorState, SkeletonList,
│   │                       # AppBottomNav, AmountText
│   └── router/             # AppRouter, route names, route guards
└── features/
    ├── auth/               # Login, Ubah Kata Sandi (mustChangePassword), Logout
    ├── onboarding/         # Splash screen, Onboarding flow
    ├── dashboard/          # Dasbor peran (Pengguna, Admin, Finance)
    ├── tasks/              # Daftar task, detail task, update status task, checklist, komentar
    ├── timesheet/          # Entri timesheet mingguan, bar jam harian, ajukan timesheet
    ├── expenses/           # Daftar pengeluaran, form buat/edit pengeluaran, upload nota, nominal besar
    ├── notifications/      # Riwayat notifikasi in-app
    ├── profile/            # Profil akun, ganti sandi, logout
    └── approvals/          # Antrean persetujuan (Admin: Timesheet & Expense; Finance: Expense & Bayar)
```

Setiap feature memiliki 3 layer:
- **`data/`**: Model/DTO (`freezed`), Data Sources (Remote & Mock), Repositories implementation.
- **`domain/`**: Entities murni, Repository interfaces.
- **`presentation/`**: Pages/Screens, Feature-specific widgets, Riverpod providers / state.

---

## 5. Format & Lokalisasi

- **Bahasa UI:** 100% Bahasa Indonesia yang baku dan ramah (e.g., "Masuk", "Kata Sandi", "Tenggat", "Disetujui", "Ditolak", "Coba Lagi").
- **Format Tanggal:** Gaya Indonesia lengkap, contoh: `Jum'at, 09 Oktober 2026` atau format ringkas `16 Okt 2026`.
- **Format Mata Uang:** Simbol Rupiah dengan pemisah ribuan titik: `Rp 6.200.000` (atau `Rp 1.250.000,50` jika ada sen).
- **Zona Waktu:** Tampilan waktu pada klien dikonversi ke `Asia/Jakarta` (WIB), sementara database backend menyimpan waktu dalam format UTC ISO 8601.

---

## 6. Design System & Komponen UI (Berdasarkan Screenshot)

1. **Tipografi & Font:**
   - Font keluarga **Inter** (Google Fonts).
   - Hierarki teks rapi: Heading 1 (Bold 24-28), Heading 2 (Bold 20), Body 1 (Regular 15), Body 2 (Regular 13), Caption/Label (Medium 11-12).

2. **Palet Warna & Gradasi:**
   - **Gradasi Gelap (Signature):** Gradasi vertikal/diagonal ungu sangat tua (`#150324` → `#2B0B4D`) dengan efek glow radial merah muda / pink di pojok kanan atas (`#E8141C` / `#FF4D4D`). Digunakan pada Splash, Onboarding, Header Login, Kartu Target Mingguan, Header Profil.
   - **Warna Primer Elemen Aktif:** Ungu sangat tua (`#2B0B4D`).
   - **Warna Konten & Kartu:** Latar belakang aplikasi abu sangat muda / ungu lembut (`#F8F7FB`), kartu putih bersih (`#FFFFFF`) dengan border halus (`#EBE3E4`) dan bayangan lembut (*soft blur elevation*). Radius sudut kartu besar: `16` s.d. `24`.
   - **Aturan Warna Status & Bahaya:**
     - Status bahaya / penolakan / error **tidak boleh** menggunakan latar solid merah terang.
     - Gunakan latar lembut tint merah (`#FCE4E7`), teks merah gelap (`#B0000F`), border tipis merah, selalu disertai ikon penanda dan label teks.
     - Tombol Tolak: Latar putih, border abu-abu (`#EBE3E4`), teks merah gelap (`#B0000F`), ikon tanda silang (X).

3. **Floating Bottom Navigation Bar (Pill Navigation):**
   - Bentuk kapsul melayang (*pill navigation*) di bagian bawah layar dengan radius `999` dan bayangan lembut.
   - Memiliki 5 Tab utama:
     1. **Beranda** (`Icons.home_rounded`)
     2. **Task** (`Icons.check_box_outlined` / `Icons.task_alt_rounded`)
     3. **Jam** (Timesheet, `Icons.access_time_rounded`)
     4. **Biaya** (Pengeluaran, `Icons.receipt_long_rounded`)
     5. **Profil** (`Icons.person_rounded`)
   - Indikator tab aktif: Kotak rounded ungu sangat tua (`#2B0B4D`) dengan ikon putih solid, teks label tebal. Tab non-aktif: Ikon dan teks berwarna abu-abu netral.

4. **Chips & Status Badges:**
   - **Status Task:**
     - Belum Mulai: Abu-abu (`#F0EDF2`, teks `#6B5E60`)
     - Dikerjakan: Ungu muda (`#EDE4F8`, teks `#5E2796`)
     - Review: Oranye muda (`#FDF0DC`, teks `#9A5A0A`)
     - Selesai: Hijau lembut (`#E8F5E9`, teks `#2E7D32`)
   - **Prioritas Task:**
     - Tinggi: Merah muda (`#FCE4E7`, teks `#B0000F`)
     - Sedang: Oranye krem (`#FDF0DC`, teks `#9A5A0A`)
     - Rendah: Abu-abu (`#F0EDF2`, teks `#6B5E60`)
   - **Kategori Pengeluaran (Expense Categories):**
     - Tenaga Kerja: `#E8141C`
     - Material: `#F29D38`
     - Vendor: `#0A47B8`
     - Lain-lain: `#6B5E60`
     - *Prioritaskan warna hex yang dikirim dari API, gunakan nilai di atas sebagai fallback.*

---

## 7. Data, Autentikasi & Hak Akses (Berdasarkan Database & Backend)

1. **Struktur Peran (Role):**
   - Nilai enum database: `pengguna`, `admin`, `finance`, `super_admin`.
   - Aplikasi mobile hanya melayani peran: `pengguna`, `admin`, dan `finance`.
   - Jika pengguna dengan peran `super_admin` mencoba login ke mobile, tolak dengan respons HTTP 403 atau pesan: `"Akun Super Admin tidak dapat masuk ke aplikasi mobile"`.

2. **Alur Login & Perangkat:**
   - Request login wajib mengirimkan header: `X-Client: mobile`.
   - Body request: `email` dan `password`.
   - Backend memverifikasi hash argon2 dan mencatat token acak pada tabel `refresh_tokens`.
   - Payload respon login mengembalikan `accessToken`, `refreshToken`, `mustChangePassword`, serta objek `user`.
   - Jika `mustChangePassword == true` (atau 1), pengguna diarahkan secara paksa ke layar `/change-password` dan tidak dapat mengakses fitur lain sebelum mengganti password.
   - Saat logout, panggil endpoint `POST /auth/logout` dengan mengirimkan `{ "refreshToken": "<token>" }` agar token di-revoke dari database.

3. **Enum Dokumen & Rantai Persetujuan (Approval):**
   - **Task Status:** `belum_mulai`, `dikerjakan`, `review`, `selesai`.
   - **Timesheet Status:** `draft`, `menunggu_admin`, `disetujui`, `ditolak`.
     - Alur: Pengaju (Draft) → `submit` → `menunggu_admin` → Admin `approve` (Selesai) atau `reject`. Finance tidak terlibat dalam approval timesheet.
   - **Expense Status:** `draft`, `menunggu_admin`, `menunggu_finance`, `disetujui`, `ditolak`, `siap_dibayar`, `dibayar`.
     - Alur: Pengaju (Draft) → `submit` → `menunggu_admin` → Admin `approve` → `menunggu_finance` → Finance `verify` → `siap_dibayar` → Finance catat bayar → `dibayar`.
   - **Nominal Besar & Flags:**
     - Ditentukan server berdasarkan nilai `approval_limit` (saat ini Rp 5.000.000).
     - Mengharuskan lampiran nota dan catatan alasan (`note`).
     - Tampilkan badge `"Nominal Besar"`.
     - Flag `terindikasi_dipecah` dan `vendor_baru` pada tabel `expense_flags` hanya boleh ditampilkan ke peran `admin` dan `finance`.

---

## 8. Penanganan Diskrepansi Desain vs Database

| Komponen Desain | Kondisi Database & Backend | Solusi & Keputusan Teknis |
|---|---|---|
| **Judul Pengeluaran** (misal "Lisensi Figma") | Tabel `expenses` tidak memiliki kolom `title`. Hanya ada `vendor`, `note`, `categoryId`. | Gunakan `vendor` sebagai judul baris utama di UI kartu. Jika `vendor` kosong, gunakan nama kategori atau ringkasan `note`. |
| **Pilihan Fase di Form Pengeluaran** | Tabel `expenses` tidak memiliki foreign key `phase_id` (hanya `project_id` dan `cost_center_id`). | Jangan kirim `phaseId` ke API `/expenses`. Validasi form pengeluaran mobile cukup mewajibkan Proyek, Kategori, Nominal, Tanggal, Vendor, dan Nota. |
| **Nomor Telepon di Profil** | Tabel `users` tidak memiliki kolom `phone` atau `phone_number`. | Tampilkan field nomor telepon hanya jika server backend mengembalikannya dalam payload JSON. Jangan membuat field fiktif yang tidak disimpan ke server. |
| **Kode Dokumen (e.g. "EXP-0423")** | Tabel `expenses` tidak memiliki kolom kode kustom unik selain UUID `id`. | Gunakan kode dari API jika disediakan. Jika tidak, tampilkan potongan UUID: `EXP-${id.substring(0, 6).toUpperCase()}` dan beri tanda `// TODO: format kode resmi`. |
| **Cost Center Pengeluaran** | Kolom `expenses.costCenterId` bersifat wajib (`NOT NULL`) di database. | Ambil secara otomatis dari `projects.costCenterId` proyek yang dipilih saat pengajuan pengeluaran. Pengguna tidak perlu memilih cost center secara manual. |
| **Alasan Penolakan Pengeluaran** | Tabel `expenses` tidak menyimpan kolom `reject_reason` secara langsung. Alasan tersimpan di baris relasi `approvals.reason`. | Saat menampilkan pengeluaran berstatus `ditolak`, baca alasan penolakan dari riwayat approval terakhir yang memiliki status `ditolak`. |

---

## 9. Standar Koding & Pengujian

- **Arsitektur:** Mengutamakan imutabilitas (*immutable states*), pemisahan tanggung jawab (*separation of concerns*), dan dependency injection melalui Riverpod.
- **Error Handling:** Setiap pemanggilan API dibungkus oleh penanganan `AppException` yang memetakan kode status HTTP (400, 401, 403, 404, 422, 500) ke teks deskriptif Bahasa Indonesia.
- **Linting & Analisis:** Jalankan `flutter analyze` secara reguler. Bebas warning dan error linter sebelum menyerahkan hasil pengerjaan.

