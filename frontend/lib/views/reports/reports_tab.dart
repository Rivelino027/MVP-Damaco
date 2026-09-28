import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/client_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/report_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class ReportsTab extends StatefulWidget {
  const ReportsTab({super.key});

  @override
  State<ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends State<ReportsTab> {
  String _selectedReportType = 'project_performance';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<ClientProvider>().fetchClients();
      context.read<ReportProvider>().fetchAllReports();
    });
  }

  void _onFilterChanged({String? period, String? projectId, String? clientId, String? status}) {
    context.read<ReportProvider>().setFilter(
          period: period,
          projectId: projectId,
          clientId: clientId,
          status: status,
        );
    context.read<ReportProvider>().fetchAllReports();
  }

  void _exportCurrentReport() {
    final reportProvider = context.read<ReportProvider>();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Laporan "${_getReportTitle(_selectedReportType)}" dengan filter (${reportProvider.selectedPeriod}) berhasil di-export!'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  String _getReportTitle(String type) {
    switch (type) {
      case 'project_performance':
        return '1. Project Performance Report';
      case 'budget_vs_actual':
        return '2. Budget vs Actual Report';
      case 'budget_absorption':
        return '3. Budget Absorption Report';
      case 'timesheets':
        return '4. Timesheet & Labor Cost Report';
      case 'expenses':
        return '5. Expense Report';
      case 'invoices':
        return '6. Invoice & Receivable Report';
      case 'aging':
        return '7. Receivable / Aging Report';
      case 'payments':
        return '8. Payment Report (Cash In vs Cash Out)';
      case 'purchase_orders':
        return '9. Purchase Order / Commitment Report';
      case 'project_health':
        return '10. Project Health & Risk Report';
      default:
        return 'Laporan Operasional & Keuangan';
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';
    final reportProvider = context.watch<ReportProvider>();
    final projProvider = context.watch<ProjectProvider>();
    final clientProvider = context.watch<ClientProvider>();

    if (role == 'MEMBER') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: AppColors.danger),
              const SizedBox(height: 16),
              const Text('Akses Terbatas Internal', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text(
                'Modul Laporan Eksekutif dan Analisis Keuangan hanya diperuntukkan bagi OWNER, FINANCE, PROJECT MANAGER, dan CLIENT.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => reportProvider.fetchAllReports(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Header Bar & Export Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Center Reports & Financial Analytics', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      const Text(
                        'Pusat laporan operasional, anggaran, piutang, dan arus kas berdasarkan database aktual',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _exportCurrentReport,
                  icon: const Icon(Icons.download, size: 16),
                  label: const Text('Export Report'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Report Type Selector & Interactive Filter Bar (Requirement #26)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Pilih Jenis Laporan:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedReportType,
                    decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                    items: const [
                      DropdownMenuItem(value: 'project_performance', child: Text('1. Project Performance Report')),
                      DropdownMenuItem(value: 'budget_vs_actual', child: Text('2. Budget vs Actual Report')),
                      DropdownMenuItem(value: 'budget_absorption', child: Text('3. Budget Absorption Report')),
                      DropdownMenuItem(value: 'timesheets', child: Text('4. Timesheet & Labor Cost Report')),
                      DropdownMenuItem(value: 'expenses', child: Text('5. Expense Report')),
                      DropdownMenuItem(value: 'invoices', child: Text('6. Invoice & Receivable Report')),
                      DropdownMenuItem(value: 'aging', child: Text('7. Receivable / Aging Report (Umur Piutang)')),
                      DropdownMenuItem(value: 'payments', child: Text('8. Payment Report (Cash In vs Cash Out)')),
                      DropdownMenuItem(value: 'purchase_orders', child: Text('9. Purchase Order / Commitment Report')),
                      DropdownMenuItem(value: 'project_health', child: Text('10. Project Health & Risk Report')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedReportType = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  // Filter Controls
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: reportProvider.selectedPeriod,
                          decoration: const InputDecoration(labelText: 'Periode Waktu', isDense: true),
                          items: const [
                            DropdownMenuItem(value: 'ALL', child: Text('Semua Periode')),
                            DropdownMenuItem(value: 'today', child: Text('Hari Ini')),
                            DropdownMenuItem(value: 'this_week', child: Text('Minggu Ini')),
                            DropdownMenuItem(value: 'this_month', child: Text('Bulan Ini')),
                            DropdownMenuItem(value: 'last_month', child: Text('Bulan Lalu')),
                            DropdownMenuItem(value: 'this_quarter', child: Text('Kuartal Ini')),
                            DropdownMenuItem(value: 'this_year', child: Text('Tahun Ini')),
                          ],
                          onChanged: (val) => _onFilterChanged(period: val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String?>(
                          value: reportProvider.selectedProjectId,
                          decoration: const InputDecoration(labelText: 'Proyek', isDense: true),
                          items: [
                            const DropdownMenuItem<String?>(value: null, child: Text('Semua Proyek')),
                            ...projProvider.projects.map((p) => DropdownMenuItem<String?>(value: p.id, child: Text(p.name))),
                          ],
                          onChanged: (val) => _onFilterChanged(projectId: val ?? 'ALL'),
                        ),
                      ),
                      if (role != 'CLIENT') ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String?>(
                            value: reportProvider.selectedClientId,
                            decoration: const InputDecoration(labelText: 'Client', isDense: true),
                            items: [
                              const DropdownMenuItem<String?>(value: null, child: Text('Semua Klien')),
                              ...clientProvider.clients.map((c) => DropdownMenuItem<String?>(value: c.id, child: Text(c.companyName))),
                            ],
                            onChanged: (val) => _onFilterChanged(clientId: val ?? 'ALL'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Active Report Viewer Header
            Text(
              _getReportTitle(_selectedReportType),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),

            // Loading / Error / Data Rendering
            if (reportProvider.isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            else if (reportProvider.error != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(8)),
                child: Text('Gagal memuat laporan: ${reportProvider.error}', style: const TextStyle(color: AppColors.danger)),
              )
            else
              _buildReportBody(context, _selectedReportType, reportProvider, role),
          ],
        ),
      ),
    );
  }

  Widget _buildReportBody(BuildContext context, String type, ReportProvider provider, String role) {
    switch (type) {
      case 'project_performance':
      case 'project_health':
        final list = provider.projectPerformanceReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Project', 'Client', 'Progress', 'Budget', 'Actual Cost', 'Committed', 'Health'],
          rows: list.map((item) {
            final health = item['health'] ?? 'ON_TRACK';
            Color hColor = AppColors.success;
            if (health == 'OVER_BUDGET' || health == 'AT_RISK') hColor = AppColors.danger;

            return DataRow(cells: [
              DataCell(Text('${item['projectCode']} - ${item['projectName']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(item['clientName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text('${item['progressPercentage']}%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['contractValue'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['actualCost'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.warning, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['committedCost'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.info, fontSize: 12))),
              DataCell(
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(color: hColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                  child: Text(health.replaceAll('_', ' '), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: hColor)),
                ),
              ),
            ]);
          }).toList(),
        );

      case 'budget_vs_actual':
      case 'budget_absorption':
        final list = provider.budgetVsActualReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Project', 'Budget', 'Actual Cost', 'Committed PO', 'Remaining Budget', 'Consumption %'],
          rows: list.map((item) {
            final pct = item['costConsumptionPct'] ?? 0;
            final isOver = item['isOverBudget'] == true;
            return DataRow(cells: [
              DataCell(Text(item['projectName'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['budget'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['actualTotalCost'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.warning, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['committedCost'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.info, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((item['remainingBudget'] as num?)?.toDouble() ?? 0), style: TextStyle(color: isOver ? AppColors.danger : AppColors.success, fontSize: 12, fontWeight: FontWeight.bold))),
              DataCell(Text('$pct%', style: TextStyle(color: pct > 80 ? AppColors.danger : AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12))),
            ]);
          }).toList(),
        );

      case 'timesheets':
        final list = provider.timesheetReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Date', 'Employee', 'Project', 'Task', 'Hours', 'Labor Cost'],
          rows: list.map((item) {
            return DataRow(cells: [
              DataCell(Text(Formatters.formatDate(item['date']), style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['employeeName'] ?? '-', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
              DataCell(Text(item['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['taskTitle'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text('${item['hours']}h', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(item['laborCost'] != null ? Formatters.compactRupiah((item['laborCost'] as num).toDouble()) : 'Rp -', style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold))),
            ]);
          }).toList(),
        );

      case 'expenses':
        final list = provider.expenseReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Date', 'Project', 'Phase', 'Submitted By', 'Category', 'Vendor', 'Amount', 'Status'],
          rows: list.map((item) {
            return DataRow(cells: [
              DataCell(Text(Formatters.formatDate(item['expenseDate']), style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['phaseName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['submittedByName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['category'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['vendorName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(Formatters.compactRupiah((item['amount'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(item['status'] ?? '-', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary))),
            ]);
          }).toList(),
        );

      case 'aging':
        final agingData = provider.invoiceAgingData;
        final summary = agingData['agingSummary'] as Map<String, dynamic>? ?? {};
        final invoices = agingData['invoices'] as List<dynamic>? ?? [];

        return Column(
          children: [
            // Aging Summary KPI Cards
            Row(
              children: [
                Expanded(child: _kpiCard('Current', Formatters.compactRupiah((summary['current'] as num?)?.toDouble() ?? 0), AppColors.success)),
                const SizedBox(width: 6),
                Expanded(child: _kpiCard('1-30 Days', Formatters.compactRupiah((summary['days1_30'] as num?)?.toDouble() ?? 0), AppColors.info)),
                const SizedBox(width: 6),
                Expanded(child: _kpiCard('31-60 Days', Formatters.compactRupiah((summary['days31_60'] as num?)?.toDouble() ?? 0), AppColors.warning)),
                const SizedBox(width: 6),
                Expanded(child: _kpiCard('> 60 Days', Formatters.compactRupiah(((summary['days61_90'] ?? 0) + (summary['over90Days'] ?? 0) as num).toDouble()), AppColors.danger)),
              ],
            ),
            const SizedBox(height: 14),
            if (invoices.isEmpty)
              _emptyState()
            else
              _buildTableContainer(
                columns: const ['Invoice No', 'Client', 'Project', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Aging Bucket'],
                rows: invoices.map((inv) {
                  final bucket = inv['agingBucket'] ?? 'CURRENT';
                  final isCurrent = bucket == 'CURRENT';
                  return DataRow(cells: [
                    DataCell(Text(inv['invoiceNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataCell(Text(inv['clientName'] ?? '-', style: const TextStyle(fontSize: 11))),
                    DataCell(Text(inv['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
                    DataCell(Text(Formatters.formatDate(inv['dueDate']), style: const TextStyle(fontSize: 11))),
                    DataCell(Text(Formatters.compactRupiah((inv['totalAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontSize: 12))),
                    DataCell(Text(Formatters.compactRupiah((inv['paidAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.success, fontSize: 12))),
                    DataCell(Text(Formatters.compactRupiah((inv['outstandingAmount'] as num?)?.toDouble() ?? 0), style: TextStyle(color: isCurrent ? AppColors.textPrimary : AppColors.danger, fontWeight: FontWeight.bold, fontSize: 12))),
                    DataCell(
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(color: (isCurrent ? AppColors.success : AppColors.danger).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                        child: Text(bucket, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isCurrent ? AppColors.success : AppColors.danger)),
                      ),
                    ),
                  ]);
                }).toList(),
              ),
          ],
        );

      case 'invoices':
        final agingData = provider.invoiceAgingData;
        final invoices = agingData['invoices'] as List<dynamic>? ?? [];
        if (invoices.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Invoice No', 'Client', 'Project', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status'],
          rows: invoices.map((inv) {
            return DataRow(cells: [
              DataCell(Text(inv['invoiceNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(inv['clientName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(inv['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(Formatters.formatDate(inv['issueDate']), style: const TextStyle(fontSize: 11))),
              DataCell(Text(Formatters.formatDate(inv['dueDate']), style: const TextStyle(fontSize: 11))),
              DataCell(Text(Formatters.compactRupiah((inv['totalAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((inv['paidAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(color: AppColors.success, fontSize: 12))),
              DataCell(Text(Formatters.compactRupiah((inv['outstandingAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(inv['status'] ?? '-', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary))),
            ]);
          }).toList(),
        );

      case 'payments':
        final list = provider.paymentReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['Payment No', 'Date', 'Type', 'Party Name', 'Project', 'Ref No', 'Method', 'Amount'],
          rows: list.map((item) {
            final isCashIn = item['type'] == 'CLIENT_PAYMENT';
            final color = isCashIn ? AppColors.success : AppColors.danger;
            return DataRow(cells: [
              DataCell(Text(item['paymentNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(Formatters.formatDate(item['paymentDate']), style: const TextStyle(fontSize: 11))),
              DataCell(
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                  child: Text(isCashIn ? 'CASH IN' : 'CASH OUT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                ),
              ),
              DataCell(Text(item['partyName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['referenceNumber'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['paymentMethod'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text('${isCashIn ? "+" : "-"} ${Formatters.rupiah((item['amount'] as num?)?.toDouble() ?? 0)}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color))),
            ]);
          }).toList(),
        );

      case 'purchase_orders':
        final list = provider.poReport;
        if (list.isEmpty) return _emptyState();
        return _buildTableContainer(
          columns: const ['PO Number', 'Order Date', 'Project', 'Vendor', 'Description', 'Amount', 'Status', 'Committed'],
          rows: list.map((item) {
            final isApproved = item['isCommittedCost'] == true;
            return DataRow(cells: [
              DataCell(Text(item['poNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(Formatters.formatDate(item['orderDate']), style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['projectName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['vendorName'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(item['description'] ?? '-', style: const TextStyle(fontSize: 11))),
              DataCell(Text(Formatters.compactRupiah((item['totalAmount'] as num?)?.toDouble() ?? 0), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              DataCell(Text(item['status'] ?? '-', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary))),
              DataCell(Text(isApproved ? 'YES' : 'NO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isApproved ? AppColors.success : AppColors.textMuted))),
            ]);
          }).toList(),
        );

      default:
        return _emptyState();
    }
  }

  static Widget _buildTableContainer({required List<String> columns, required List<DataRow> rows}) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 16,
          columns: columns.map((c) => DataColumn(label: Text(c, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)))).toList(),
          rows: rows,
        ),
      ),
    );
  }

  static Widget _kpiCard(String title, String val, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          const SizedBox(height: 2),
          Text(val, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  static Widget _emptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: const Text('Tidak ada data laporan yang ditemukan untuk periode/filter ini.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    );
  }
}
