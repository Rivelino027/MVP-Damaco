import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class ReportProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  String _selectedPeriod = 'ALL';
  String? _selectedProjectId;
  String? _selectedClientId;
  String _selectedStatus = 'ALL';

  List<dynamic> _projectPerformanceReport = [];
  List<dynamic> _budgetVsActualReport = [];
  List<dynamic> _timesheetReport = [];
  List<dynamic> _expenseReport = [];
  Map<String, dynamic> _invoiceAgingData = {};
  List<dynamic> _paymentReport = [];
  List<dynamic> _poReport = [];

  bool get isLoading => _isLoading;
  String? get error => _error;

  String get selectedPeriod => _selectedPeriod;
  String? get selectedProjectId => _selectedProjectId;
  String? get selectedClientId => _selectedClientId;
  String get selectedStatus => _selectedStatus;

  List<dynamic> get projectPerformanceReport => _projectPerformanceReport;
  List<dynamic> get budgetVsActualReport => _budgetVsActualReport;
  List<dynamic> get timesheetReport => _timesheetReport;
  List<dynamic> get expenseReport => _expenseReport;
  Map<String, dynamic> get invoiceAgingData => _invoiceAgingData;
  List<dynamic> get paymentReport => _paymentReport;
  List<dynamic> get poReport => _poReport;

  void setFilter({String? period, String? projectId, String? clientId, String? status}) {
    if (period != null) _selectedPeriod = period;
    if (projectId != null) _selectedProjectId = projectId == 'ALL' ? null : projectId;
    if (clientId != null) _selectedClientId = clientId == 'ALL' ? null : clientId;
    if (status != null) _selectedStatus = status;
    notifyListeners();
  }

  String _buildQueryParams() {
    List<String> params = [];
    if (_selectedPeriod != 'ALL') params.add('period=$_selectedPeriod');
    if (_selectedProjectId != null) params.add('projectId=$_selectedProjectId');
    if (_selectedClientId != null) params.add('clientId=$_selectedClientId');
    if (_selectedStatus != 'ALL') params.add('status=$_selectedStatus');
    return params.isEmpty ? '' : '?${params.join("&")}';
  }

  Future<void> fetchAllReports() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = _buildQueryParams();

      final perfRes = await ApiService.get('/reports/project-performance$query');
      if (perfRes != null && perfRes['success'] == true) {
        _projectPerformanceReport = perfRes['data'] ?? [];
      }

      final bvaRes = await ApiService.get('/reports/budget-vs-actual$query');
      if (bvaRes != null && bvaRes['success'] == true) {
        _budgetVsActualReport = bvaRes['data'] ?? [];
      }

      final agingRes = await ApiService.get('/reports/invoices-aging$query');
      if (agingRes != null && agingRes['success'] == true) {
        _invoiceAgingData = agingRes['data'] ?? {};
      }

      final payRes = await ApiService.get('/reports/payments$query');
      if (payRes != null && payRes['success'] == true) {
        _paymentReport = payRes['data'] ?? [];
      }

      final poRes = await ApiService.get('/reports/purchase-orders$query');
      if (poRes != null && poRes['success'] == true) {
        _poReport = poRes['data'] ?? [];
      }

      final tsRes = await ApiService.get('/reports/timesheets$query');
      if (tsRes != null && tsRes['success'] == true) {
        _timesheetReport = tsRes['data'] ?? [];
      }

      final expRes = await ApiService.get('/reports/expenses$query');
      if (expRes != null && expRes['success'] == true) {
        _expenseReport = expRes['data'] ?? [];
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
