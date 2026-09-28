import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ExpenseModel {
  final String id;
  final String projectId;
  final String? projectName;
  final String phaseId;
  final String? phaseName;
  final String? taskId;
  final String? taskTitle;
  final String submittedById;
  final String submittedByName;
  final String category;
  final String? description;
  final double amount;
  final DateTime expenseDate;
  final String? receiptPath;
  final String status;

  ExpenseModel({
    required this.id,
    required this.projectId,
    this.projectName,
    required this.phaseId,
    this.phaseName,
    this.taskId,
    this.taskTitle,
    required this.submittedById,
    required this.submittedByName,
    required this.category,
    this.description,
    required this.amount,
    required this.expenseDate,
    this.receiptPath,
    required this.status,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      return DateTime.tryParse(v.toString());
    }

    final submitterName = json['submittedBy']?['name']?.toString() ?? json['createdBy']?['name']?.toString() ?? 'Anggota Tim';
    final phaseName = json['phase']?['name']?.toString();
    final taskTitle = json['task']?['title']?.toString();
    final projectName = json['project']?['name']?.toString() ?? json['phase']?['project']?['name']?.toString();

    return ExpenseModel(
      id: json['id']?.toString() ?? '',
      projectId: json['projectId']?.toString() ?? json['project']?['id']?.toString() ?? '',
      projectName: projectName,
      phaseId: json['phaseId']?.toString() ?? json['phase']?['id']?.toString() ?? '',
      phaseName: phaseName,
      taskId: json['taskId']?.toString() ?? json['task']?['id']?.toString(),
      taskTitle: taskTitle,
      submittedById: json['submittedById']?.toString() ?? json['submittedBy']?['id']?.toString() ?? '',
      submittedByName: submitterName,
      category: json['category']?.toString() ?? 'OTHER',
      description: json['description']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      expenseDate: parseDate(json['expenseDate']) ?? parseDate(json['createdAt']) ?? DateTime.now(),
      receiptPath: json['receiptPath']?.toString(),
      status: json['status']?.toString() ?? 'SUBMITTED',
    );
  }
}

class ExpenseProvider extends ChangeNotifier {
  List<ExpenseModel> _expenses = [];
  bool _isLoading = false;
  String? _error;

  List<ExpenseModel> get expenses => _expenses;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchExpenses({String? projectId, String? phaseId, String? category, String? status}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      List<String> queryParams = [];
      if (projectId != null && projectId.isNotEmpty) queryParams.add('projectId=$projectId');
      if (phaseId != null && phaseId.isNotEmpty) queryParams.add('phaseId=$phaseId');
      if (category != null && category.isNotEmpty && category != 'ALL') queryParams.add('category=$category');
      if (status != null && status.isNotEmpty && status != 'ALL') queryParams.add('status=$status');

      String endpoint = '/expenses';
      if (queryParams.isNotEmpty) {
        endpoint += '?${queryParams.join('&')}';
      }

      final res = await ApiService.get(endpoint);
      if (res is List) {
        _expenses = res.map((e) => ExpenseModel.fromJson(e)).toList();
      } else {
        _expenses = [];
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createExpense(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await ApiService.post('/expenses', data);
      await fetchExpenses(projectId: data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateExpense(String id, Map<String, dynamic> data, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await ApiService.put('/expenses/$id', data);
      await fetchExpenses(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateExpenseStatus(String id, String status, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await ApiService.patch('/expenses/$id/status', {'status': status});
      await fetchExpenses(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteExpense(String id, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await ApiService.delete('/expenses/$id');
      await fetchExpenses(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
