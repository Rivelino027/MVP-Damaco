import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/project.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class BudgetTab extends StatefulWidget {
  const BudgetTab({super.key});

  @override
  State<BudgetTab> createState() => _BudgetTabState();
}

class _BudgetTabState extends State<BudgetTab> {
  String? _selectedProjectId;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<WbsProvider>().fetchPhases();
    });
  }

  void _showAddPhaseModal(List<ProjectModel> projects) {
    if (projects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Buat proyek terlebih dahulu sebelum menambahkan Budget Phase.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final budgetCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String targetProjectId = _selectedProjectId ?? projects.first.id;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
                top: 20,
                left: 20,
                right: 20,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Tambah Budget Phase WBS', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: targetProjectId,
                      decoration: const InputDecoration(labelText: 'Pilih Project *'),
                      items: projects.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => targetProjectId = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Nama Phase / WBS *', hintText: 'mis. Phase 1: Planning & Design'),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Nama Phase wajib diisi.' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: budgetCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Budget Baseline (Rp) *', hintText: '10000000'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Budget wajib diisi.';
                        final num = double.tryParse(v.trim());
                        if (num == null || num < 0) return 'Budget tidak boleh negatif.';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: descCtrl,
                      decoration: const InputDecoration(labelText: 'Deskripsi / Detail Phase'),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () async {
                          if (formKey.currentState!.validate()) {
                            final b = double.parse(budgetCtrl.text.trim());
                            final success = await context.read<WbsProvider>().createPhase({
                              'projectId': targetProjectId,
                              'name': nameCtrl.text.trim(),
                              'budgetAmount': b,
                              'description': descCtrl.text.trim(),
                            });

                            if (ctx.mounted) {
                              if (success) {
                                context.read<ProjectProvider>().fetchProjects();
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Budget Phase WBS berhasil ditambahkan.'), backgroundColor: AppColors.success),
                                );
                              } else {
                                final err = context.read<WbsProvider>().error ?? 'Gagal menambahkan phase.';
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                );
                              }
                            }
                          }
                        },
                        child: const Text('Simpan Budget Phase', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDeletePhase(PhaseModel phase) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Budget Phase'),
        content: Text('Apakah Anda yakin ingin menghapus phase "${phase.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<WbsProvider>().deletePhase(phase.id, projectId: phase.projectId);
              if (mounted) {
                if (success) {
                  context.read<ProjectProvider>().fetchProjects();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Budget Phase berhasil dihapus.'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<WbsProvider>().error ?? 'Gagal menghapus phase.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(err.contains('HAS_DEPENDENCIES')
                          ? 'Phase tidak dapat dihapus karena sudah memiliki histori timesheet atau pengeluaran terkait.'
                          : err),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                }
              }
            },
            child: const Text('Hapus Phase'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';
    final isClient = role == 'CLIENT';

    if (isClient) {
      return const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(30),
            child: Text('Akses ditolak. Client tidak diperbolehkan melihat detail struktur budget RAB.', style: TextStyle(color: AppColors.textMuted)),
          ),
        ),
      );
    }

    final projProvider = context.watch<ProjectProvider>();
    final wbsProvider = context.watch<WbsProvider>();

    final projects = projProvider.projects;
    final allPhases = wbsProvider.phases;

    final selectedProjectObj = _selectedProjectId != null
        ? projects.where((p) => p.id == _selectedProjectId).firstOrNull
        : null;

    final displayPhases = _selectedProjectId != null
        ? allPhases.where((p) => p.projectId == _selectedProjectId).toList()
        : allPhases;

    double totalBudget = selectedProjectObj != null
        ? selectedProjectObj.budgetTotal
        : projects.fold(0, (sum, p) => sum + p.budgetTotal);

    double totalActual = selectedProjectObj != null
        ? selectedProjectObj.actualTotalCost
        : projects.fold(0, (sum, p) => sum + p.actualTotalCost);

    double totalRemaining = totalBudget - totalActual;
    int overallUsedPct = totalBudget > 0 ? ((totalActual / totalBudget) * 100).round() : 0;
    bool isOverBudget = totalActual > totalBudget && totalBudget > 0;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<ProjectProvider>().fetchProjects();
          await context.read<WbsProvider>().fetchPhases();
        },
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hierarchical Project Budget (RAB)', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      const Text('Rincian baseline anggaran per Fase WBS vs Realisasi Biaya Aktual (Labor + Expense)', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
                if (role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER' || role == 'FINANCE') ...[
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () => _showAddPhaseModal(projects),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add Budget Phase'),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),

            // Project Selector Filter Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.filter_list, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  const Text('Filter Proyek:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String?>(
                        value: _selectedProjectId,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                        items: [
                          const DropdownMenuItem<String?>(value: null, child: Text('Semua Proyek (Portofolio)')),
                          ...projects.map((p) => DropdownMenuItem<String?>(value: p.id, child: Text('${p.code} - ${p.name}'))),
                        ],
                        onChanged: (val) => setState(() => _selectedProjectId = val),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Warning Banner for Over Budget or High Consumption
            if (isOverBudget) ...[
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.dangerBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.warning, color: AppColors.danger, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Project is over budget! Total biaya aktual (Labor + Expense) telah melebihi nilai budget baseline.',
                        style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (overallUsedPct >= 80) ...[
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.warningBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.info_outline, color: AppColors.warning, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Budget approaching limit. Penyerapan anggaran telah mencapai lebih dari 80%.',
                        style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Total Summary Cards
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth < 700) {
                  return GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.6,
                    children: [
                      _kpiCard('Budget Baseline', Formatters.compactRupiah(totalBudget), Icons.account_balance, AppColors.primary),
                      _kpiCard('Actual Cost', Formatters.compactRupiah(totalActual), Icons.trending_up, AppColors.warning),
                      _kpiCard('Remaining', Formatters.compactRupiah(totalRemaining), Icons.account_balance_wallet, totalRemaining < 0 ? AppColors.danger : AppColors.success),
                      _kpiCard('Consumption', '$overallUsedPct%', Icons.pie_chart, isOverBudget ? AppColors.danger : AppColors.info),
                    ],
                  );
                }
                return Row(
                  children: [
                    Expanded(child: _kpiCard('Total Budget Baseline', Formatters.compactRupiah(totalBudget), Icons.account_balance, AppColors.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: _kpiCard('Total Actual Cost', Formatters.compactRupiah(totalActual), Icons.trending_up, AppColors.warning)),
                    const SizedBox(width: 12),
                    Expanded(child: _kpiCard('Remaining Budget', Formatters.compactRupiah(totalRemaining), Icons.account_balance_wallet, totalRemaining < 0 ? AppColors.danger : AppColors.success)),
                    const SizedBox(width: 12),
                    Expanded(child: _kpiCard('Overall Consumption', '$overallUsedPct%', Icons.pie_chart, isOverBudget ? AppColors.danger : AppColors.info)),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),

            // Hierarchical Budget Table Container
            LayoutBuilder(
              builder: (context, constraints) {
                if (displayPhases.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Text('Belum ada data Budget Phase terdaftar.', style: TextStyle(color: AppColors.textMuted)),
                  );
                }

                if (constraints.maxWidth < 750) {
                  return Column(
                    children: displayPhases.map((phase) {
                      final budget = phase.budgetTotal;
                      final actual = phase.actualTotalCost;
                      final remaining = budget - actual;
                      int used = budget > 0 ? ((actual / budget) * 100).round() : 0;
                      Color barColor = used > 100 ? AppColors.danger : (used > 80 ? AppColors.warning : AppColors.success);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(phase.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                                  ),
                                  if (role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER' || role == 'FINANCE')
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                      onPressed: () => _confirmDeletePhase(phase),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Budget Baseline', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                      Text(Formatters.compactRupiah(budget), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      const Text('Actual Cost', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                      Text(Formatters.compactRupiah(actual), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.warning)),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      const Text('Sisa Pagu', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                      Text(Formatters.compactRupiah(remaining), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: remaining < 0 ? AppColors.danger : AppColors.success)),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Serapan Anggaran', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                  Text('$used%', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: barColor)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (used / 100).clamp(0.0, 1.0),
                                  minHeight: 6,
                                  backgroundColor: AppColors.borderSubtle,
                                  valueColor: AlwaysStoppedAnimation<Color>(barColor),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  );
                }

                return Container(
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      // Table Header
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: const BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
                          border: Border(bottom: BorderSide(color: AppColors.border)),
                        ),
                        child: Row(
                          children: const [
                            Expanded(flex: 3, child: Text('Phase WBS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                            Expanded(flex: 2, child: Text('Budget Baseline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                            Expanded(flex: 2, child: Text('Actual Cost', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                            Expanded(flex: 2, child: Text('Remaining', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                            Expanded(flex: 2, child: Text('Used %', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                            SizedBox(width: 40, child: Text('Action', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary))),
                          ],
                        ),
                      ),

                      // Table Rows
                      ...displayPhases.map((phase) {
                        final budget = phase.budgetTotal;
                        final actual = phase.actualTotalCost;
                        final remaining = budget - actual;
                        int used = budget > 0 ? ((actual / budget) * 100).round() : 0;
                        Color barColor = used > 100 ? AppColors.danger : (used > 80 ? AppColors.warning : AppColors.success);

                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: const BoxDecoration(
                            border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: Text(phase.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary)),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(Formatters.compactRupiah(budget), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(Formatters.compactRupiah(actual), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.warning)),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(Formatters.compactRupiah(remaining), style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: remaining < 0 ? AppColors.danger : AppColors.success)),
                              ),
                              Expanded(
                                flex: 2,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('$used%', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: barColor)),
                                    const SizedBox(height: 4),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: (used / 100).clamp(0.0, 1.0),
                                        minHeight: 6,
                                        backgroundColor: AppColors.borderSubtle,
                                        valueColor: AlwaysStoppedAnimation<Color>(barColor),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(
                                width: 40,
                                child: (role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER' || role == 'FINANCE')
                                    ? IconButton(
                                        icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                        onPressed: () => _confirmDeletePhase(phase),
                                        tooltip: 'Hapus Phase',
                                      )
                                    : const SizedBox.shrink(),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  static Widget _kpiCard(String title, String val, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(val, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}
