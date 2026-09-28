import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class MilestoneModel {
  final String id;
  final String projectId;
  final String? projectName;
  final String name;
  final String? description;
  final DateTime dueDate;
  final double progressRequirement;
  final double amount;
  final String billingType;
  final String status;
  final DateTime? completedAt;
  final List<dynamic>? invoices;

  MilestoneModel({
    required this.id,
    required this.projectId,
    this.projectName,
    required this.name,
    this.description,
    required this.dueDate,
    required this.progressRequirement,
    required this.amount,
    required this.billingType,
    required this.status,
    this.completedAt,
    this.invoices,
  });

  factory MilestoneModel.fromJson(Map<String, dynamic> json) {
    return MilestoneModel(
      id: json['id'] ?? '',
      projectId: json['projectId'] ?? '',
      projectName: json['project'] != null ? json['project']['name'] : null,
      name: json['name'] ?? json['title'] ?? '',
      description: json['description'],
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : DateTime.now(),
      progressRequirement: (json['progressRequirement'] as num?)?.toDouble() ?? 100.0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      billingType: json['billingType'] ?? 'PERCENTAGE',
      status: json['status'] ?? 'UPCOMING',
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
      invoices: json['invoices'] is List ? json['invoices'] : [],
    );
  }
}

class MilestoneProvider extends ChangeNotifier {
  List<MilestoneModel> _milestones = [];
  bool _isLoading = false;
  String? _error;

  List<MilestoneModel> get milestones => _milestones;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchMilestones({String? projectId, String? status}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/milestones';
      List<String> params = [];
      if (projectId != null && projectId.isNotEmpty) params.add('projectId=$projectId');
      if (status != null && status.isNotEmpty) params.add('status=$status');
      if (params.isNotEmpty) endpoint += '?${params.join('&')}';

      final res = await ApiService.get(endpoint);
      if (res != null && res['success'] == true && res['data'] is List) {
        _milestones = (res['data'] as List).map((item) => MilestoneModel.fromJson(item)).toList();
      } else if (res is List) {
        _milestones = res.map((item) => MilestoneModel.fromJson(item)).toList();
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createMilestone(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/milestones', data);
      if (res != null && res['success'] == true) {
        await fetchMilestones(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal membuat milestone.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateMilestone(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/milestones/$id', data);
      if (res != null && res['success'] == true) {
        await fetchMilestones(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal memperbarui milestone.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateMilestoneStatus(String id, String status, {String? projectId}) async {
    try {
      final res = await ApiService.patch('/milestones/$id/status', {'status': status});
      if (res != null && res['success'] == true) {
        await fetchMilestones(projectId: projectId);
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    }
  }

  Future<bool> deleteMilestone(String id, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/milestones/$id');
      if (res != null && res['success'] == true) {
        await fetchMilestones(projectId: projectId);
        return true;
      }
      _error = res?['message'] ?? 'Gagal menghapus milestone.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
