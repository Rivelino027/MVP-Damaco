import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/repositories/tasks_repository_mock.dart';
import '../../data/repositories/tasks_repository_remote.dart';
import '../../domain/entities/task_checklist_entity.dart';
import '../../domain/entities/task_comment_entity.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/tasks_repository.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  if (AppConfig.useMockData) {
    return TasksRepositoryMock();
  }
  return TasksRepositoryRemote(ref.watch(dioProvider));
});

/// Filter chip aktif: 'Semua', 'Belum Mulai', 'Dikerjakan', 'Review', 'Selesai'
final taskFilterProvider = StateProvider<String>((ref) => 'Semua');

/// Search query dengan debounce
final taskSearchQueryProvider = StateProvider<String>((ref) => '');

class TaskListNotifier extends AutoDisposeAsyncNotifier<List<TaskEntity>> {
  @override
  Future<List<TaskEntity>> build() async {
    final repo = ref.watch(tasksRepositoryProvider);
    final filter = ref.watch(taskFilterProvider);
    final search = ref.watch(taskSearchQueryProvider);

    return repo.getMyTasks(
      status: filter == 'Semua' ? null : filter,
      search: search.isEmpty ? null : search,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(tasksRepositoryProvider);
      final filter = ref.read(taskFilterProvider);
      final search = ref.read(taskSearchQueryProvider);
      return repo.getMyTasks(
        status: filter == 'Semua' ? null : filter,
        search: search.isEmpty ? null : search,
      );
    });
  }

  Future<void> updateStatus(String taskId, String newStatus) async {
    final repo = ref.read(tasksRepositoryProvider);
    final updated = await repo.updateTaskStatus(taskId, newStatus);

    state = state.whenData((tasks) {
      return tasks.map((t) => t.id == taskId ? updated : t).toList();
    });
  }
}

final taskListProvider =
    AutoDisposeAsyncNotifierProvider<TaskListNotifier, List<TaskEntity>>(
  TaskListNotifier.new,
);

/// Helper provider untuk mengelompokkan task berdasarkan status
final groupedTasksProvider = Provider.autoDispose<Map<String, List<TaskEntity>>>((ref) {
  final tasksAsync = ref.watch(taskListProvider);
  final activeFilter = ref.watch(taskFilterProvider);

  return tasksAsync.maybeWhen(
    data: (tasks) {
      final result = <String, List<TaskEntity>>{};

      // Urutan status standar yang rapi
      final statusOrder = ['Belum Mulai', 'Dikerjakan', 'Review', 'Selesai'];

      if (activeFilter != 'Semua') {
        final filtered = tasks.where((t) {
          final norm = t.status.toLowerCase().replaceAll(' ', '_');
          final filterNorm = activeFilter.toLowerCase().replaceAll(' ', '_');
          return norm == filterNorm;
        }).toList();
        result[activeFilter] = filtered;
        return result;
      }

      for (final label in statusOrder) {
        final norm = label.toLowerCase().replaceAll(' ', '_');
        final groupTasks = tasks.where((t) => t.status.toLowerCase().replaceAll(' ', '_') == norm).toList();
        if (groupTasks.isNotEmpty) {
          result[label] = groupTasks;
        }
      }

      // Kelompokkan sisa status lain jika ada
      for (final t in tasks) {
        final norm = t.status.toLowerCase().replaceAll(' ', '_');
        final matchingLabel = statusOrder.firstWhere(
          (l) => l.toLowerCase().replaceAll(' ', '_') == norm,
          orElse: () => '',
        );
        if (matchingLabel.isEmpty) {
          final otherLabel = t.status;
          result.putIfAbsent(otherLabel, () => []).add(t);
        }
      }

      return result;
    },
    orElse: () => {},
  );
});

class TaskDetailNotifier extends AutoDisposeFamilyAsyncNotifier<TaskEntity, String> {
  @override
  Future<TaskEntity> build(String arg) async {
    final repo = ref.watch(tasksRepositoryProvider);
    return repo.getTaskDetail(arg);
  }

  Future<void> toggleChecklist(String checklistId, bool isDone) async {
    final repo = ref.read(tasksRepositoryProvider);
    final updatedChecklist = await repo.updateChecklist(
      arg,
      checklistId,
      isDone: isDone,
    );

    state = state.whenData((task) {
      final updatedList = task.checklists.map((c) {
        return c.id == checklistId ? updatedChecklist : c;
      }).toList();
      return task.copyWith(checklists: updatedList);
    });

    // Refresh list tasks
    ref.invalidate(taskListProvider);
  }

  Future<void> addChecklist(String text) async {
    if (text.trim().isEmpty) return;
    final repo = ref.read(tasksRepositoryProvider);
    final newChecklist = await repo.createChecklist(arg, text.trim());

    state = state.whenData((task) {
      final updatedList = List<TaskChecklistEntity>.from(task.checklists)
        ..add(newChecklist);
      return task.copyWith(checklists: updatedList);
    });

    ref.invalidate(taskListProvider);
  }

  Future<void> addComment(String body) async {
    if (body.trim().isEmpty) return;
    final repo = ref.read(tasksRepositoryProvider);
    final newComment = await repo.createComment(arg, body.trim());

    state = state.whenData((task) {
      final updatedList = List<TaskCommentEntity>.from(task.comments)
        ..add(newComment);
      return task.copyWith(comments: updatedList);
    });
  }

  Future<void> updateStatus(String newStatus) async {
    final repo = ref.read(tasksRepositoryProvider);
    final updated = await repo.updateTaskStatus(arg, newStatus);
    state = AsyncValue.data(updated);

    // Refresh list tasks
    ref.invalidate(taskListProvider);
  }
}

final taskDetailProvider =
    AutoDisposeAsyncNotifierProviderFamily<TaskDetailNotifier, TaskEntity, String>(
  TaskDetailNotifier.new,
);
