import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ClientModel {
  final String id;
  final String companyName;
  final String contactPerson;
  final String email;
  final String? phone;
  final String? address;
  final String status;
  final List<dynamic> projects;

  ClientModel({
    required this.id,
    required this.companyName,
    required this.contactPerson,
    required this.email,
    this.phone,
    this.address,
    required this.status,
    required this.projects,
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    return ClientModel(
      id: json['id']?.toString() ?? '',
      companyName: json['companyName']?.toString() ?? json['name']?.toString() ?? '',
      contactPerson: json['contactPerson']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      projects: json['projects'] is List ? json['projects'] : [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'companyName': companyName,
        'contactPerson': contactPerson,
        'email': email,
        'phone': phone,
        'address': address,
        'status': status,
      };
}

class ClientProvider extends ChangeNotifier {
  List<ClientModel> _clients = [];
  ClientModel? _selectedClient;
  bool _isLoading = false;
  String? _error;

  List<ClientModel> get clients => _clients;
  ClientModel? get selectedClient => _selectedClient;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchClients() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/clients');
      if (res != null && res['data'] is List) {
        _clients = (res['data'] as List).map((c) => ClientModel.fromJson(c)).toList();
      } else if (res is List) {
        _clients = res.map((c) => ClientModel.fromJson(c)).toList();
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchClientById(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/clients/$id');
      if (res != null && res['data'] != null) {
        _selectedClient = ClientModel.fromJson(res['data']);
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createClient(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/clients', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Failed to create client.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchClients();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateClient(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/clients/$id', data);
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'Failed to update client.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchClients();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteClient(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/clients/$id');
      if (res != null && res['success'] == false) {
        _error = res['message'] ?? 'This client cannot be deleted because it is associated with existing projects.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      await fetchClients();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
