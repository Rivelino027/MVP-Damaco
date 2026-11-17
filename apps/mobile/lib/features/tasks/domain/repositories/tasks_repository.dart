import '../entities/task_checklist_entity.dart';
import '../entities/task_comment_entity.dart';
import '../entities/task_entity.dart';

abstract class TasksRepository {
  Future<List<TaskEntity>> getMyTasks({
    String? status,
    String? search,
    String? priority,
    int? page,
    int? limit,
  });

  Future<TaskEntity> getTaskDetail(String id);

  Future<TaskEntity> updateTaskStatus(String id, String status);

  Future<TaskChecklistEntity> createChecklist(String taskId, String text);

  Future<TaskChecklistEntity> updateChecklist(
    String taskId,
    String checklistId, {
    bool? isDone,
    String? text,
  });

  Future<void> removeChecklist(String taskId, String checklistId);

  Future<TaskCommentEntity> createComment(String taskId, String body);

  Future<void> removeComment(String taskId, String commentId);
}

