import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/expense_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../providers/task_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class ExpensesTab extends StatefulWidget {
  const ExpensesTab({super.key});

  @override
  State<ExpensesTab> createState() => _ExpensesTabState();
}

class _ExpensesTabState extends State<ExpensesTab> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'ALL';
  String _selectedStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ExpenseProvider>().fetchExpenses();
      context.read<ProjectProvider>().fetchProjects();
      context.read<WbsProvider>().fetchPhases();
      context.read<TaskProvider>().fetchTasks();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddExpenseModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _ExpenseFormModal(),
    );
  }

  void _showEditExpenseModal(ExpenseModel expense) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _ExpenseFormModal(expense: expense),
    );
  }

  Future<void> _updateStatus(ExpenseModel expense, String status) async {
    final success = await context.read<ExpenseProvider>().updateExpenseStatus(expense.id, status, projectId: expense.projectId);
    if (mounted) {
      if (success) {
        context.read<ProjectProvider>().fetchProjectById(expense.projectId);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status pengeluaran diperbarui menjadi $status'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<ExpenseProvider>().error ?? 'Gagal memperbarui status.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  void _confirmDeleteExpense(ExpenseModel expense) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Pengeluaran'),
        content: Text('Apakah Anda yakin ingin menghapus pengeluaran "${expense.description ?? 'Pengeluaran'}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<ExpenseProvider>().deleteExpense(expense.id, projectId: expense.projectId);
              if (mounted) {
                if (success) {
                  context.read<ProjectProvider>().fetchProjectById(expense.projectId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Pengeluaran berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<ExpenseProvider>().error ?? 'Gagal menghapus pengeluaran.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus Pengeluaran'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';
    final currentUserId = user?.id;

    final expenseProvider = context.watch<ExpenseProvider>();
    final allExpenses = expenseProvider.expenses;
    final isLoading = expenseProvider.isLoading;

    String fabLabel = 'Input Pengeluaran';
    String headerTitle = 'Pengeluaran Langsung Proyek';
    String headerSubtitle = 'Lisensi software, vendor, travel, & biaya material';

    if (role == 'MEMBER') {
      fabLabel = 'Ajukan Reimbursement';
      headerTitle = 'Klaim Pengeluaran Saya';
      headerSubtitle = 'Pengajuan biaya dinas/material & status persetujuannya';
    } else if (role == 'PM' || role == 'PROJECT_MANAGER') {
      headerTitle = 'Approval Pengeluaran Tim';
      headerSubtitle = 'Persetujuan klaim biaya proyek dari anggota tim';
    } else if (role == 'FINANCE') {
      headerTitle = 'Pencairan Biaya Pengeluaran';
      headerSubtitle = 'Verifikasi nota & pencairan dana biaya terverifikasi';
    }

    final query = _searchController.text.toLowerCase().trim();
    final filteredExpenses = allExpenses.where((exp) {
      final titleStr = (exp.description ?? '').toLowerCase();
      final categoryStr = exp.category.toLowerCase();
      final submitter = exp.submittedByName.toLowerCase();
      final projectName = (exp.projectName ?? '').toLowerCase();

      final matchesSearch = query.isEmpty ||
          titleStr.contains(query) ||
          categoryStr.contains(query) ||
          submitter.contains(query) ||
          projectName.contains(query);

      final expCategory = exp.category.toUpperCase();
      final matchesCategory = _selectedCategory == 'ALL' || expCategory == _selectedCategory;

      final expStatus = exp.status.toUpperCase();
      final matchesStatus = _selectedStatus == 'ALL' || expStatus == _selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    }).toList();

    final canInput = role != 'CLIENT';

    return Scaffold(
      floatingActionButton: canInput
          ? FloatingActionButton.extended(
              onPressed: _showAddExpenseModal,
              icon: const Icon(Icons.receipt_long_outlined),
              label: Text(fabLabel),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<ExpenseProvider>().fetchExpenses();
          await context.read<ProjectProvider>().fetchProjects();
        },
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(headerTitle, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      Text(headerSubtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Search & Category & Status Filter Controls
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: const TextStyle(fontSize: 13),
                            decoration: const InputDecoration(
                              hintText: 'Cari pengeluaran (deskripsi, kategori, pemohon, proyek)...',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        if (_searchController.text.isNotEmpty)
                          IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                            icon: const Icon(Icons.clear, size: 16, color: AppColors.textMuted),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedCategory,
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                      items: const [
                        DropdownMenuItem(value: 'ALL', child: Text('Semua Kategori')),
                        DropdownMenuItem(value: 'SOFTWARE_LICENSE', child: Text('Software License')),
                        DropdownMenuItem(value: 'SUBCONTRACTOR', child: Text('Subkontraktor')),
                        DropdownMenuItem(value: 'MATERIAL', child: Text('Material')),
                        DropdownMenuItem(value: 'TRAVEL', child: Text('Travel')),
                        DropdownMenuItem(value: 'HOSTING', child: Text('Hosting / Cloud')),
                        DropdownMenuItem(value: 'EQUIPMENT', child: Text('Equipment')),
                        DropdownMenuItem(value: 'TRANSPORTATION', child: Text('Transportasi')),
                        DropdownMenuItem(value: 'OTHER', child: Text('Lainnya')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedCategory = val);
                      },
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            else if (filteredExpenses.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada data pengeluaran.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredExpenses.map((exp) {
                final titleStr = exp.description ?? exp.category;
                final status = exp.status;
                final dateStr = exp.expenseDate.toIso8601String();
                final canModify = role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER' || role == 'FINANCE' || (currentUserId != null && exp.submittedById == currentUserId && (status == 'DRAFT' || status == 'SUBMITTED'));

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: status == 'PAID'
                                  ? AppColors.success.withValues(alpha: 0.15)
                                  : (status == 'APPROVED' ? AppColors.info.withValues(alpha: 0.15) : AppColors.warning.withValues(alpha: 0.15)),
                              child: Icon(
                                status == 'PAID' ? Icons.task_alt : Icons.receipt,
                                color: status == 'PAID'
                                    ? AppColors.success
                                    : (status == 'APPROVED' ? AppColors.info : AppColors.warning),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    titleStr,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                  ),
                                  if (exp.projectName != null) ...[
                                    const SizedBox(height: 2),
                                    Text('Proyek: ${exp.projectName}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
                                  ],
                                ],
                              ),
                            ),
                            Text(
                              Formatters.rupiah(exp.amount),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.danger),
                            ),
                            if (canModify) ...[
                              const SizedBox(width: 4),
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                onPressed: () => _showEditExpenseModal(exp),
                                tooltip: 'Edit Pengeluaran',
                              ),
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                onPressed: () => _confirmDeleteExpense(exp),
                                tooltip: 'Hapus Pengeluaran',
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Phase: ${exp.phaseName ?? '-'} | Task: ${exp.taskTitle ?? '-'} | Kategori: ${exp.category}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                        const SizedBox(height: 2),
                        Text('Diajukan oleh: ${exp.submittedByName}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 10),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    Formatters.formatDate(dateStr),
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                            ),
                            if ((role == 'PM' || role == 'PROJECT_MANAGER' || role == 'OWNER' || role == 'FINANCE') && (status == 'SUBMITTED' || status == 'DRAFT')) ...[
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ElevatedButton.icon(
                                    onPressed: () => _updateStatus(exp, 'APPROVED'),
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    icon: const Icon(Icons.check, size: 14),
                                    label: const Text('Setujui (Approve)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 6),
                                  OutlinedButton.icon(
                                    onPressed: () => _updateStatus(exp, 'REJECTED'),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                      foregroundColor: AppColors.danger,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    icon: const Icon(Icons.close, size: 14),
                                    label: const Text('Tolak', style: TextStyle(fontSize: 11)),
                                  ),
                                ],
                              ),
                            ] else if ((role == 'FINANCE' || role == 'OWNER') && status == 'APPROVED') ...[
                              ElevatedButton.icon(
                                onPressed: () => _updateStatus(exp, 'PAID'),
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  backgroundColor: AppColors.success,
                                  foregroundColor: Colors.white,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                icon: const Icon(Icons.payments, size: 14),
                                label: const Text('Cairkan (Paid)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ] else ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: status == 'PAID' || status == 'APPROVED'
                                      ? AppColors.success.withValues(alpha: 0.15)
                                      : (status == 'REJECTED' ? AppColors.danger.withValues(alpha: 0.15) : AppColors.warning.withValues(alpha: 0.15)),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: status == 'PAID' || status == 'APPROVED'
                                        ? AppColors.success
                                        : (status == 'REJECTED' ? AppColors.danger : AppColors.warning),
                                  ),
                                ),
                              ),
                            ]
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _ExpenseFormModal extends StatefulWidget {
  final ExpenseModel? expense;
  final String? initialProjectId;

  const _ExpenseFormModal({
    this.expense,
    this.initialProjectId,
  });

  @override
  State<_ExpenseFormModal> createState() => _ExpenseFormModalState();
}

class _ExpenseFormModalState extends State<_ExpenseFormModal> {
  final _amountController = TextEditingController();
  final _descController = TextEditingController();

  String? _selectedProjectId;
  String? _selectedPhaseId;
  String? _selectedTaskId;
  String _category = 'SOFTWARE_LICENSE';
  DateTime _expenseDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final projects = context.read<ProjectProvider>().projects;
    final phases = context.read<WbsProvider>().phases;
    final tasks = context.read<TaskProvider>().tasks;

    if (widget.expense != null) {
      final exp = widget.expense!;
      _amountController.text = exp.amount.toStringAsFixed(0);
      _descController.text = exp.description ?? '';
      _category = exp.category;
      _expenseDate = exp.expenseDate;
      _selectedProjectId = exp.projectId.isNotEmpty ? exp.projectId : null;
      _selectedPhaseId = exp.phaseId.isNotEmpty ? exp.phaseId : null;
      _selectedTaskId = exp.taskId;
    } else {
      _selectedProjectId = widget.initialProjectId ?? (projects.isNotEmpty ? projects.first.id : null);
    }

    if (_selectedProjectId != null && _selectedPhaseId == null) {
      final matchedPhases = phases.where((p) => p.projectId == _selectedProjectId).toList();
      if (matchedPhases.isNotEmpty) {
        _selectedPhaseId = matchedPhases.first.id;
      }
    }

    if (_selectedPhaseId != null && _selectedTaskId == null) {
      final matchedTasks = tasks.where((t) => t.phaseId == _selectedPhaseId).toList();
      if (matchedTasks.isNotEmpty) {
        _selectedTaskId = matchedTasks.first.id;
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _expenseDate = picked);
    }
  }

  void _submit() async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    final desc = _descController.text.trim();

    if (_selectedProjectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih Project terlebih dahulu.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Deskripsi / Detail pengeluaran wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nominal biaya pengeluaran harus berupa angka positif lebih dari 0.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'projectId': _selectedProjectId,
      'phaseId': _selectedPhaseId,
      'taskId': _selectedTaskId,
      'category': _category,
      'description': desc,
      'amount': amount,
      'expenseDate': _expenseDate.toIso8601String(),
    };

    bool success;
    if (widget.expense == null) {
      success = await context.read<ExpenseProvider>().createExpense(payload);
    } else {
      success = await context.read<ExpenseProvider>().updateExpense(widget.expense!.id, payload, projectId: _selectedProjectId);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        if (_selectedProjectId != null) {
          context.read<ProjectProvider>().fetchProjectById(_selectedProjectId!);
        }
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.expense == null ? 'Pengeluaran berhasil dicatat!' : 'Pengeluaran berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<ExpenseProvider>().error ?? 'Gagal menyimpan pengeluaran.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final projects = context.watch<ProjectProvider>().projects;
    final allPhases = context.watch<WbsProvider>().phases;
    final allTasks = context.watch<TaskProvider>().tasks;

    final availablePhases = _selectedProjectId == null
        ? allPhases
        : allPhases.where((p) => p.projectId == _selectedProjectId).toList();

    final availableTasks = _selectedPhaseId == null
        ? (_selectedProjectId == null
            ? allTasks
            : allTasks.where((t) => t.projectId == _selectedProjectId).toList())
        : allTasks.where((t) => t.phaseId == _selectedPhaseId).toList();

    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.expense == null ? 'Input Pengeluaran Langsung' : 'Edit Pengeluaran',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),

            // Dynamic Cascade Dropdowns: Project -> Phase -> Task
            DropdownButtonFormField<String>(
              value: _selectedProjectId,
              decoration: const InputDecoration(labelText: 'Pilih Project *'),
              items: projects.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedProjectId = val;
                  final filteredPhases = allPhases.where((p) => p.projectId == val).toList();
                  _selectedPhaseId = filteredPhases.isNotEmpty ? filteredPhases.first.id : null;

                  final filteredTasks = allTasks.where((t) => _selectedPhaseId != null ? t.phaseId == _selectedPhaseId : t.projectId == val).toList();
                  _selectedTaskId = filteredTasks.isNotEmpty ? filteredTasks.first.id : null;
                });
              },
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedPhaseId,
                    decoration: const InputDecoration(labelText: 'WBS / Phase'),
                    items: availablePhases.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedPhaseId = val;
                        final filteredTasks = allTasks.where((t) => t.phaseId == val).toList();
                        _selectedTaskId = filteredTasks.isNotEmpty ? filteredTasks.first.id : null;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedTaskId,
                    decoration: const InputDecoration(labelText: 'Task (Opsional)'),
                    items: [
                      const DropdownMenuItem<String>(value: null, child: Text('-- Pilih Task --')),
                      ...availableTasks.map((t) => DropdownMenuItem(value: t.id, child: Text(t.title))),
                    ],
                    onChanged: (val) => setState(() => _selectedTaskId = val),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _category,
                    decoration: const InputDecoration(labelText: 'Kategori Pengeluaran *'),
                    items: const [
                      DropdownMenuItem(value: 'SOFTWARE_LICENSE', child: Text('Software License')),
                      DropdownMenuItem(value: 'SUBCONTRACTOR', child: Text('Subkontraktor')),
                      DropdownMenuItem(value: 'MATERIAL', child: Text('Material & Hardware')),
                      DropdownMenuItem(value: 'TRAVEL', child: Text('Perjalanan Dinas')),
                      DropdownMenuItem(value: 'HOSTING', child: Text('Hosting / Cloud')),
                      DropdownMenuItem(value: 'EQUIPMENT', child: Text('Equipment')),
                      DropdownMenuItem(value: 'TRANSPORTATION', child: Text('Transportasi')),
                      DropdownMenuItem(value: 'OTHER', child: Text('Lainnya')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _category = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _selectDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Tanggal *'),
                      child: Text('${_expenseDate.day}/${_expenseDate.month}/${_expenseDate.year}'),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Nominal Biaya (Rp) *'),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _descController,
              decoration: const InputDecoration(labelText: 'Deskripsi / Catatan Pengeluaran *'),
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.expense == null ? 'Simpan Pengeluaran' : 'Simpan Perubahan', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
