import 'package:flutter/material.dart';
import '../models/project.dart';
import '../services/api_service.dart';

class WbsProvider extends ChangeNotifier {
  List<PhaseModel> _phases = [];
  bool _isLoading = false;
  String? _error;

  List<PhaseModel> get phases => _phases;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchPhases({String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/wbs-phases';
      if (projectId != null && projectId.isNotEmpty) {
        endpoint += '?projectId=$projectId';
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
      _phases = rawList.map((p) => PhaseModel.fromJson(p)).toList();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createPhase(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/wbs-phases', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal membuat WBS phase.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchPhases(projectId: data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updatePhase(String id, Map<String, dynamic> data, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/wbs-phases/$id', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal memperbarui WBS phase.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchPhases(projectId: projectId ?? data['projectId']?.toString());
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deletePhase(String id, {String? projectId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/wbs-phases/$id');
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Gagal menghapus WBS phase.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchPhases(projectId: projectId);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
