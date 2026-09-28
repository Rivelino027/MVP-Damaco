import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/timesheet_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../providers/task_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class TimesheetsTab extends StatefulWidget {
  const TimesheetsTab({super.key});

  @override
  State<TimesheetsTab> createState() => _TimesheetsTabState();
}

class _TimesheetsTabState extends State<TimesheetsTab> {
  final TextEditingController _searchController = TextEditingController();
  bool _filterMyTimesheetsOnly = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<TimesheetProvider>().fetchTimesheets();
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

  void _showAddTimesheetDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _TimesheetFormModal(),
    );
  }

  void _showEditTimesheetDialog(TimesheetModel timesheet) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _TimesheetFormModal(timesheet: timesheet),
    );
  }

  void _confirmDeleteTimesheet(TimesheetModel timesheet) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Timesheet'),
        content: Text('Apakah Anda yakin ingin menghapus catatan timesheet untuk "${timesheet.taskTitle ?? 'Task'}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<TimesheetProvider>().deleteTimesheet(timesheet.id, projectId: timesheet.projectId);
              if (mounted) {
                if (success) {
                  // Refresh task and project actual labor
                  context.read<TaskProvider>().fetchTasks(projectId: timesheet.projectId);
                  context.read<ProjectProvider>().fetchProjectById(timesheet.projectId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Catatan timesheet berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<TimesheetProvider>().error ?? 'Gagal menghapus timesheet.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus Timesheet'),
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

    final timesheetProvider = context.watch<TimesheetProvider>();
    final allTimesheets = timesheetProvider.timesheets;
    final isLoading = timesheetProvider.isLoading;

    String title = 'Catatan Jam Kerja (Timesheet)';
    String subtitle = 'Rate Anda: ${Formatters.rupiah(user?.hourlyRate ?? 0)}/jam → Otomatis dihitung ke Biaya Tenaga Kerja';

    if (role == 'MEMBER') {
      title = 'Log Jam Kerja Saya';
      subtitle = 'Rate Anda: ${Formatters.rupiah(user?.hourlyRate ?? 0)}/jam → Catat aktivitas harian Anda di sini';
    } else if (role == 'PM' || role == 'PROJECT_MANAGER') {
      title = 'Approval & Audit Timesheet Tim';
      subtitle = 'Monitoring alokasi jam kerja seluruh anggota tim proyek';
    } else if (role == 'FINANCE') {
      title = 'Audit Beban Biaya Labor Tim';
      subtitle = 'Rekapitulasi beban biaya tenaga kerja dari log timesheet';
    } else if (role == 'OWNER') {
      title = 'Audit Transparansi Labor Cost Eksekutif';
      subtitle = 'Analisis beban tenaga kerja langsung terhadap portofolio';
    }

    final query = _searchController.text.toLowerCase().trim();
    final filteredTimesheets = allTimesheets.where((ts) {
      final taskTitle = (ts.taskTitle ?? '').toLowerCase();
      final userName = ts.userName.toLowerCase();
      final projectName = (ts.projectName ?? '').toLowerCase();
      final desc = (ts.description ?? '').toLowerCase();

      final matchesSearch = query.isEmpty ||
          taskTitle.contains(query) ||
          userName.contains(query) ||
          projectName.contains(query) ||
          desc.contains(query);

      final matchesMy = !_filterMyTimesheetsOnly || (currentUserId != null && ts.userId == currentUserId);

      return matchesSearch && matchesMy;
    }).toList();

    final canInput = role != 'CLIENT';

    return Scaffold(
      floatingActionButton: canInput
          ? FloatingActionButton.extended(
              onPressed: _showAddTimesheetDialog,
              icon: const Icon(Icons.add_alarm),
              label: const Text('Input Jam Kerja'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<TimesheetProvider>().fetchTimesheets();
          await context.read<ProjectProvider>().fetchProjects();
          await context.read<TaskProvider>().fetchTasks();
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
                      Text(title, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // My Timesheet Filter Chip
            Row(
              children: [
                FilterChip(
                  label: const Text('Semua Timesheet'),
                  selected: !_filterMyTimesheetsOnly,
                  onSelected: (selected) {
                    if (selected) setState(() => _filterMyTimesheetsOnly = false);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: Text('Timesheet Saya (${user?.name ?? 'Saya'})'),
                  selected: _filterMyTimesheetsOnly,
                  onSelected: (selected) {
                    if (selected) setState(() => _filterMyTimesheetsOnly = true);
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Search Filter Control
            Container(
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
                        hintText: 'Cari timesheet (pekerjaan, nama tim, proyek, catatan)...',
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
            const SizedBox(height: 20),

            if (isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            else if (filteredTimesheets.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada catatan timesheet.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredTimesheets.map((ts) {
                final taskTitle = ts.taskTitle ?? 'Task Pekerjaan';
                final canModify = role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER' || (currentUserId != null && ts.userId == currentUserId);

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                              child: const Icon(Icons.access_time_filled, color: AppColors.primary, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    taskTitle,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Oleh: ${ts.userName} ${ts.projectName != null ? '• Proyek: ${ts.projectName}' : ''}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                            if (canModify) ...[
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                onPressed: () => _showEditTimesheetDialog(ts),
                                tooltip: 'Edit Timesheet',
                              ),
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                onPressed: () => _confirmDeleteTimesheet(ts),
                                tooltip: 'Hapus Timesheet',
                              ),
                            ],
                          ],
                        ),
                        if (ts.description != null && ts.description!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            ts.description!,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
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
                                        Formatters.formatDate(ts.date.toIso8601String()),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.info.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.schedule, size: 12, color: AppColors.info),
                                      const SizedBox(width: 4),
                                      Text(
                                        Formatters.formatHours(ts.hours),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.info),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Beban Biaya: ', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                Text(
                                  ts.laborCost != null ? Formatters.compactRupiah(ts.laborCost!) : 'Rp -',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.success),
                                ),
                              ],
                            ),
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

class _TimesheetFormModal extends StatefulWidget {
  final TimesheetModel? timesheet;

  const _TimesheetFormModal({
    this.timesheet,
  });

  @override
  State<_TimesheetFormModal> createState() => _TimesheetFormModalState();
}

class _TimesheetFormModalState extends State<_TimesheetFormModal> {
  final _hoursController = TextEditingController(text: '8');
  final _descController = TextEditingController();

  String? _selectedProjectId;
  String? _selectedPhaseId;
  String? _selectedTaskId;
  DateTime _timesheetDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final projects = context.read<ProjectProvider>().projects;
    final phases = context.read<WbsProvider>().phases;
    final tasks = context.read<TaskProvider>().tasks;

    if (widget.timesheet != null) {
      final ts = widget.timesheet!;
      _hoursController.text = ts.hours.toStringAsFixed(ts.hours % 1 == 0 ? 0 : 1);
      _descController.text = ts.description ?? '';
      _timesheetDate = ts.date;
      _selectedProjectId = ts.projectId.isNotEmpty ? ts.projectId : null;
      _selectedTaskId = ts.taskId.isNotEmpty ? ts.taskId : null;

      if (_selectedTaskId != null && tasks.isNotEmpty) {
        final matchedTask = tasks.where((t) => t.id == _selectedTaskId).firstOrNull;
        if (matchedTask != null) {
          _selectedPhaseId = matchedTask.phaseId;
        }
      }
    } else {
      _selectedProjectId = projects.isNotEmpty ? projects.first.id : null;
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
    _hoursController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _timesheetDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _timesheetDate = picked);
    }
  }

  void _submit() async {
    if (_selectedTaskId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih pekerjaan / task terlebih dahulu.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final hours = double.tryParse(_hoursController.text.trim()) ?? 0;
    if (hours <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Durasi jam kerja harus berupa angka positif lebih dari 0.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'projectId': _selectedProjectId,
      'taskId': _selectedTaskId,
      'date': _timesheetDate.toIso8601String(),
      'hours': hours,
      'description': _descController.text.trim(),
    };

    bool success;
    if (widget.timesheet == null) {
      success = await context.read<TimesheetProvider>().createTimesheet(payload);
    } else {
      success = await context.read<TimesheetProvider>().updateTimesheet(widget.timesheet!.id, payload, projectId: _selectedProjectId);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        if (_selectedProjectId != null) {
          context.read<TaskProvider>().fetchTasks(projectId: _selectedProjectId);
          context.read<ProjectProvider>().fetchProjectById(_selectedProjectId!);
        }
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.timesheet == null ? 'Timesheet berhasil ditambahkan!' : 'Timesheet berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<TimesheetProvider>().error ?? 'Gagal menyimpan timesheet.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final projects = context.watch<ProjectProvider>().projects;
    final allPhases = context.watch<WbsProvider>().phases;
    final allTasks = context.watch<TaskProvider>().tasks;

    final availablePhases = _selectedProjectId == null
        ? allPhases
        : allPhases.where((p) => p.projectId == _selectedProjectId).toList();

    final availableTasks = _selectedProjectId == null
        ? allTasks
        : (_selectedPhaseId == null
            ? allTasks.where((t) => t.projectId == _selectedProjectId).toList()
            : allTasks.where((t) => t.projectId == _selectedProjectId && t.phaseId == _selectedPhaseId).toList());

    if (_selectedPhaseId != null && !availablePhases.any((p) => p.id == _selectedPhaseId)) {
      _selectedPhaseId = null;
    }
    if (_selectedTaskId != null && !availableTasks.any((t) => t.id == _selectedTaskId)) {
      _selectedTaskId = null;
    }

    double hours = double.tryParse(_hoursController.text) ?? 0;
    double userRate = widget.timesheet?.hourlyRateSnapshot ?? user?.hourlyRate ?? 100000;
    double autoLaborCost = hours * userRate;

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
                  widget.timesheet == null ? 'Input Jam Kerja (Timesheet)' : 'Edit Catatan Timesheet',
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
              items: projects.isEmpty
                  ? [const DropdownMenuItem<String>(value: null, child: Text('Tidak ada project'))]
                  : projects.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedProjectId = val;
                  _selectedPhaseId = null;
                  _selectedTaskId = null;
                  final filteredPhases = allPhases.where((p) => p.projectId == val).toList();
                  if (filteredPhases.isNotEmpty) {
                    _selectedPhaseId = filteredPhases.first.id;
                  }
                  final filteredTasks = allTasks.where((t) => _selectedPhaseId != null ? t.phaseId == _selectedPhaseId : t.projectId == val).toList();
                  if (filteredTasks.isNotEmpty) {
                    _selectedTaskId = filteredTasks.first.id;
                  }
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
                    items: _selectedProjectId == null
                        ? [const DropdownMenuItem<String>(value: null, child: Text('Select Project first'))]
                        : (availablePhases.isEmpty
                            ? [const DropdownMenuItem<String>(value: null, child: Text('No WBS available for this project'))]
                            : availablePhases.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList()),
                    onChanged: (val) {
                      setState(() {
                        _selectedPhaseId = val;
                        _selectedTaskId = null;
                        final filteredTasks = allTasks.where((t) => val != null ? t.phaseId == val : t.projectId == _selectedProjectId).toList();
                        if (filteredTasks.isNotEmpty) {
                          _selectedTaskId = filteredTasks.first.id;
                        }
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _selectDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Tanggal *'),
                      child: Text('${_timesheetDate.day}/${_timesheetDate.month}/${_timesheetDate.year}'),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<String>(
              value: _selectedTaskId,
              decoration: const InputDecoration(labelText: 'Pilih Pekerjaan / Task *'),
              items: _selectedProjectId == null
                  ? [const DropdownMenuItem<String>(value: null, child: Text('Select Project first'))]
                  : (availableTasks.isEmpty
                      ? [const DropdownMenuItem<String>(value: null, child: Text('No tasks available for this project/WBS'))]
                      : availableTasks.map((t) => DropdownMenuItem(value: t.id, child: Text(t.title))).toList()),
              onChanged: (val) => setState(() => _selectedTaskId = val),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _hoursController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Durasi Jam Kerja (mis. 8 atau 1.5) *'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _descController,
              decoration: const InputDecoration(labelText: 'Catatan Aktivitas / Progress Pekerjaan'),
            ),
            const SizedBox(height: 16),

            // Live Labor Cost Calculation Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Rate Snapshot (${user?.name ?? 'User'}):', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text('${Formatters.rupiah(userRate)}/jam', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kalkulasi Biaya Tenaga Kerja:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                      Text(
                        Formatters.rupiah(autoLaborCost),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.timesheet == null ? 'Simpan Timesheet' : 'Simpan Perubahan', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
