import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PurchaseOrderModel {
  final String id;
  final String projectId;
  final String? projectName;
  final String? projectCode;
  final String? phaseId;
  final String? phaseName;
  final String? vendorId;
  final String vendorName;
  final String poNumber;
  final double amount;
  final double taxRate;
  final double taxAmount;
  final double totalAmount;
  final String? description;
  final String? notes;
  final String status;
  final DateTime orderDate;
  final DateTime? expectedDate;
  final String? createdByName;
  final String? approvedByName;

  PurchaseOrderModel({
    required this.id,
    required this.projectId,
    this.projectName,
    this.projectCode,
    this.phaseId,
    this.phaseName,
    this.vendorId,
    required this.vendorName,
    required this.poNumber,
    required this.amount,
    required this.taxRate,
    required this.taxAmount,
    required this.totalAmount,
    this.description,
    this.notes,
    required this.status,
    required this.orderDate,
    this.expectedDate,
    this.createdByName,
    this.approvedByName,
  });

  factory PurchaseOrderModel.fromJson(Map<String, dynamic> json) {
    final sub = (json['amount'] as num?)?.toDouble() ?? 0.0;
    final taxR = (json['taxRate'] as num?)?.toDouble() ?? 0.0;
    final taxA = (json['taxAmount'] as num?)?.toDouble() ?? (sub * (taxR / 100.0));
    final tot = (json['totalAmount'] as num?)?.toDouble() ?? (sub + taxA);

    return PurchaseOrderModel(
      id: json['id'] ?? '',
      projectId: json['projectId'] ?? '',
      projectName: json['project'] != null ? json['project']['name'] : null,
      projectCode: json['project'] != null ? json['project']['projectCode'] : null,
      phaseId: json['phaseId'],
      phaseName: json['phase'] != null ? json['phase']['name'] : null,
      vendorId: json['vendorId'],
      vendorName: json['vendorName'] ?? (json['vendor'] != null ? json['vendor']['name'] : 'Vendor'),
      poNumber: json['poNumber'] ?? '',
      amount: sub,
      taxRate: taxR,
      taxAmount: taxA,
      totalAmount: tot > 0 ? tot : sub,
      description: json['description'],
      notes: json['notes'],
      status: json['status'] ?? 'DRAFT',
      orderDate: json['orderDate'] != null ? DateTime.parse(json['orderDate']) : DateTime.now(),
      expectedDate: json['expectedDate'] != null ? DateTime.parse(json['expectedDate']) : null,
      createdByName: json['createdBy'] != null ? json['createdBy']['name'] : null,
      approvedByName: json['approvedBy'] != null ? json['approvedBy']['name'] : null,
    );
  }
}

class PurchaseOrderProvider extends ChangeNotifier {
  List<PurchaseOrderModel> _purchaseOrders = [];
  bool _isLoading = false;
  String? _error;

  List<PurchaseOrderModel> get purchaseOrders => _purchaseOrders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // REQUIREMENT #6 & #7: Only APPROVED POs count towards Committed Cost
  double get totalCommittedCost => _purchaseOrders
      .where((po) => po.status == 'APPROVED')
      .fold(0.0, (sum, po) => sum + po.totalAmount);

  Future<void> fetchPurchaseOrders({String? projectId, String? status, String? vendorId, String? search}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/purchase-orders';
      List<String> params = [];
      if (projectId != null && projectId.isNotEmpty) params.add('projectId=$projectId');
      if (status != null && status.isNotEmpty && status != 'ALL') params.add('status=$status');
      if (vendorId != null && vendorId.isNotEmpty) params.add('vendorId=$vendorId');
      if (search != null && search.isNotEmpty) params.add('search=$search');
      if (params.isNotEmpty) endpoint += '?${params.join('&')}';

      final res = await ApiService.get(endpoint);
      if (res != null && res['success'] == true && res['data'] is List) {
        _purchaseOrders = (res['data'] as List).map((p) => PurchaseOrderModel.fromJson(p)).toList();
      } else if (res is List) {
        _purchaseOrders = res.map((p) => PurchaseOrderModel.fromJson(p)).toList();
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createPurchaseOrder(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/purchase-orders', data);
      if (res != null && res['success'] == true) {
        await fetchPurchaseOrders(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal membuat Purchase Order.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updatePurchaseOrder(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/purchase-orders/$id', data);
      if (res != null && res['success'] == true) {
        await fetchPurchaseOrders(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal memperbarui Purchase Order.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> approvePurchaseOrder(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/purchase-orders/$id/approve', {});
      if (res != null && res['success'] == true) {
        await fetchPurchaseOrders();
        return true;
      }
      _error = res?['message'] ?? 'Gagal menyetujui Purchase Order.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deletePurchaseOrder(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/purchase-orders/$id');
      if (res != null && res['success'] == true) {
        await fetchPurchaseOrders();
        return true;
      }
      _error = res?['message'] ?? 'Gagal menghapus Purchase Order.';
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
