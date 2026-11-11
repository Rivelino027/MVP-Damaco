-- Perbarui trigger DELETE pada activity_logs agar mendukung sesi cleanup tes.
-- Trigger mengecek session variable @allow_activity_log_delete.
-- Jika variabel tersebut = 1 (hanya dapat diset via raw SQL dalam sesi yang sama),
-- DELETE diizinkan — digunakan oleh setup/teardown tes saja.
-- Koneksi Prisma biasa tidak pernah menyetel variabel ini sehingga tetap append-only.

DROP TRIGGER IF EXISTS `activity_logs_no_delete`;

CREATE TRIGGER `activity_logs_no_delete`
BEFORE DELETE ON `activity_logs`
FOR EACH ROW
BEGIN
  IF @allow_activity_log_delete IS NULL OR @allow_activity_log_delete != 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_logs is append-only';
  END IF;
END;