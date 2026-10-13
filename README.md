# BudgetFlow

Aplikasi manajemen proyek dan budgeting untuk tim internal PT. Dunia Maya Communica.
Konsep inti: **setiap task memiliki biaya**, sehingga progres kerja dan serapan anggaran terbaca secara real-time bersamaan.

---

## 📁 Struktur Monorepo

```text
├── apps/
│   ├── mobile/         # Aplikasi mobile Flutter (iOS & Android)
│   └── web_admin/      # Aplikasi web dashboard React + Vite + TypeScript
├── backend/            # Backend API NestJS + Prisma ORM + MariaDB
├── design-tokens/      # Sumber kebenaran token desain (warna, font, radius, logo)
├── docs/               # Dokumentasi aturan bisnis, database, desain, & roadmap
└── README.md           # Panduan menjalankan proyek
```

---

## 🛠️ Prasyarat Sistem

1. **Sistem Operasi**: Windows (PowerShell).
2. **Node.js & npm**: Node.js v20+ atau v22+ (rekomendasi LTS).
3. **Database**: MariaDB 10.4.32 dari **XAMPP**.
   - Host: `127.0.0.1`
   - Port: `3306`
   - User: `root` (tanpa password)
   - Database: `budgetflow`
4. **Tanpa Docker**: Proyek ini dijalankan secara native tanpa Docker.

---

## 🚀 Panduan Menjalankan Backend dari Nol (XAMPP / MariaDB)

### 1. Menyiapkan Database di XAMPP
1. Buka **XAMPP Control Panel**.
2. Klik tombol **Start** pada modul **MySQL** (MariaDB) dan pastikan port `3306` aktif.
3. Buka PowerShell dan pastikan database `budgetflow` telah dibuat:
   ```powershell
   mysql -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS budgetflow;"
   ```
   *(Atau buat melalui browser di phpMyAdmin `http://127.0.0.1/phpmyadmin`)*.

---

### 2. Konfigurasi Environment Backend
1. Masuk ke direktori `backend`:
   ```powershell
   cd backend
   ```
2. Salin file template `.env.example` menjadi `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Buka file `.env` dengan text editor Anda dan isi nilai secret (minimal 32 karakter):
   ```env
   DATABASE_URL="mysql://root@127.0.0.1:3306/budgetflow"
   JWT_ACCESS_SECRET="ganti_dengan_secret_access_minimal_32_karakter_acak"
   JWT_REFRESH_SECRET="ganti_dengan_secret_refresh_minimal_32_karakter_acak"
   PORT=3000
   ```
   > ⚠️ **Catatan Keamanan**:
   > Aplikasi dilengkapi validasi saat bootstrap. Aplikasi akan gagal berjalan jika `DATABASE_URL` kosong atau jika `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` kosong atau kurang dari 32 karakter. File `.env` tidak boleh di-commit ke Git.

---

### 3. Instalasi Dependensi
Jalankan perintah berikut di direktori `backend`:
```powershell
npm install
```

---

### 4. Validasi & Sinkronisasi Database (Prisma)
1. Validasi struktur schema Prisma:
   ```powershell
   npx prisma validate
   ```
2. Generate Prisma Client:
   ```powershell
   npx prisma generate
   ```
3. Sinkronkan schema ke database MariaDB `budgetflow`:
   ```powershell
   npx prisma db push
   ```

---

### 5. Menjalankan Aplikasi
Jalankan backend dalam mode development:
```powershell
npm run start:dev
```

Setelah server berjalan:
- **Health Check API**: [http://127.0.0.1:3000/health](http://127.0.0.1:3000/health) (memverifikasi koneksi database MariaDB)
- **Dokumentasi Swagger**: [http://127.0.0.1:3000/docs-api](http://127.0.0.1:3000/docs-api)

---

### 6. Menjalankan Pengujian (Testing) & Lint
Untuk menjalankan unit test:
```powershell
npm test
```

Untuk menjalankan pemeriksaan linting dan formatting:
```powershell
npm run lint
```
