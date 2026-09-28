import 'package:flutter/material.dart';
import '../services/api_service.dart';

class TimesheetModel {
  final String id;
  final String userId;
  final String userName;
  final String projectId;
  final String? projectName;
  final String taskId;
  final String? taskTitle;
  final DateTime date;
  final double hours;
  final double? hourlyRateSnapshot;
  final double? laborCost;
  final String? description;
  final String status;

  TimesheetModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.projectId,
    this.projectName,
    required this.taskId,
    this.taskTitle,
    required this.date,
    required this.hours,
    this.hourlyRateSnapshot,
    this.laborCost,
    this.description,
    required this.status,
  });

  factory TimesheetModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      return DateTime.tryParse(v.toString());
    }

    final userName = json['user']?['name']?.toString() ?? 'Anggota Tim';
    final taskTitle = json['task']?['title']?.toString() ?? 'Task Pekerjaan';
    final projectName = json['project']?['name']?.toString() ?? 'Proyek';

    return TimesheetModel(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user']?['id']?.toString() ?? '',
      userName: userName,
      projectId: json['projectId']?.toString() ?? json['project']?['id']?.toString() ?? '',
      projectName: projectName,
      taskId: json['taskId']?.toString() ?? json['task']?['id']?.toString() ?? '',
      taskTitle: taskTitle,
      date: parseDate(json['date']) ?? DateTime.now(),
      hours: (json['hours'] as num?)?.toDouble() ?? 0,
      hourlyRateSnapshot: (json['hourlyRateSnapshot'] as num?)?.toDouble(),
      laborCost: (json['laborCost'] as num?)?.toDouble(),
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'APPROVED',
    );
  }
}

class TimesheetProvider extends ChangeNotifier {
  List<TimesheetModel> _timesheets = [];
  bool _isLoading = false;
  String? _error;

  List<TimesheetModel> get timesheets => _timesheets;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchTimesheets({String? projectId, String? taskId, String? userId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      List<String> queryParams = [];
      if (projectId != null && projectId.isNotEmpty) queryParams.add('projectId=$projectId');
      if (taskId != null && taskId.isNotEmpty) queryParams.add('taskId=$taskId');
      if (userId != null && userId.isNotEmpty) queryParams.add('userId=$userId');

      String endpoint = '/timesheets';
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
      _timesheets = rawList.map((ts) => TimesheetModel.fromJson(ts)).toList();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTimesheet(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/timesheets', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal membuat timesheet.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTimesheets(projectId: data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateTimesheet(String id, Map<String, dynamic> data, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/timesheets/$id', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal memperbarui timesheet.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTimesheets(projectId: projectId ?? data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteTimesheet(String id, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/timesheets/$id');
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal menghapus timesheet.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchTimesheets(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
