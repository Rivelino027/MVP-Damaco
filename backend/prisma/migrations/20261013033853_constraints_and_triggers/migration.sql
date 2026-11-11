-- CHECK constraint on limit_change_requests
ALTER TABLE `limit_change_requests`
  ADD CONSTRAINT `chk_limit_change_roles`
  CHECK (
    `proposerRole` IN ('admin', 'finance') AND
    (`confirmerRole` IS NULL OR (`confirmerRole` IN ('admin', 'finance') AND `confirmerRole` <> `proposerRole`)) AND
    (`confirmedBy` IS NULL OR `confirmedBy` <> `proposedBy`)
  );

-- Append-only triggers on activity_logs
CREATE TRIGGER `activity_logs_no_update`
BEFORE UPDATE ON `activity_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_logs is append-only';

CREATE TRIGGER `activity_logs_no_delete`
BEFORE DELETE ON `activity_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_logs is append-only';