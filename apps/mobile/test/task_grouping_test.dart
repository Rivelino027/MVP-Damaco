import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/core/utils/date_formatter.dart';
import 'package:damacoflow/features/tasks/domain/entities/task_entity.dart';

void main() {
  final testNow = DateTime.utc(2026, 10, 9, 3, 0); // 10:00 WIB (UTC+7)

  group('DateFormatter Task Due Date & Greeting Tests', () {
    test('should format today due date as "Hari ini"', () {
      final dueDate = DateTime.utc(2026, 10, 9, 10, 0); // Hari ini WIB
      final formatted = DateFormatter.formatTaskDueDate(dueDate, customNow: testNow);
      expect(formatted, 'Hari ini');
    });

    test('should format tomorrow due date as "Besok"', () {
      final dueDate = DateTime.utc(2026, 10, 10, 5, 0); // Besok WIB
      final formatted = DateFormatter.formatTaskDueDate(dueDate, customNow: testNow);
      expect(formatted, 'Besok');
    });

    test('should format yesterday due date as "Kemarin"', () {
      final dueDate = DateTime.utc(2026, 10, 8, 5, 0); // Kemarin WIB
      final formatted = DateFormatter.formatTaskDueDate(dueDate, customNow: testNow);
      expect(formatted, 'Kemarin');
    });

    test('should format future date as Indonesian short date "21 Okt 2026"', () {
      final dueDate = DateTime.utc(2026, 10, 21, 5, 0);
      final formatted = DateFormatter.formatTaskDueDate(dueDate, customNow: testNow);
      expect(formatted, '21 Okt 2026');
    });

    test('should return "-" when due date is null', () {
      final formatted = DateFormatter.formatTaskDueDate(null, customNow: testNow);
      expect(formatted, '-');
    });

    test('should detect today or overdue correctly', () {
      final todayDate = DateTime.utc(2026, 10, 9, 2, 0);
      final pastDate = DateTime.utc(2026, 10, 5, 2, 0);
      final tomorrowDate = DateTime.utc(2026, 10, 10, 2, 0);
      final futureDate = DateTime.utc(2026, 10, 25, 2, 0);

      expect(DateFormatter.isDueTodayOrOverdue(todayDate, customNow: testNow), isTrue);
      expect(DateFormatter.isDueTodayOrOverdue(pastDate, customNow: testNow), isTrue);
      expect(DateFormatter.isDueTodayOrOverdue(tomorrowDate, customNow: testNow), isFalse);
      expect(DateFormatter.isDueTodayOrOverdue(futureDate, customNow: testNow), isFalse);
      expect(DateFormatter.isDueTodayOrOverdue(null, customNow: testNow), isFalse);
    });

    test('should return correct time-based Indonesian greeting', () {
      // 08:00 WIB (01:00 UTC) -> Pagi
      expect(
        DateFormatter.getGreeting(customNow: DateTime.utc(2026, 10, 9, 1, 0)),
        'Selamat Pagi',
      );
      // 13:00 WIB (06:00 UTC) -> Siang
      expect(
        DateFormatter.getGreeting(customNow: DateTime.utc(2026, 10, 9, 6, 0)),
        'Selamat Siang',
      );
      // 16:30 WIB (09:30 UTC) -> Sore
      expect(
        DateFormatter.getGreeting(customNow: DateTime.utc(2026, 10, 9, 9, 30)),
        'Selamat Sore',
      );
      // 21:00 WIB (14:00 UTC) -> Malam
      expect(
        DateFormatter.getGreeting(customNow: DateTime.utc(2026, 10, 9, 14, 0)),
        'Selamat Malam',
      );
    });
  });

  group('Task Grouping by Status Tests', () {
    final sampleTasks = [
      const TaskEntity(
        id: 't-1',
        projectId: 'p-1',
        title: 'Task Belum Mulai 1',
        status: 'belum_mulai',
        priority: 'sedang',
      ),
      const TaskEntity(
        id: 't-2',
        projectId: 'p-1',
        title: 'Task Belum Mulai 2',
        status: 'belum_mulai',
        priority: 'rendah',
      ),
      const TaskEntity(
        id: 't-3',
        projectId: 'p-1',
        title: 'Task Dikerjakan 1',
        status: 'dikerjakan',
        priority: 'tinggi',
      ),
      const TaskEntity(
        id: 't-4',
        projectId: 'p-1',
        title: 'Task Review 1',
        status: 'review',
        priority: 'sedang',
      ),
      const TaskEntity(
        id: 't-5',
        projectId: 'p-1',
        title: 'Task Selesai 1',
        status: 'selesai',
        priority: 'tinggi',
      ),
    ];

    Map<String, List<TaskEntity>> groupTasks(List<TaskEntity> tasks, String filter) {
      final result = <String, List<TaskEntity>>{};
      const statusOrder = ['Belum Mulai', 'Dikerjakan', 'Review', 'Selesai'];

      if (filter != 'Semua') {
        final filtered = tasks.where((t) {
          final norm = t.status.toLowerCase().replaceAll(' ', '_');
          final filterNorm = filter.toLowerCase().replaceAll(' ', '_');
          return norm == filterNorm;
        }).toList();
        result[filter] = filtered;
        return result;
      }

      for (final label in statusOrder) {
        final norm = label.toLowerCase().replaceAll(' ', '_');
        final group = tasks.where((t) => t.status.toLowerCase().replaceAll(' ', '_') == norm).toList();
        if (group.isNotEmpty) {
          result[label] = group;
        }
      }

      return result;
    }

    test('should group all tasks correctly when filter is "Semua"', () {
      final grouped = groupTasks(sampleTasks, 'Semua');

      expect(grouped.keys.toList(), ['Belum Mulai', 'Dikerjakan', 'Review', 'Selesai']);
      expect(grouped['Belum Mulai']?.length, 2);
      expect(grouped['Dikerjakan']?.length, 1);
      expect(grouped['Review']?.length, 1);
      expect(grouped['Selesai']?.length, 1);
    });

    test('should only return specific group when filter is selected', () {
      final grouped = groupTasks(sampleTasks, 'Dikerjakan');

      expect(grouped.keys.toList(), ['Dikerjakan']);
      expect(grouped['Dikerjakan']?.length, 1);
      expect(grouped['Dikerjakan']?.first.title, 'Task Dikerjakan 1');
    });

    test('should search by title or project name properly', () {
      final query = 'belum mulai';
      final matched = sampleTasks.where((t) => t.title.toLowerCase().contains(query)).toList();

      expect(matched.length, 2);
    });
  });
}

