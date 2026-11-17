import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/repositories/timesheet_repository_mock.dart';
import '../../data/repositories/timesheet_repository_remote.dart';
import '../../domain/entities/timesheet_entity.dart';
import '../../domain/entities/timesheet_entry_entity.dart';
import '../../domain/repositories/timesheet_repository.dart';

final timesheetRepositoryProvider = Provider<TimesheetRepository>((ref) {
  if (AppConfig.useMockData) {
    return TimesheetRepositoryMock();
  }
  return TimesheetRepositoryRemote(ref.watch(dioProvider));
});

DateTime getMondayOfWeek(DateTime date) {
  final d = DateTime.utc(date.year, date.month, date.day);
  return d.subtract(Duration(days: d.weekday - 1));
}

/// Minggu yang sedang dipilih (selalu hari Senin UTC)
final selectedWeekStartProvider = StateProvider<DateTime>((ref) {
  if (AppConfig.useMockData) {
    return DateTime.utc(2026, 10, 12);
  }
  return getMondayOfWeek(DateTime.now());
});

/// Indeks hari yang dipilih dalam minggu:
/// 0 = Sen, 1 = Sel, 2 = Rab, 3 = Kam, 4 = Jum, 5 = Sab, 6 = Min
final selectedDayIndexProvider = StateProvider<int>((ref) => 4); // Default Jum'at

/// Tanggal pasti dari hari yang sedang aktif dipilih
final selectedDateProvider = Provider.autoDispose<DateTime>((ref) {
  final weekStart = ref.watch(selectedWeekStartProvider);
  final dayIndex = ref.watch(selectedDayIndexProvider);
  return weekStart.add(Duration(days: dayIndex));
});

class TimesheetNotifier extends AutoDisposeAsyncNotifier<TimesheetEntity> {
  @override
  Future<TimesheetEntity> build() async {
    final repo = ref.watch(timesheetRepositoryProvider);
    final weekStart = ref.watch(selectedWeekStartProvider);
    final ts = await repo.getTimesheetForWeek(weekStart);
    if (ts == null) {
      return TimesheetEntity(
        id: '',
        userId: 'usr-001',
        weekStart: weekStart,
        status: 'draft',
        entries: [],
      );
    }
    return ts;
  }

  void previousWeek() {
    final current = ref.read(selectedWeekStartProvider);
    ref.read(selectedWeekStartProvider.notifier).state =
        current.subtract(const Duration(days: 7));
  }

  void nextWeek() {
    final current = ref.read(selectedWeekStartProvider);
    ref.read(selectedWeekStartProvider.notifier).state =
        current.add(const Duration(days: 7));
  }

  void selectDay(int index) {
    ref.read(selectedDayIndexProvider.notifier).state = index;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(timesheetRepositoryProvider);
      final weekStart = ref.read(selectedWeekStartProvider);
      final ts = await repo.getTimesheetForWeek(weekStart);
      return ts ??
          TimesheetEntity(
            id: '',
            userId: 'usr-001',
            weekStart: weekStart,
            status: 'draft',
            entries: [],
          );
    });
  }

  /// Ubah jam kerja pada sebuah entri dengan stepper (kelipatan 0.5 jam, max 24 jam/hari)
  Future<void> updateEntryHours(String entryId, double newHours) async {
    final current = state.value;
    if (current == null || !current.isEditable) return;

    if (newHours <= 0) {
      await deleteEntry(entryId);
      return;
    }

    final targetIndex = current.entries.indexWhere((e) => e.id == entryId);
    if (targetIndex == -1) return;
    final targetEntry = current.entries[targetIndex];

    final dayEntries = current.entriesForDate(targetEntry.workDate);
    final currentOtherHours = dayEntries
        .where((e) => e.id != entryId)
        .fold<double>(0.0, (sum, e) => sum + e.hours);

    if (currentOtherHours + newHours > 24.0) {
      throw AppException(
          message: 'Total jam kerja per hari tidak boleh melebihi 24 jam');
    }

    final updatedEntries = List<TimesheetEntryEntity>.from(current.entries);
    updatedEntries[targetIndex] = targetEntry.copyWith(hours: newHours);

    final updatedTs = current.copyWith(entries: updatedEntries);
    state = AsyncValue.data(updatedTs);

    final repo = ref.read(timesheetRepositoryProvider);
    final saved = await repo.saveTimesheet(updatedTs);
    state = AsyncValue.data(saved);
  }

  /// Menambah entri baru ke timesheet
  Future<void> addEntry({
    required String taskId,
    required DateTime workDate,
    required double hours,
    String? note,
    String? taskTitle,
    String? projectName,
  }) async {
    final current = state.value;
    if (current == null || !current.isEditable) return;

    final dayHours = current.totalHoursForDate(workDate);
    if (dayHours + hours > 24.0) {
      throw AppException(
          message: 'Total jam kerja per hari tidak boleh melebihi 24 jam');
    }

    final newEntry = TimesheetEntryEntity(
      id: 'ent-${DateTime.now().millisecondsSinceEpoch}',
      timesheetId: current.id,
      taskId: taskId,
      workDate: workDate,
      hours: hours,
      note: note,
      taskTitle: taskTitle,
      projectName: projectName,
    );

    final updatedTs = current.copyWith(entries: [...current.entries, newEntry]);
    state = AsyncValue.data(updatedTs);

    final repo = ref.read(timesheetRepositoryProvider);
    final saved = await repo.saveTimesheet(updatedTs);
    state = AsyncValue.data(saved);
  }

  /// Menghapus entri jam kerja
  Future<void> deleteEntry(String entryId) async {
    final current = state.value;
    if (current == null || !current.isEditable) return;

    final updatedEntries =
        current.entries.where((e) => e.id != entryId).toList();
    final updatedTs = current.copyWith(entries: updatedEntries);
    state = AsyncValue.data(updatedTs);

    final repo = ref.read(timesheetRepositoryProvider);
    final saved = await repo.saveTimesheet(updatedTs);
    state = AsyncValue.data(saved);
  }

  /// Mengajukan timesheet ke Admin
  Future<TimesheetEntity> submitTimesheet() async {
    final current = state.value;
    if (current == null || !current.canSubmit) {
      throw AppException(
          message: 'Timesheet tidak dapat diajukan (belum ada entri jam atau sedang diproses).');
    }

    final repo = ref.read(timesheetRepositoryProvider);
    var tsToSubmit = current;
    if (tsToSubmit.id.isEmpty) {
      tsToSubmit = await repo.saveTimesheet(tsToSubmit);
    }
    final submitted = await repo.submitTimesheet(tsToSubmit.id);
    state = AsyncValue.data(submitted);
    return submitted;
  }
}

final timesheetProvider =
    AutoDisposeAsyncNotifierProvider<TimesheetNotifier, TimesheetEntity>(
  TimesheetNotifier.new,
);

/// Entri untuk hari yang sedang dipilih
final selectedDayEntriesProvider =
    Provider.autoDispose<List<TimesheetEntryEntity>>((ref) {
  final tsAsync = ref.watch(timesheetProvider);
  final selectedDate = ref.watch(selectedDateProvider);
  return tsAsync.maybeWhen(
    data: (ts) => ts.entriesForDate(selectedDate),
    orElse: () => [],
  );
});

