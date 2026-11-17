import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/features/timesheet/domain/entities/timesheet_entity.dart';
import 'package:damacoflow/features/timesheet/domain/entities/timesheet_entry_entity.dart';
import 'package:damacoflow/features/timesheet/data/repositories/timesheet_repository_mock.dart';

void main() {
  group('TimesheetEntity - Perhitungan Jam & Target', () {
    final monday = DateTime.utc(2026, 10, 12);

    test('Menghitung total jam mingguan dengan benar dari entri', () {
      final timesheet = TimesheetEntity(
        id: 'ts-1',
        userId: 'usr-1',
        weekStart: monday,
        status: 'draft',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 4.0,
          ),
          TimesheetEntryEntity(
            id: 'e2',
            taskId: 't2',
            workDate: monday,
            hours: 4.0,
          ),
          TimesheetEntryEntity(
            id: 'e3',
            taskId: 't1',
            workDate: monday.add(const Duration(days: 1)),
            hours: 7.5,
          ),
        ],
      );

      expect(timesheet.totalHours, equals(15.5));
      expect(timesheet.remainingHours, equals(24.5)); // 40 - 15.5
      expect(timesheet.isTargetReached, isFalse);
    });

    test('Mendeteksi target tercapai saat jam >= 40 jam', () {
      final timesheet = TimesheetEntity(
        id: 'ts-2',
        userId: 'usr-1',
        weekStart: monday,
        status: 'disetujui',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 40.0,
          ),
        ],
      );

      expect(timesheet.totalHours, equals(40.0));
      expect(timesheet.remainingHours, equals(0.0));
      expect(timesheet.isTargetReached, isTrue);
    });

    test('Menghitung total jam harian dan memfilter entri per tanggal', () {
      final tuesday = monday.add(const Duration(days: 1));
      final timesheet = TimesheetEntity(
        id: 'ts-3',
        userId: 'usr-1',
        weekStart: monday,
        status: 'draft',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 3.5,
          ),
          TimesheetEntryEntity(
            id: 'e2',
            taskId: 't2',
            workDate: monday,
            hours: 4.5,
          ),
          TimesheetEntryEntity(
            id: 'e3',
            taskId: 't3',
            workDate: tuesday,
            hours: 8.0,
          ),
        ],
      );

      expect(timesheet.totalHoursForDate(monday), equals(8.0));
      expect(timesheet.entriesForDate(monday).length, equals(2));

      expect(timesheet.totalHoursForDate(tuesday), equals(8.0));
      expect(timesheet.entriesForDate(tuesday).length, equals(1));

      final wednesday = monday.add(const Duration(days: 2));
      expect(timesheet.totalHoursForDate(wednesday), equals(0.0));
      expect(timesheet.entriesForDate(wednesday), isEmpty);
    });
  });

  group('TimesheetEntity - Aturan canSubmit & isEditable', () {
    final monday = DateTime.utc(2026, 10, 12);

    test('Draft dengan entri > 0 jam BISA diajukan (canSubmit == true, isEditable == true)', () {
      final ts = TimesheetEntity(
        id: 'ts-draft',
        userId: 'usr-1',
        weekStart: monday,
        status: 'draft',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 4.0,
          ),
        ],
      );

      expect(ts.isEditable, isTrue);
      expect(ts.canSubmit, isTrue);
    });

    test('Draft tanpa entri (0 jam) TIDAK BISA diajukan (canSubmit == false, isEditable == true)', () {
      final ts = TimesheetEntity(
        id: 'ts-empty',
        userId: 'usr-1',
        weekStart: monday,
        status: 'draft',
        entries: [],
      );

      expect(ts.isEditable, isTrue);
      expect(ts.canSubmit, isFalse);
    });

    test('Ditolak dengan entri BISA diajukan ulang dan diedit', () {
      final ts = TimesheetEntity(
        id: 'ts-ditolak',
        userId: 'usr-1',
        weekStart: monday,
        status: 'ditolak',
        rejectReason: 'Log tidak cocok',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 6.0,
          ),
        ],
      );

      expect(ts.isEditable, isTrue);
      expect(ts.canSubmit, isTrue);
    });

    test('Menunggu Admin dalam mode baca-saja dan TIDAK BISA diajukan', () {
      final ts = TimesheetEntity(
        id: 'ts-pending',
        userId: 'usr-1',
        weekStart: monday,
        status: 'menunggu_admin',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 8.0,
          ),
        ],
      );

      expect(ts.isEditable, isFalse);
      expect(ts.canSubmit, isFalse);
    });

    test('Disetujui dalam mode terkunci dan TIDAK BISA diajukan', () {
      final ts = TimesheetEntity(
        id: 'ts-approved',
        userId: 'usr-1',
        weekStart: monday,
        status: 'disetujui',
        entries: [
          TimesheetEntryEntity(
            id: 'e1',
            taskId: 't1',
            workDate: monday,
            hours: 40.0,
          ),
        ],
      );

      expect(ts.isEditable, isFalse);
      expect(ts.canSubmit, isFalse);
    });
  });

  group('TimesheetRepositoryMock - Operasi Data', () {
    test('Mengambil timesheet mock minggu berjalan 12 - 18 Okt 2026', () async {
      final mock = TimesheetRepositoryMock();
      final monday = DateTime.utc(2026, 10, 12);

      final ts = await mock.getTimesheetForWeek(monday);
      expect(ts, isNotNull);
      expect(ts!.status, equals('draft'));
      expect(ts.totalHours, equals(28.0));
      expect(ts.remainingHours, equals(12.0));
      expect(ts.entries.length, equals(8));
    });

    test('Mengajukan timesheet berhasil mengubah status menjadi menunggu_admin', () async {
      final mock = TimesheetRepositoryMock();
      final monday = DateTime.utc(2026, 10, 12);

      final initial = await mock.getTimesheetForWeek(monday);
      expect(initial!.status, equals('draft'));

      final submitted = await mock.submitTimesheet(initial.id);
      expect(submitted.status, equals('menunggu_admin'));
      expect(submitted.isEditable, isFalse);
      expect(submitted.canSubmit, isFalse);
    });
  });
}

