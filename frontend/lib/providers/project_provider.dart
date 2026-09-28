import 'package:flutter/material.dart';
import '../models/project.dart';
import '../services/api_service.dart';

class ProjectProvider extends ChangeNotifier {
  List<ProjectModel> _projects = [];
  Map<String, dynamic>? _dashboardData;
  ProjectModel? _selectedProject;
  bool _isLoading = false;
  String? _error;

  List<ProjectModel> get projects => _projects;
  Map<String, dynamic>? get dashboardData => _dashboardData;
  ProjectModel? get selectedProject => _selectedProject;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get totalProjects => _projects.length;

  int get activeProjects => _projects
      .where((p) => p.status == 'IN_PROGRESS' || p.status == 'ACTIVE' || p.status == 'On Track' || p.status == 'Planning')
      .length;

  int get completedProjects => _projects
      .where((p) => p.status == 'COMPLETED' || p.status == 'Selesai' || p.status == 'Completed')
      .length;

  int get overdueProjects => _projects
      .where((p) => (p.status != 'COMPLETED' && p.status != 'Completed') && p.endDate != null && p.endDate!.isBefore(DateTime.now()))
      .length;

  double get totalProjectValue => _projects.fold(0.0, (sum, p) => sum + p.budgetTotal);

  Future<void> fetchDashboard({String? period}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final queryStr = period != null && period.isNotEmpty ? '?period=$period' : '';
      final res = await ApiService.get('/dashboard$queryStr');
      _dashboardData = res;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProjects() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/projects');
      if (res != null && res['data'] is List) {
        _projects = (res['data'] as List).map((p) => ProjectModel.fromJson(p)).toList();
      } else if (res is List) {
        _projects = res.map((p) => ProjectModel.fromJson(p)).toList();
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProjectById(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/projects/$id');
      if (res != null) {
        final data = res['data'] ?? res;
        _selectedProject = ProjectModel.fromJson(data);
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createProject(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/projects', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Failed to create project.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchProjects();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProject(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/projects/$id', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Failed to update project.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchProjects();
      await fetchProjectById(id);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProject(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/projects/$id');
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Failed to delete project.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchProjects();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
