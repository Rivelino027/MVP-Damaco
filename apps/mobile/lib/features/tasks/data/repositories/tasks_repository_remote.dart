import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/app_exception.dart';
import '../../domain/entities/task_checklist_entity.dart';
import '../../domain/entities/task_comment_entity.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/tasks_repository.dart';

class TasksRepositoryRemote implements TasksRepository {
  final Dio _dio;

  TasksRepositoryRemote(this._dio);

  @override
  Future<List<TaskEntity>> getMyTasks({
    String? status,
    String? search,
    String? priority,
    int? page,
    int? limit,
  }) async {
    try {
      final query = <String, dynamic>{};
      if (status != null && status.isNotEmpty && status != 'semua') {
        query['status'] = status;
      }
      if (search != null && search.isNotEmpty) {
        query['search'] = search;
      }
      if (priority != null && priority.isNotEmpty) {
        query['priority'] = priority;
      }
      if (page != null) query['page'] = page;
      if (limit != null) query['limit'] = limit;

      final response = await _dio.get(
        ApiEndpoints.myTasks,
        queryParameters: query,
      );

      final dynamic rawData = response.data;
      final List<dynamic> items;
      if (rawData is Map<String, dynamic> && rawData['data'] is List) {
        items = rawData['data'] as List<dynamic>;
      } else if (rawData is List) {
        items = rawData;
      } else {
        items = [];
      }

      return items
          .map((item) => TaskEntity.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TaskEntity> getTaskDetail(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.taskDetail(id));
      final dynamic rawData = response.data;
      final Map<String, dynamic> item =
          (rawData is Map<String, dynamic> && rawData.containsKey('data'))
              ? rawData['data'] as Map<String, dynamic>
              : rawData as Map<String, dynamic>;

      return TaskEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TaskEntity> updateTaskStatus(String id, String status) async {
    try {
      final response = await _dio.patch(
        ApiEndpoints.updateTaskStatus(id),
        data: {'status': status},
      );
      final dynamic rawData = response.data;
      final Map<String, dynamic> item =
          (rawData is Map<String, dynamic> && rawData.containsKey('data'))
              ? rawData['data'] as Map<String, dynamic>
              : rawData as Map<String, dynamic>;

      return TaskEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TaskChecklistEntity> createChecklist(String taskId, String text) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.taskChecklists(taskId),
        data: {'text': text},
      );
      final dynamic rawData = response.data;
      final Map<String, dynamic> item =
          (rawData is Map<String, dynamic> && rawData.containsKey('data'))
              ? rawData['data'] as Map<String, dynamic>
              : rawData as Map<String, dynamic>;

      return TaskChecklistEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TaskChecklistEntity> updateChecklist(
    String taskId,
    String checklistId, {
    bool? isDone,
    String? text,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (isDone != null) data['isDone'] = isDone;
      if (text != null) data['text'] = text;

      final response = await _dio.patch(
        ApiEndpoints.toggleChecklist(taskId, checklistId),
        data: data,
      );
      final dynamic rawData = response.data;
      final Map<String, dynamic> item =
          (rawData is Map<String, dynamic> && rawData.containsKey('data'))
              ? rawData['data'] as Map<String, dynamic>
              : rawData as Map<String, dynamic>;

      return TaskChecklistEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<void> removeChecklist(String taskId, String checklistId) async {
    try {
      await _dio.delete(ApiEndpoints.toggleChecklist(taskId, checklistId));
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TaskCommentEntity> createComment(String taskId, String body) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.taskComments(taskId),
        data: {'body': body},
      );
      final dynamic rawData = response.data;
      final Map<String, dynamic> item =
          (rawData is Map<String, dynamic> && rawData.containsKey('data'))
              ? rawData['data'] as Map<String, dynamic>
              : rawData as Map<String, dynamic>;

      return TaskCommentEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<void> removeComment(String taskId, String commentId) async {
    try {
      await _dio.delete('${ApiEndpoints.taskComments(taskId)}/$commentId');
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }
}

