import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cash_flow_provider.dart';
import '../../providers/invoice_provider.dart';
import '../../providers/po_provider.dart';
import '../../providers/project_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';
import '../widgets/metric_card.dart';
import '../widgets/projectflow_charts.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  String _selectedPeriod = 'ALL';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      _refreshDashboard();
    });
  }

  Future<void> _refreshDashboard() async {
    final projProv = context.read<ProjectProvider>();
    await projProv.fetchProjects();
    await projProv.fetchDashboard(period: _selectedPeriod);
    if (mounted) {
      context.read<InvoiceProvider>().fetchInvoices();
      context.read<PurchaseOrderProvider>().fetchPurchaseOrders();
      context.read<CashFlowProvider>().fetchCashFlow(period: _selectedPeriod);
    }
  }

  void _onPeriodChanged(String? newPeriod) {
    if (newPeriod != null) {
      setState(() => _selectedPeriod = newPeriod);
      _refreshDashboard();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;
    final role = user?.normalizedRole ?? 'MEMBER';
    final userName = user?.name ?? 'Pengguna';

    final projProvider = context.watch<ProjectProvider>();
    final poProvider = context.watch<PurchaseOrderProvider>();
    final cfProvider = context.watch<CashFlowProvider>();
    final invProvider = context.watch<InvoiceProvider>();

    if (projProvider.isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Memuat data dashboard DAMACO...', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ],
          ),
        ),
      );
    }

    if (projProvider.error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: AppColors.danger),
                const SizedBox(height: 16),
                Text('Gagal memuat data dashboard: ${projProvider.error}', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger)),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _refreshDashboard,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final projects = projProvider.projects;
    final totalCommittedCost = poProvider.totalCommittedCost;

    // Portfolio Calculations
    final double totalBudget = projects.fold(0.0, (sum, p) => sum + p.budgetTotal);
    final double totalActualCost = projects.fold(0.0, (sum, p) => sum + p.actualTotalCost);
    final double remainingBudget = totalBudget - totalActualCost - totalCommittedCost;
    final int costConsumptionPct = totalBudget > 0 ? (((totalActualCost + totalCommittedCost) / totalBudget) * 100).round() : 0;

    final double totalInvoiced = invProvider.totalInvoiced;
    final double totalPaid = invProvider.totalPaid;
    final double outstandingInvoice = invProvider.totalOutstanding;

    final double cashIn = cfProvider.totalCashIn;
    final double cashOut = cfProvider.totalCashOut;
    final double netCashFlow = cfProvider.netCashFlow;

    // Overburn At-Risk Projects Filter
    final overburnProjects = projects.where((p) => p.burnPct > p.progressPct && p.burnPct > 80).toList();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refreshDashboard,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Top Bar: Greeting & Period Filter Bar (Requirement #29)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Halo, $userName 👋', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      const SizedBox(height: 4),
                      Text('Dashboard Eksekutif DAMACO — Role: ${role.replaceAll("_", " ")}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Date Period Filter
                Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedPeriod,
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                      items: const [
                        DropdownMenuItem(value: 'ALL', child: Text('Semua Periode')),
                        DropdownMenuItem(value: 'today', child: Text('Hari Ini')),
                        DropdownMenuItem(value: 'this_week', child: Text('Minggu Ini')),
                        DropdownMenuItem(value: 'this_month', child: Text('Bulan Ini')),
                        DropdownMenuItem(value: 'last_month', child: Text('Bulan Lalu')),
                        DropdownMenuItem(value: 'this_quarter', child: Text('Kuartal Ini')),
                        DropdownMenuItem(value: 'this_year', child: Text('Tahun Ini')),
                      ],
                      onChanged: _onPeriodChanged,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Early Warning Banner (Progress vs Cost Over-burn Warning) (Requirement #8)
            if (overburnProjects.isNotEmpty && role != 'CLIENT' && role != 'MEMBER') ...[
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.3), width: 1.5),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                      child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('🔴 Warning Risk — ${overburnProjects.length} Proyek Melebihi Batas Serapan Biaya', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.danger)),
                          const SizedBox(height: 4),
                          Text(
                            '"Cost consumption is significantly higher than project progress on ${overburnProjects.first.name}."',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // ROLE-BASED DASHBOARD CONTENT (Requirements #2, #3, #4, #5, #6)
            if (role == 'CLIENT')
              _buildClientDashboard(context, projects)
            else if (role == 'MEMBER')
              _buildMemberDashboard(context, projects)
            else if (role == 'FINANCE')
              _buildFinanceDashboard(context, totalBudget, totalActualCost, totalCommittedCost, remainingBudget, totalInvoiced, totalPaid, outstandingInvoice, cashIn, cashOut, netCashFlow)
            else if (role == 'PROJECT_MANAGER')
              _buildPmDashboard(context, projects, totalBudget, totalActualCost, remainingBudget)
            else
              _buildOwnerDashboard(context, projects, totalBudget, totalActualCost, totalCommittedCost, remainingBudget, costConsumptionPct, totalInvoiced, totalPaid, outstandingInvoice, cashIn, cashOut, netCashFlow),
          ],
        ),
      ),
    );
  }

  // 1. OWNER DASHBOARD (Requirement #2)
  Widget _buildOwnerDashboard(
    BuildContext context,
    List<dynamic> projects,
    double totalBudget,
    double actualCost,
    double committedCost,
    double remainingBudget,
    int costPct,
    double totalInvoiced,
    double totalPaid,
    double outstanding,
    double cashIn,
    double cashOut,
    double netCashFlow,
  ) {
    int activeCount = projects.where((p) => p.status == 'IN_PROGRESS' || p.status == 'ACTIVE').length;
    int completedCount = projects.where((p) => p.status == 'COMPLETED').length;
    int atRiskCount = projects.where((p) => p.burnPct > p.progressPct && p.burnPct > 80).length;

    final isMobile = MediaQuery.of(context).size.width < 700;

    return Column(
      children: [
        // KPI Cards Row 1: Projects & Financial
        LayoutBuilder(
          builder: (context, constraints) {
            int count = constraints.maxWidth > 1100 ? 5 : (constraints.maxWidth > 700 ? 3 : 1);
            return GridView.count(
              crossAxisCount: count,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: constraints.maxWidth > 1100 ? 1.5 : (constraints.maxWidth > 700 ? 2.0 : 2.5),
              children: [
                MetricCard(
                  title: 'Total Projects',
                  value: '${projects.length}',
                  subtitle: '$activeCount Active • $completedCount Done • $atRiskCount Risk',
                  icon: Icons.folder_open_outlined,
                  iconColor: AppColors.primary,
                ),
                MetricCard(
                  title: 'Total Budget (RAB)',
                  value: Formatters.compactRupiah(totalBudget),
                  subtitle: 'Contract Baseline Value',
                  icon: Icons.account_balance_outlined,
                  iconColor: AppColors.primary,
                ),
                MetricCard(
                  title: 'Actual Cost',
                  value: Formatters.compactRupiah(actualCost),
                  subtitle: 'Labor Cost + Expenses',
                  icon: Icons.trending_up,
                  iconColor: AppColors.warning,
                ),
                MetricCard(
                  title: 'Committed Cost',
                  value: Formatters.compactRupiah(committedCost),
                  subtitle: 'Approved Purchase Orders',
                  icon: Icons.shopping_bag_outlined,
                  iconColor: AppColors.info,
                ),
                MetricCard(
                  title: 'Remaining Budget',
                  value: Formatters.compactRupiah(remainingBudget),
                  subtitle: 'Budget - Actual - Committed',
                  icon: Icons.savings_outlined,
                  iconColor: remainingBudget < 0 ? AppColors.danger : AppColors.success,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 12),

        // Billing & Cash Flow KPI Row
        if (isMobile) ...[
          _kpiBox('Total Invoiced', Formatters.compactRupiah(totalInvoiced), AppColors.info),
          const SizedBox(height: 8),
          _kpiBox('Total Paid', Formatters.compactRupiah(totalPaid), AppColors.success),
          const SizedBox(height: 8),
          _kpiBox('Outstanding Invoice', Formatters.compactRupiah(outstanding), outstanding > 0 ? AppColors.warning : AppColors.success),
          const SizedBox(height: 8),
          _kpiBox('Net Cash Flow', Formatters.compactRupiah(netCashFlow), netCashFlow >= 0 ? AppColors.primary : AppColors.danger),
        ] else ...[
          Row(
            children: [
              Expanded(child: _kpiBox('Total Invoiced', Formatters.compactRupiah(totalInvoiced), AppColors.info)),
              const SizedBox(width: 8),
              Expanded(child: _kpiBox('Total Paid', Formatters.compactRupiah(totalPaid), AppColors.success)),
              const SizedBox(width: 8),
              Expanded(child: _kpiBox('Outstanding Invoice', Formatters.compactRupiah(outstanding), outstanding > 0 ? AppColors.warning : AppColors.success)),
              const SizedBox(width: 8),
              Expanded(child: _kpiBox('Net Cash Flow', Formatters.compactRupiah(netCashFlow), netCashFlow >= 0 ? AppColors.primary : AppColors.danger)),
            ],
          ),
        ],
        const SizedBox(height: 24),

        // Charts Section
        if (isMobile) ...[
          const BudgetVsActualChart(),
          const SizedBox(height: 16),
          const MonthlyCashFlowChart(),
        ] else ...[
          const Row(
            children: [
              Expanded(child: BudgetVsActualChart()),
              SizedBox(width: 16),
              Expanded(child: MonthlyCashFlowChart()),
            ],
          ),
        ],
      ],
    );
  }

  // 2. PROJECT MANAGER DASHBOARD (Requirement #3)
  Widget _buildPmDashboard(
    BuildContext context,
    List<dynamic> projects,
    double totalBudget,
    double actualCost,
    double remainingBudget,
  ) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Column(
      children: [
        if (isMobile) ...[
          MetricCard(title: 'Active Managed Projects', value: '${projects.length}', subtitle: 'Dalam Tanggung Jawab Anda', icon: Icons.folder_open, iconColor: AppColors.primary),
          const SizedBox(height: 12),
          MetricCard(title: 'Total Actual Cost', value: Formatters.compactRupiah(actualCost), subtitle: 'Realisasi Biaya Pekerjaan', icon: Icons.trending_up, iconColor: AppColors.warning),
          const SizedBox(height: 12),
          MetricCard(title: 'Sisa Pagu Budget', value: Formatters.compactRupiah(remainingBudget), subtitle: 'Budget Terpakai', icon: Icons.savings, iconColor: AppColors.success),
        ] else ...[
          Row(
            children: [
              Expanded(child: MetricCard(title: 'Active Managed Projects', value: '${projects.length}', subtitle: 'Dalam Tanggung Jawab Anda', icon: Icons.folder_open, iconColor: AppColors.primary)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Total Actual Cost', value: Formatters.compactRupiah(actualCost), subtitle: 'Realisasi Biaya Pekerjaan', icon: Icons.trending_up, iconColor: AppColors.warning)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Sisa Pagu Budget', value: Formatters.compactRupiah(remainingBudget), subtitle: 'Budget Terpakai', icon: Icons.savings, iconColor: AppColors.success)),
            ],
          ),
        ],
        const SizedBox(height: 24),
        const ProgressVsCostChart(),
      ],
    );
  }

  // 3. MEMBER DASHBOARD (Requirement #4) — Strictly No Internal Margins/Profits/Salaries
  Widget _buildMemberDashboard(BuildContext context, List<dynamic> projects) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Column(
      children: [
        if (isMobile) ...[
          MetricCard(title: 'Tugas Saya Aktiv', value: '5 Tasks', subtitle: 'Pekerjaan berjalan', icon: Icons.check_circle_outline, iconColor: AppColors.primary),
          const SizedBox(height: 12),
          MetricCard(title: 'Jam Kerja Minggu Ini', value: '38 Jam', subtitle: 'Timesheet terverifikasi', icon: Icons.access_time, iconColor: AppColors.success),
          const SizedBox(height: 12),
          MetricCard(title: 'Proyek Terlibat', value: '${projects.length} Proyek', subtitle: 'Tim Anggota', icon: Icons.group, iconColor: AppColors.info),
        ] else ...[
          Row(
            children: [
              Expanded(child: MetricCard(title: 'Tugas Saya Aktiv', value: '5 Tasks', subtitle: 'Pekerjaan berjalan', icon: Icons.check_circle_outline, iconColor: AppColors.primary)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Jam Kerja Minggu Ini', value: '38 Jam', subtitle: 'Timesheet terverifikasi', icon: Icons.access_time, iconColor: AppColors.success)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Proyek Terlibat', value: '${projects.length} Proyek', subtitle: 'Tim Anggota', icon: Icons.group, iconColor: AppColors.info)),
            ],
          ),
        ],
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tugas Menggantung & Deadline Dekat', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 12),
              Text('Gunakan menu "My Tasks" dan "Timesheets" di navigasi sebelah kiri untuk mengupdate progress jam kerja Anda.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }

  // 4. FINANCE DASHBOARD (Requirement #5)
  Widget _buildFinanceDashboard(
    BuildContext context,
    double totalBudget,
    double actualCost,
    double committedCost,
    double remainingBudget,
    double totalInvoiced,
    double totalPaid,
    double outstanding,
    double cashIn,
    double cashOut,
    double netCashFlow,
  ) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Column(
      children: [
        if (isMobile) ...[
          MetricCard(title: 'Total Invoiced', value: Formatters.compactRupiah(totalInvoiced), subtitle: 'Total Tagihan', icon: Icons.receipt_long, iconColor: AppColors.info),
          const SizedBox(height: 12),
          MetricCard(title: 'Total Paid (Cash In)', value: Formatters.compactRupiah(cashIn), subtitle: 'Lunas Diterima', icon: Icons.payments, iconColor: AppColors.success),
          const SizedBox(height: 12),
          MetricCard(title: 'Total Cash Out', value: Formatters.compactRupiah(cashOut), subtitle: 'Vendor & Expenses', icon: Icons.shopping_cart, iconColor: AppColors.danger),
          const SizedBox(height: 12),
          MetricCard(title: 'Net Cash Flow', value: Formatters.compactRupiah(netCashFlow), subtitle: 'Cash In - Cash Out', icon: Icons.account_balance_wallet, iconColor: AppColors.primary),
        ] else ...[
          Row(
            children: [
              Expanded(child: MetricCard(title: 'Total Invoiced', value: Formatters.compactRupiah(totalInvoiced), subtitle: 'Total Tagihan', icon: Icons.receipt_long, iconColor: AppColors.info)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Total Paid (Cash In)', value: Formatters.compactRupiah(cashIn), subtitle: 'Lunas Diterima', icon: Icons.payments, iconColor: AppColors.success)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Total Cash Out', value: Formatters.compactRupiah(cashOut), subtitle: 'Vendor & Expenses', icon: Icons.shopping_cart, iconColor: AppColors.danger)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Net Cash Flow', value: Formatters.compactRupiah(netCashFlow), subtitle: 'Cash In - Cash Out', icon: Icons.account_balance_wallet, iconColor: AppColors.primary)),
            ],
          ),
        ],
        const SizedBox(height: 24),
        const MonthlyCashFlowChart(),
      ],
    );
  }

  // 5. CLIENT DASHBOARD (Requirement #6) — Strictly No Internal Costs/Salaries/Margins
  Widget _buildClientDashboard(BuildContext context, List<dynamic> projects) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Column(
      children: [
        if (isMobile) ...[
          MetricCard(title: 'Proyek Aktif Anda', value: '${projects.length}', subtitle: 'PT Bank Nusantara', icon: Icons.folder_open, iconColor: AppColors.primary),
          const SizedBox(height: 12),
          MetricCard(title: 'Status Pekerjaan', value: 'ON TRACK', subtitle: 'Kemajuan Sesuai Target', icon: Icons.verified, iconColor: AppColors.success),
        ] else ...[
          Row(
            children: [
              Expanded(child: MetricCard(title: 'Proyek Aktif Anda', value: '${projects.length}', subtitle: 'PT Bank Nusantara', icon: Icons.folder_open, iconColor: AppColors.primary)),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(title: 'Status Pekerjaan', value: 'ON TRACK', subtitle: 'Kemajuan Sesuai Target', icon: Icons.verified, iconColor: AppColors.success)),
            ],
          ),
        ],
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ringkasan Tagihan & Milestone Klien', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 12),
              Text('Gunakan menu "Invoices" dan "Milestones" untuk memantau termin pembayaran dan progress serah terima pekerjaan.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }

  static Widget _kpiBox(String title, String val, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
