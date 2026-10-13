# BudgetFlow: Database (PostgreSQL)

Sumber kebenaran struktur: `backend/prisma/schema.prisma`. Dokumen ini menjelaskan maksud tabel dan aturan yang tidak bisa dinyatakan oleh Prisma.

Semua tabel punya `id` (UUID), `created_at`, dan umumnya `updated_at`. Tabel user, proyek, task, departemen memakai `deleted_at` (soft delete). Uang `NUMERIC(18,2)` dalam Rupiah.

## 1. Daftar tabel

### Akses dan organisasi
| Tabel | Isi |
|---|---|
| `users` | Akun. `role` satu nilai (pengguna, admin, finance, super_admin), `department_id`, `is_active`, `last_login_at` |
| `departments` | Departemen, `head_user_id`, `annual_budget` |
| `cost_centers` | `code` unik, milik satu departemen |
| `refresh_tokens` | Hash token, `expires_at`, `revoked_at` |
| `password_resets` | Token reset sekali pakai |

### Master data
| Tabel | Isi |
|---|---|
| `expense_categories` | Tenaga Kerja, Material, Vendor, Lain-lain (kode dan warna) |
| `project_types` | Jenis proyek |

### Proyek dan task
| Tabel | Isi |
|---|---|
| `projects` | Departemen, cost center, status (diajukan, berjalan, ditutup), `progress_percent` |
| `project_members` | Anggota proyek, unik per pasangan |
| `phases`, `milestones` | Fase dan tonggak |
| `tasks` | Assignee, status, prioritas, tenggat, `estimated_hours` |
| `task_checklists`, `task_comments` | Checklist dan komentar |
| `attachments` | Polimorfik (`owner_type` task, expense, payment + `owner_id`, tanpa FK) untuk lampiran task, foto nota, bukti transfer |

### Anggaran
| Tabel | Isi |
|---|---|
| `budgets` | Versi anggaran per proyek, `is_baseline`, `locked_at` |
| `budget_items` | Anggaran per fase dan kategori |
| `budget_requests` | Pengajuan anggaran awal atau perubahan (dipakai juga untuk addendum), status rantai |
| `budget_request_items` | Rincian lama vs baru per fase dan kategori |

### Waktu dan biaya tenaga kerja
| Tabel | Isi |
|---|---|
| `timesheets` | Satu per user per minggu (unik `user_id + week_start`) |
| `timesheet_entries` | Jam per task per hari. `cost_amount` = snapshot jam x tarif, RAHASIA |
| `hourly_costs` | Tarif per jam per user dengan `effective_from`. RAHASIA, super_admin saja |

### Pengeluaran dan pembayaran
| Tabel | Isi |
|---|---|
| `expenses` | Pengeluaran, `is_large_amount`, `limit_at_submission`, status 7 tahap |
| `payments` | Satu pembayaran per pengeluaran, dicatat Finance |
| `expense_flags` | Penanda `terindikasi_dipecah` atau `vendor_baru` dari job deteksi |

### Persetujuan dan batas
| Tabel | Isi |
|---|---|
| `approval_rules` | Urutan peran per jenis dokumen (konfigurasi rantai) |
| `approvals` | Satu baris per langkah per dokumen: siapa, kapan, alasan |
| `approval_limit` | Batas Nominal Besar berlaku |
| `limit_change_requests` | Usul dan konfirmasi perubahan batas |

### Sistem
| Tabel | Isi |
|---|---|
| `notifications`, `device_tokens` | Notifikasi in-app dan token FCM |
| `activity_logs` | Audit, append-only, `before_data` dan `after_data` (JSONB) |
| `app_settings` | Pengaturan (ambang serapan, jendela deteksi pemecahan, periode anggaran) |

## 2. Relasi utama

```
departments 1-N cost_centers 1-N projects
departments 1-N users
projects 1-N phases 1-N tasks 1-N timesheet_entries N-1 timesheets N-1 users
projects 1-N budgets 1-N budget_items (per phase dan category)
projects 1-N budget_requests 1-N budget_request_items
projects 1-N expenses 1-1 payments
expenses / timesheets / budget_requests 1-N approvals (document_type + document_id)
users 1-N hourly_costs
approval_limit 1-N limit_change_requests
```

Tiga hubungan inti produk: task terhubung ke anggaran (lewat fase dan kategori), timesheet dikali tarif menjadi biaya tenaga kerja, setiap pengeluaran melewati rantai persetujuan.

## 3. Aturan yang harus ditegakkan di luar Prisma

| Aturan | Cara |
|---|---|
| `limit_change_requests`: `proposer_role` dan `confirmer_role` hanya admin atau finance, keduanya berbeda, `proposed_by <> confirmed_by` | CHECK constraint (migrasi SQL mentah) plus validasi service |
| `activity_logs` tidak boleh diubah atau dihapus | Trigger yang menolak UPDATE dan DELETE |
| `hourly_costs` dan `timesheet_entries.cost_amount` hanya dibaca super_admin | Service khusus, tidak ada endpoint per orang untuk peran lain. Admin dan Finance memakai query agregat terpisah |
| Agregat biaya tenaga kerja untuk Finance | Jika proyek punya kurang dari 2 orang yang mencatat jam, tampilkan di level departemen |
| `expenses.is_large_amount` dan `limit_at_submission` | Dihitung saat pengajuan, tidak dihitung ulang kemudian |
| Pengajuan Nominal Besar wajib punya nota dan `note` | Validasi di backend (400) |
| `attachments.owner_id` harus mengarah ke baris yang ada | Validasi di service |
| Anggaran terkunci (`is_baseline`, `locked_at`) tidak boleh diedit | Perubahan lewat `budget_requests` |
| Task assignee harus anggota proyek, cost center harus milik departemen proyek | Validasi di service |
| Pengaju tidak boleh menyetujui dokumennya sendiri | Validasi di service persetujuan |

## 4. Seed awal

- Departemen: IT, Finance, Operasional, HR. Cost center: IT-Product-01, FIN-01, OPS-01, HR-01.
- Kategori biaya: Tenaga Kerja, Material, Vendor, Lain-lain.
- `approval_rules`: timesheet [admin]; expense [admin, finance]; budget_request [admin, finance, super_admin].
- `approval_limit` awal Rp5.000.000 (angka contoh, diubah Admin dan Finance).
- `app_settings`: ambang peringatan serapan 80, jendela deteksi pemecahan 7 hari.
- Satu akun per peran dengan password acak yang dicetak sekali di terminal (tidak disimpan di file).

## 5. Indeks penting

`users(role)`, `users(department_id)`, `projects(department_id, status)`, `tasks(project_id, assignee_id, status)`, `timesheets(user_id, week_start)`, `expenses(requester_id, project_id, status)`, `expenses(is_large_amount, status)`, `approvals(document_type, document_id)`, `approvals(role, status)`, `activity_logs(module, created_at)`, `notifications(user_id, read_at)`.

## 6. Tahap 2 (belum dibuat)

`purchase_orders`, `po_items` (komitmen biaya), `project_templates`, `template_phases`, `template_tasks`, `import_jobs` (impor Excel).
