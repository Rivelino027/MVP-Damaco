import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class InvoiceModel {
  final String id;
  final String projectId;
  final String? projectName;
  final String? projectCode;
  final String clientId;
  final String? clientCompanyName;
  final String? clientContactPerson;
  final String? milestoneId;
  final String? milestoneName;
  final String invoiceNumber;
  final double amount;
  final double subtotal;
  final double taxRate;
  final double taxAmount;
  final double totalAmount;
  final DateTime issueDate;
  final DateTime dueDate;
  final String status;
  final String? notes;
  final List<dynamic>? payments;

  InvoiceModel({
    required this.id,
    required this.projectId,
    this.projectName,
    this.projectCode,
    required this.clientId,
    this.clientCompanyName,
    this.clientContactPerson,
    this.milestoneId,
    this.milestoneName,
    required this.invoiceNumber,
    required this.amount,
    required this.subtotal,
    required this.taxRate,
    required this.taxAmount,
    required this.totalAmount,
    required this.issueDate,
    required this.dueDate,
    required this.status,
    this.notes,
    this.payments,
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    final sub = (json['subtotal'] as num?)?.toDouble() ?? (json['amount'] as num?)?.toDouble() ?? 0.0;
    final taxR = (json['taxRate'] as num?)?.toDouble() ?? 0.0;
    final taxA = (json['taxAmount'] as num?)?.toDouble() ?? (sub * (taxR / 100.0));
    final tot = (json['totalAmount'] as num?)?.toDouble() ?? (sub + taxA);

    return InvoiceModel(
      id: json['id'] ?? '',
      projectId: json['projectId'] ?? '',
      projectName: json['project'] != null ? json['project']['name'] : null,
      projectCode: json['project'] != null ? json['project']['projectCode'] : null,
      clientId: json['clientId'] ?? '',
      clientCompanyName: json['client'] != null ? json['client']['companyName'] : null,
      clientContactPerson: json['client'] != null ? json['client']['contactPerson'] : null,
      milestoneId: json['milestoneId'],
      milestoneName: json['milestone'] != null ? json['milestone']['name'] : null,
      invoiceNumber: json['invoiceNumber'] ?? '',
      amount: sub,
      subtotal: sub,
      taxRate: taxR,
      taxAmount: taxA,
      totalAmount: tot > 0 ? tot : sub,
      issueDate: json['issueDate'] != null ? DateTime.parse(json['issueDate']) : DateTime.now(),
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : DateTime.now(),
      status: json['status'] ?? 'DRAFT',
      notes: json['notes'],
      payments: json['payments'] is List ? json['payments'] : [],
    );
  }

  double get paidAmount {
    if (payments == null || payments!.isEmpty) {
      return status == 'PAID' ? totalAmount : 0.0;
    }
    return payments!.fold<double>(0.0, (sum, p) {
      if (p is Map) {
        return sum + ((p['amount'] as num?)?.toDouble() ?? 0.0);
      }
      return sum;
    });
  }
}

class InvoiceProvider extends ChangeNotifier {
  List<InvoiceModel> _invoices = [];
  bool _isLoading = false;
  String? _error;

  List<InvoiceModel> get invoices => _invoices;
  bool get isLoading => _isLoading;
  String? get error => _error;

  double get totalInvoiced => _invoices.fold(0.0, (sum, inv) => sum + inv.totalAmount);
  double get totalPaid => _invoices.where((inv) => inv.status == 'PAID').fold(0.0, (sum, inv) => sum + inv.totalAmount);
  double get totalOutstanding => _invoices.where((inv) => inv.status != 'PAID' && inv.status != 'CANCELLED').fold(0.0, (sum, inv) => sum + inv.totalAmount);

  Future<void> fetchInvoices({String? projectId, String? clientId, String? status, String? search}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/invoices';
      List<String> params = [];
      if (projectId != null && projectId.isNotEmpty) params.add('projectId=$projectId');
      if (clientId != null && clientId.isNotEmpty) params.add('clientId=$clientId');
      if (status != null && status.isNotEmpty && status != 'ALL') params.add('status=$status');
      if (search != null && search.isNotEmpty) params.add('search=$search');
      if (params.isNotEmpty) endpoint += '?${params.join('&')}';

      final res = await ApiService.get(endpoint);
      if (res != null && res['success'] == true && res['data'] is List) {
        _invoices = (res['data'] as List).map((item) => InvoiceModel.fromJson(item)).toList();
      } else if (res is List) {
        _invoices = res.map((item) => InvoiceModel.fromJson(item)).toList();
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createInvoice(Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/invoices', data);
      if (res != null && res['success'] == true) {
        await fetchInvoices(projectId: data['projectId'], clientId: data['clientId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal membuat invoice.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateInvoice(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.put('/invoices/$id', data);
      if (res != null && res['success'] == true) {
        await fetchInvoices(projectId: data['projectId']);
        return true;
      }
      _error = res?['message'] ?? 'Gagal memperbarui invoice.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> sendInvoice(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/invoices/$id/send', {});
      if (res != null && res['success'] == true) {
        await fetchInvoices();
        return true;
      }
      _error = res?['message'] ?? 'Gagal mengirim invoice.';
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateInvoiceStatus(String id, String status) async {
    try {
      final res = await ApiService.patch('/invoices/$id/status', {'status': status});
      if (res != null && res['success'] == true) {
        await fetchInvoices();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    }
  }

  Future<bool> deleteInvoice(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.delete('/invoices/$id');
      if (res != null && res['success'] == true) {
        await fetchInvoices();
        return true;
      }
      _error = res?['message'] ?? 'Gagal menghapus invoice.';
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
