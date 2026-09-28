import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class CashFlowTransaction {
  final String id;
  final DateTime date;
  final String type; // Cash In / Cash Out
  final String flowType;
  final String description;
  final String projectName;
  final String projectCode;
  final double amount;
  final String paymentMethod;
  final String? referenceNumber;

  CashFlowTransaction({
    required this.id,
    required this.date,
    required this.type,
    required this.flowType,
    required this.description,
    required this.projectName,
    required this.projectCode,
    required this.amount,
    required this.paymentMethod,
    this.referenceNumber,
  });

  factory CashFlowTransaction.fromJson(Map<String, dynamic> json) {
    return CashFlowTransaction(
      id: json['id'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      type: json['type'] ?? 'Cash In',
      flowType: json['flowType'] ?? 'CLIENT_PAYMENT',
      description: json['description'] ?? '',
      projectName: json['projectName'] ?? '-',
      projectCode: json['projectCode'] ?? '-',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? 'BANK_TRANSFER',
      referenceNumber: json['referenceNumber'],
    );
  }
}

class CashFlowProvider extends ChangeNotifier {
  double _totalCashIn = 0;
  double _totalCashOut = 0;
  double _netCashFlow = 0;
  List<CashFlowTransaction> _transactions = [];
  bool _isLoading = false;
  String? _error;

  double get totalCashIn => _totalCashIn;
  double get totalCashOut => _totalCashOut;
  double get netCashFlow => _netCashFlow;
  List<CashFlowTransaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCashFlow({String? projectId, String? period, String? startDate, String? endDate}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String endpoint = '/cash-flow';
      List<String> params = [];
      if (projectId != null && projectId.isNotEmpty) params.add('projectId=$projectId');
      if (period != null && period.isNotEmpty && period != 'ALL') params.add('period=$period');
      if (startDate != null && startDate.isNotEmpty) params.add('startDate=$startDate');
      if (endDate != null && endDate.isNotEmpty) params.add('endDate=$endDate');
      if (params.isNotEmpty) endpoint += '?${params.join('&')}';

      final res = await ApiService.get(endpoint);
      if (res != null && res['success'] == true && res['data'] != null) {
        final summary = res['data']['summary'] ?? {};
        _totalCashIn = (summary['totalCashIn'] as num?)?.toDouble() ?? 0.0;
        _totalCashOut = (summary['totalCashOut'] as num?)?.toDouble() ?? 0.0;
        _netCashFlow = (summary['netCashFlow'] as num?)?.toDouble() ?? (_totalCashIn - _totalCashOut);

        if (res['data']['transactions'] is List) {
          _transactions = (res['data']['transactions'] as List)
              .map((t) => CashFlowTransaction.fromJson(t))
              .toList();
        }
      }
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
