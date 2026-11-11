-- Restore activity_logs_no_delete trigger to strict append-only (no exceptions).
DROP TRIGGER IF EXISTS `activity_logs_no_delete`;

CREATE TRIGGER `activity_logs_no_delete`
BEFORE DELETE ON `activity_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_logs is append-only';