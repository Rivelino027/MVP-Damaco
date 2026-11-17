import '../entities/timesheet_entity.dart';

abstract class TimesheetRepository {
  /// Mengambil data timesheet milik pengguna login pada minggu tertentu (dimulai hari Senin)
  Future<TimesheetEntity?> getTimesheetForWeek(DateTime weekStart);

  /// Menyimpan entri timesheet (membuat baru jika belum ada, atau memperbarui jika draft/ditolak)
  Future<TimesheetEntity> saveTimesheet(TimesheetEntity timesheet);

  /// Mengajukan timesheet ke Admin untuk disetujui
  Future<TimesheetEntity> submitTimesheet(String timesheetId);
}

