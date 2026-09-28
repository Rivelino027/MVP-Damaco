import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class PaymentModel {
  final String id;
  final String? paymentNumber;
  final String type; // CLIENT_PAYMENT (Cash In), VENDOR_PAYMENT (Cash Out)
  final String? invoiceId;
  final String? invoiceNumber;
  final String? purchaseOrderId;
  final String? poNumber;
  final String? expenseId;
  final String? projectId;
  final String? projectName;
  final String? projectCode;
  final String? clientCompanyName;
  final String? vendorName;
  final double amount;
  final DateTime paymentDate;
  final String paymentMethod;
  final String? referenceNumber;
  final String? notes;
  final String? createdByName;

  PaymentModel({
    required this.id,
    this.paymentNumber,
    required this.type,
    this.invoiceId,
    this.invoiceNumber,
    this.purchaseOrderId,
    this.poNumber,
    this.expenseId,
    this.projectId,
    this.projectName,
    this.projectCode,
    this.clientCompanyName,
    this.vendorName,
    required this.amount,
    required this.paymentDate,
    required this.paymentMethod,
    this.referenceNumber,
    this.notes,
    this.createdByName,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] ?? '',
      paymentNumber: json['paymentNumber'] ?? json['id'],
      type: json['type'] ?? 'CLIENT_PAYMENT',
      invoiceId: json['invoiceId'],
      invoiceNumber: json['invoice'] != null ? json['invoice']['invoiceNumber'] : null,
      purchaseOrderId: json['purchaseOrderId'],
      poNumber: json['purchaseOrder'] != null ? json['purchaseOrder']['poNumber'] : null,
      expenseId: json['expenseId'],
      projectId: json['projectId'],
      projectName: json['project'] != null
          ? json['project']['name']
          : (json['invoice'] != null && json['invoice']['project'] != null
              ? json['invoice']['project']['name']
              : null),
      projectCode: json['project'] != null ? json['project']['projectCode'] : null,
      clientCompanyName: json['invoice'] != null && json['invoice']['client'] != null
          ? json['invoice']['client']['companyName']
          : null,
      vendorName: json['purchaseOrder'] != null ? json['purchaseOrder']['vendorName'] : null,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentDate: json['paymentDate'] != null ? DateTime.parse(json['paymentDate']) : DateTime.now(),
      paymentMethod: json['paymentMethod'] ?? 'BANK_TRANSFER',
      referenceNumber: json['referenceNumber'],
      notes: json['notes'],
      createdByName: json['createdBy'] != null ? json['createdBy']['name'] : null,
    );
  }
}

class PaymentProvider extends ChangeNotifier {
  List<PaymentModel> _payments = [];
  bool _isLoading = false;
  String? _error;

  List<PaymentModel> get payments => _payments;
  bool get isLoading => _isLoading;
  String? get error => _error;

  double get totalCashIn => _payments
      .where((p) => p.type == 'CLIENT_PAYMENT')
      .fold(0.0, (sum, p) => sum + p.amount);

  double get totalCashOut => _payments
      .where((p) => p.type == 'VENDOR_PAYMENT')
      .fold(0.0, (sum, p) => sum + p.amount);

  double get netCashFlow => totalCashIn - totalCashOut;

  Future<void> fetchPayments({String? projectId, String? type, String? invoiceId, String? search}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/payments';
      List<String> params = [];
      if (projectId != null && projectId.isNotEmpty) params.add('projectId=$projectId');
      if (type != null && type.isNotEmpty && type != 'ALL') params.add('type=$type');
      if (invoiceId != null && invoiceId.isNotEmpty) params.add('invoiceId=$invoiceId');
      if (search != null && search.isNotEmpty) params.add('search=$search');
      if (params.isNotEmpty) endpoint += '?${params.join('&')}';

      final res = await ApiService.get(endpoint);
      if (res != null && res['success'] == true && res['data'] is List) {
        _payments = (res['data'] as List).map((p) => PaymentModel.fromJson(p)).toList();
      } else if (res is List) {
        _payments = res.map((p) => PaymentModel.fromJson(p)).toList();
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createPayment(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/payments', data);
      if (res != null && res['success'] == true) {
        await fetchPayments(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal mencatat transaksi pembayaran.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deletePayment(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/payments/$id');
      if (res != null && res['success'] == true) {
        await fetchPayments();
        return true;
      }
      _error = res?['message'] ?? 'Gagal menghapus transaksi pembayaran.';
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
