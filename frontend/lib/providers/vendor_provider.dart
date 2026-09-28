import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class VendorModel {
  final String id;
  final String name;
  final String? contactPerson;
  final String? email;
  final String? phone;
  final String? address;
  final String status;
  final List<dynamic>? purchaseOrders;

  VendorModel({
    required this.id,
    required this.name,
    this.contactPerson,
    this.email,
    this.phone,
    this.address,
    required this.status,
    this.purchaseOrders,
  });

  factory VendorModel.fromJson(Map<String, dynamic> json) {
    return VendorModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      contactPerson: json['contactPerson'],
      email: json['email'],
      phone: json['phone'],
      address: json['address'],
      status: json['status'] ?? 'ACTIVE',
      purchaseOrders: json['purchaseOrders'] is List ? json['purchaseOrders'] : [],
    );
  }
}

class VendorProvider extends ChangeNotifier {
  List<VendorModel> _vendors = [];
  bool _isLoading = false;
  String? _error;

  List<VendorModel> get vendors => _vendors;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchVendors() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/vendors');
      if (res != null && res['success'] == true && res['data'] is List) {
        _vendors = (res['data'] as List).map((v) => VendorModel.fromJson(v)).toList();
      } else if (res is List) {
        _vendors = res.map((v) => VendorModel.fromJson(v)).toList();
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createVendor(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/vendors', data);
      if (res != null && res['success'] == true) {
        await fetchVendors();
        return true;
      }
      _error = res?['message'] ?? 'Gagal membuat vendor.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateVendor(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/vendors/$id', data);
      if (res != null && res['success'] == true) {
        await fetchVendors();
        return true;
      }
      _error = res?['message'] ?? 'Gagal memperbarui vendor.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteVendor(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/vendors/$id');
      if (res != null && res['success'] == true) {
        await fetchVendors();
        return true;
      }
      _error = res?['message'] ?? 'Gagal menghapus vendor.';
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
