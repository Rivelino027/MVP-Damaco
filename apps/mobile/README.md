# DamacoFlow - Mobile Application (Flutter)

Aplikasi mobile resmi manajemen proyek dan budgeting untuk tim internal PT. Dunia Maya Communica.
Dibangun menggunakan **Flutter**, **Riverpod 2**, **GoRouter**, **Dio**, **FlutterSecureStorage**, dan integrasi **Firebase Cloud Messaging**.

---

## 1. Panduan Menjalankan Aplikasi (Dev & Prod)

### Prasyarat
- Flutter SDK 3.35+ (Dart 3.9+)
- Android Studio / Xcode (untuk build native) atau Chrome (untuk web preview)

### Menjalankan dalam Mode Pengembangan (Dev / Mock)
Secara default, aplikasi menggunakan mock data mandiri (`AppConfig.useMockData = true`) sehingga dapat langsung dijalankan tanpa backend lokal aktif:
```bash
cd apps/mobile
flutter pub get
flutter run -d chrome --web-port=8080
# atau untuk perangkat Android / Emulator:
flutter run
```

### Akun Uji Coba (Mock Mode)
| Role | Email | Kata Sandi | Deskripsi |
|---|---|---|---|
| **Pengguna** | `lilit@damacoflow.id` | `password123` | Akses Task, Timesheet, Pengeluaran, Profil |
| **Pengguna** | `rina.kusuma@budgetflow.id` | `password123` | Akun sesuai tangkapan layar desain profil |
| **Admin** | `ransink@damacoflow.id` | `password123` | Akses Antrean Persetujuan (Langkah 1), Task/Proyek |
| **Finance** | `mamas@damacoflow.id` | `password123` | Akses Verifikasi Pengeluaran & Pembayaran |

### Menjalankan Terhubung ke Backend NestJS (Production / Live API)
Ubah konfigurasi di `lib/core/config/app_config.dart` atau atur lewat environment variable:
```dart
static const bool useMockData = false;
static const String baseUrl = 'http://10.0.2.2:3000/api'; // untuk emulator Android
// static const String baseUrl = 'http://localhost:3000/api'; // untuk iOS Simulator / Web
```

---

## 2. Konfigurasi Lingkungan (Environment Variables)

Aplikasi menggunakan `AppConfig` terpusat di `lib/core/config/app_config.dart`:
```dart
class AppConfig {
  static const String appName = 'DamacoFlow';
  static const String appVersion = '1.0.0';
  static const String baseUrl = 'http://10.0.2.2:3000/api';
  static const bool useMockData = true;
  static const String supportEmail = 'support@damacoflow.id';
  static const String supportWhatsApp = '6281234567890';
}
```

---

## 3. Panduan Setup Push Notifications (Firebase FCM & APNs)

> [!CAUTION]
> **PENTING: JANGAN COMMIT FILE RAHASIA / KREDENSIAL KE REPOSITORI!**
> File `google-services.json`, `GoogleService-Info.plist`, sertifikat APNs, file `.p8`, `.keystore`, dan `.jks` telah dimasukkan ke `.gitignore` demi keamanan.

### A. Android Setup
1. Buat proyek di [Firebase Console](https://console.firebase.google.com/).
2. Daftarkan aplikasi Android dengan package `com.example.damacoflow`.
3. Unduh `google-services.json` dan letakkan di:
   ```
   apps/mobile/android/app/google-services.json
   ```
4. Izin notifikasi Android 13+ (`POST_NOTIFICATIONS`) sudah dideklarasikan di `AndroidManifest.xml`.

### B. iOS & APNs Setup
1. Daftarkan iOS app di Firebase Console dengan Bundle ID Anda.
2. Unduh `GoogleService-Info.plist` dan masukkan ke `apps/mobile/ios/Runner/` via Xcode.
3. Buat **APNs Authentication Key (.p8)** di Apple Developer Portal, lalu unggah ke Firebase Console > *Project Settings* > *Cloud Messaging*.
4. Di Xcode, aktifkan **Push Notifications** dan **Background Modes** (*Remote notifications*, *Background fetch*).

### C. Pemetaan Deep Link Notifikasi
| `refType` | Target Layar | Path Rute |
|---|---|---|
| `task` | Detail Task | `/tasks/:id` |
| `timesheet` | Tab Jam (Timesheet) | `/timesheet` |
| `expense` | Detail Pengeluaran | `/expenses/:id` |
| `approval` | Antrean Persetujuan | `/approvals` |
| `payment` | Daftar Pembayaran | `/payments` |
| *Lainnya* | Layar Notifikasi | `/notifications` |

---

## 4. Langkah Build APK, AAB, dan iOS

### Build Android APK & App Bundle (AAB)
```bash
cd apps/mobile

# 1. Bersihkan build cache
flutter clean
flutter pub get

# 2. Build APK Rilis (untuk distribusi manual/testing)
flutter build apk --release

# 3. Build Android App Bundle (AAB untuk Google Play Store)
flutter build appbundle --release
```
*File output:*
- APK: `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`
- AAB: `apps/mobile/build/app/outputs/bundle/release/app-release.aab`

### Build iOS (IPA / Archive)
```bash
cd apps/mobile
flutter clean
flutter pub get
cd ios && pod install && cd ..

# Build iOS Release
flutter build ipa --release
```
*Buka `ios/Runner.xcworkspace` di Xcode untuk arsip dan unggah ke TestFlight / App Store.*

---

## 5. Daftar TODO Endpoint yang Masih Mock / Perlu Konfirmasi Backend

| No | Modul | Endpoint | Status | Catatan / Tindak Lanjut |
|---|---|---|---|---|
| 1 | Pengeluaran | `POST /expenses` (field `title`) | Mock Ready | Di schema Prisma, tabel `expenses` belum memiliki kolom `title` (hanya `note` dan relasi `category`). Klien mobile menyematkan judul ke `note` atau payload kustom jika backend mengupdate DTO. |
| 2 | Pengeluaran | `POST /expenses` (field `phaseId`) | Mock Ready | Di skema DB `expenses`, tidak ada relasi langsung ke `Phase` melainkan melalui `Task`. Jika task tidak dipilih, `phaseId` disimpan sebagai metadata tambahan. |
| 3 | Profil Pengguna | `PATCH /users/me` (field `phoneNumber`) | Mock Ready | Tabel `users` di database Prisma tidak memiliki kolom `phoneNumber`. Field nomor telepon hanya tampil jika backend mengembalikannya pada respons `/users/me`. |
| 4 | Pengeluaran | `GET /expenses` (kode unik `EXP-xxx`) | Mock Ready | Nomor format `EXP-202610-001` dihasilkan di sisi presentasi/mock karena Prisma menggunakan `UUID()`. |
| 5 | Persetujuan | `POST /budget-requests/:id/approve` | Mock Ready | Endpoint persetujuan perubahan anggaran untuk peran Finance dan Admin. |

---

## 6. Daftar Temuan Desain vs Database & Pertanyaan Terbuka

| No | Komponen Desain | Kondisi Database / Bisnis | Solusi yang Diterapkan di Klien |
|---|---|---|---|
| 1 | **Judul Pengeluaran** | Tabel `expenses` hanya memiliki `note` dan `vendor`. | Klien mobile menyediakan input Judul wajib; saat submit remote, judul digabungkan ke catatan jika API belum menerima properti `title`. |
| 2 | **Fase Proyek di Form Pengeluaran** | `expenses` berelasi langsung ke `Project` dan opsional ke `Task`, bukan ke `Phase`. | Dropdown Fase tetap disediakan di UI form untuk memfilter task terkait. |
| 3 | **Nomor Telepon Pengguna** | Skema tabel `users` tidak menyimpan nomor telepon. | Input nomor telepon di *Edit Profil* hanya ditampilkan jika server mengembalikannya (`phoneNumber != null`). |
| 4 | **Kode Dokumen `EXP-xxx` & `TS-xxx`** | Primary key database menggunakan UUID v4. | Ditampilkan identifier berbasis tanggal dan ID pendek di UI tanpa mengekspos UUID mentah yang panjang. |
| 5 | **Kerahasiaan Biaya Tenaga Kerja** | `hourly_costs` dan `cost_amount` hanya boleh diakses oleh Super Admin. | UI Pengguna, Admin, dan Finance di mobile **tidak pernah memuat maupun menampilkan** tarif per jam atau biaya gaji individu. |

---

## 7. Status Pengujian Kualitas Kode (QA Checklist)
- **`flutter analyze`**: **100% Bersih** (0 errors, 0 warnings).
- **`flutter test`**: **106 dari 106 tes lulus** (16 test suites, 0 failures).
- **Aksesibilitas & Tampilan:**
  - Area sentuh minimal 44 x 44 px pada tombol dan item baris.
  - Label semantik (`Semantics`) pada ikon dan tombol tab.
  - Tampilan responsif pada layar sempit (lebar 360 px) tanpa *render overflow*.
  - *Haptic feedback* halus (`HapticFeedback.lightImpact()`) pada aksi persetujuan, penolakan, dan submit.
