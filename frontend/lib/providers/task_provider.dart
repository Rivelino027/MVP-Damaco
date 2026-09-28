import 'package:flutter/material.dart';
import '../models/project.dart';
import '../services/api_service.dart';

class TaskProvider extends ChangeNotifier {
  List<TaskModel> _tasks = [];
  bool _isLoading = false;
  String? _error;

  List<TaskModel> get tasks => _tasks;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchTasks({
    String? projectId,
    String? phaseId,
    String? assignedToId,
    String? status,
    String? priority,
    String? search,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      List<String> queryParams = [];
      if (projectId != null && projectId.isNotEmpty) queryParams.add('projectId=$projectId');
      if (phaseId != null && phaseId.isNotEmpty) queryParams.add('phaseId=$phaseId');
      if (assignedToId != null && assignedToId.isNotEmpty) queryParams.add('assignedToId=$assignedToId');
      if (status != null && status.isNotEmpty && status != 'ALL') queryParams.add('status=$status');
      if (priority != null && priority.isNotEmpty && priority != 'ALL') queryParams.add('priority=$priority');
      if (search != null && search.isNotEmpty) queryParams.add('search=${Uri.encodeComponent(search)}');

      String endpoint = '/tasks';
      if (queryParams.isNotEmpty) {
        endpoint += '?${queryParams.join('&')}';
      }

      final res = await ApiService.get(endpoint);
      List rawList = [];
      if (res != null) {
        if (res is List) {
          rawList = res;
        } else if (res is Map && res['data'] is List) {
          rawList = res['data'];
        }
      }
      _tasks = rawList.map((t) => TaskModel.fromJson(t)).toList();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTask(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/tasks', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal membuat task.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTasks(projectId: data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateTask(String id, Map<String, dynamic> data, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/tasks/$id', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal memperbarui task.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTasks(projectId: projectId ?? data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateTaskStatus(String id, String status, {int? progressPercentage, String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      Map<String, dynamic> body = {'status': status};
      if (progressPercentage != null) {
        body['progressPercentage'] = progressPercentage;
      }
      final res = await ApiService.patch('/tasks/$id/status', body);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal memperbarui status task.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTasks(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteTask(String id, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/tasks/$id');
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal menghapus task.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTasks(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
