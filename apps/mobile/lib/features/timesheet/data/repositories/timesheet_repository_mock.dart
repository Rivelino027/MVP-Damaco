import '../../domain/entities/timesheet_entity.dart';
import '../../domain/entities/timesheet_entry_entity.dart';
import '../../domain/repositories/timesheet_repository.dart';

class TimesheetRepositoryMock implements TimesheetRepository {
  // Database mock dalam memori
  final Map<String, TimesheetEntity> _mockTimesheets = {};

  TimesheetRepositoryMock() {
    _initMockData();
  }

  void _initMockData() {
    // 1. Minggu Berjalan: 12 - 18 Okt 2026 (Draft, 28 jam)
    final week1Start = DateTime.utc(2026, 10, 12);
    final key1 = _formatKey(week1Start);
    _mockTimesheets[key1] = TimesheetEntity(
      id: 'ts-2026-10-12',
      userId: 'usr-001',
      weekStart: week1Start,
      status: 'draft',
      entries: [
        // Senin, 12 Okt: 8 jam
        TimesheetEntryEntity(
          id: 'ent-1',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 10, 12),
          hours: 4.0,
          taskTitle: 'Konfigurasi VLAN lantai 2',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-2',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-3',
          workDate: DateTime.utc(2026, 10, 12),
          hours: 4.0,
          taskTitle: 'Migrasi Server',
          projectName: 'Migrasi Server',
        ),

        // Selasa, 13 Okt: 8 jam
        TimesheetEntryEntity(
          id: 'ent-3',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-4',
          workDate: DateTime.utc(2026, 10, 13),
          hours: 4.0,
          taskTitle: 'Backup server utama',
          projectName: 'Migrasi Server',
        ),
        TimesheetEntryEntity(
          id: 'ent-4',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-2',
          workDate: DateTime.utc(2026, 10, 13),
          hours: 4.0,
          taskTitle: 'Dokumentasi topologi jaring..',
          projectName: 'Renovasi Lab Jaringan',
        ),

        // Rabu, 14 Okt: 7 jam
        TimesheetEntryEntity(
          id: 'ent-5',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 10, 14),
          hours: 4.0,
          taskTitle: 'Konfigurasi VLAN lantai 2',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-6',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-3',
          workDate: DateTime.utc(2026, 10, 14),
          hours: 3.0,
          taskTitle: 'Setup monitoring server baru',
          projectName: 'Migrasi Server',
        ),

        // Kamis, 15 Okt: 5 jam
        TimesheetEntryEntity(
          id: 'ent-7',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-7',
          workDate: DateTime.utc(2026, 10, 15),
          hours: 2.0,
          taskTitle: 'Uji koneksi antar cabang',
          projectName: 'Aplikasi Mobile Cabang',
        ),
        TimesheetEntryEntity(
          id: 'ent-8',
          timesheetId: 'ts-2026-10-12',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 10, 15),
          hours: 3.0,
          taskTitle: 'Konfigurasi VLAN lantai 2',
          projectName: 'Renovasi Lab Jaringan',
        ),
      ],
    );

    // 2. Minggu Lalu: 05 - 11 Okt 2026 (Disetujui, 40 jam)
    final week2Start = DateTime.utc(2026, 10, 5);
    final key2 = _formatKey(week2Start);
    _mockTimesheets[key2] = TimesheetEntity(
      id: 'ts-2026-10-05',
      userId: 'usr-001',
      weekStart: week2Start,
      status: 'disetujui',
      approvedBy: 'Ransink',
      approvedAt: DateTime.utc(2026, 10, 11, 10, 0),
      entries: [
        TimesheetEntryEntity(
          id: 'ent-11',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-8',
          workDate: DateTime.utc(2026, 10, 5),
          hours: 8.0,
          taskTitle: 'Inventarisasi perangkat lab',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-12',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-8',
          workDate: DateTime.utc(2026, 10, 6),
          hours: 8.0,
          taskTitle: 'Inventarisasi perangkat lab',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-13',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-4',
          workDate: DateTime.utc(2026, 10, 7),
          hours: 4.0,
          taskTitle: 'Backup server utama',
          projectName: 'Migrasi Server',
        ),
        TimesheetEntryEntity(
          id: 'ent-14',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 10, 7),
          hours: 4.0,
          taskTitle: 'Konfigurasi VLAN lantai 2',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-15',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 10, 8),
          hours: 8.0,
          taskTitle: 'Konfigurasi VLAN lantai 2',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-16',
          timesheetId: 'ts-2026-10-05',
          taskId: 'task-7',
          workDate: DateTime.utc(2026, 10, 9),
          hours: 8.0,
          taskTitle: 'Uji koneksi antar cabang',
          projectName: 'Aplikasi Mobile Cabang',
        ),
      ],
    );

    // 3. Dua Minggu Lalu: 28 Sep - 04 Okt 2026 (Ditolak)
    final week3Start = DateTime.utc(2026, 9, 28);
    final key3 = _formatKey(week3Start);
    _mockTimesheets[key3] = TimesheetEntity(
      id: 'ts-2026-09-28',
      userId: 'usr-001',
      weekStart: week3Start,
      status: 'ditolak',
      rejectReason: 'Jam kerja hari Rabu tidak sesuai dengan log server jaringan.',
      entries: [
        TimesheetEntryEntity(
          id: 'ent-21',
          timesheetId: 'ts-2026-09-28',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 9, 28),
          hours: 8.0,
          taskTitle: 'Konfigurasi switch utama',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-22',
          timesheetId: 'ts-2026-09-28',
          taskId: 'task-1',
          workDate: DateTime.utc(2026, 9, 29),
          hours: 8.0,
          taskTitle: 'Konfigurasi switch utama',
          projectName: 'Renovasi Lab Jaringan',
        ),
        TimesheetEntryEntity(
          id: 'ent-23',
          timesheetId: 'ts-2026-09-28',
          taskId: 'task-4',
          workDate: DateTime.utc(2026, 9, 30),
          hours: 8.0,
          taskTitle: 'Maintenance server',
          projectName: 'Migrasi Server',
        ),
        TimesheetEntryEntity(
          id: 'ent-24',
          timesheetId: 'ts-2026-09-28',
          taskId: 'task-3',
          workDate: DateTime.utc(2026, 10, 1),
          hours: 8.0,
          taskTitle: 'Monitoring setup',
          projectName: 'Migrasi Server',
        ),
      ],
    );
  }

  String _formatKey(DateTime date) {
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }

  @override
  Future<TimesheetEntity?> getTimesheetForWeek(DateTime weekStart) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final key = _formatKey(weekStart);
    if (_mockTimesheets.containsKey(key)) {
      return _mockTimesheets[key];
    }

    // Buat draft kosong baru jika belum ada untuk minggu tersebut
    final newTs = TimesheetEntity(
      id: 'ts-$key',
      userId: 'usr-001',
      weekStart: weekStart,
      status: 'draft',
      entries: [],
    );
    _mockTimesheets[key] = newTs;
    return newTs;
  }

  @override
  Future<TimesheetEntity> saveTimesheet(TimesheetEntity timesheet) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final key = _formatKey(timesheet.weekStart);
    _mockTimesheets[key] = timesheet;
    return timesheet;
  }

  @override
  Future<TimesheetEntity> submitTimesheet(String timesheetId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    for (final entry in _mockTimesheets.entries) {
      if (entry.value.id == timesheetId) {
        final submitted = entry.value.copyWith(
          status: 'menunggu_admin',
          submittedAt: DateTime.now(),
        );
        _mockTimesheets[entry.key] = submitted;
        return submitted;
      }
    }
    throw Exception('Timesheet tidak ditemukan');
  }
}

