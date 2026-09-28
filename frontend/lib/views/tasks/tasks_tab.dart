import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/project.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class TasksTab extends StatefulWidget {
  const TasksTab({super.key});

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'ALL';
  String _selectedPriority = 'ALL';
  bool _filterMyTasksOnly = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<TaskProvider>().fetchTasks();
      context.read<ProjectProvider>().fetchProjects();
      context.read<WbsProvider>().fetchPhases();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddTaskModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _TaskFormModal(),
    );
  }

  void _showEditTaskModal(TaskModel task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _TaskFormModal(task: task),
    );
  }

  Future<void> _updateStatus(TaskModel task, String status) async {
    final success = await context.read<TaskProvider>().updateTaskStatus(
      task.id,
      status,
      progressPercentage: status == 'COMPLETED' ? 100 : null,
    );
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status task diperbarui menjadi $status'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<TaskProvider>().error ?? 'Gagal memperbarui status';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  void _confirmDeleteTask(TaskModel task) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Pekerjaan'),
        content: Text('Apakah Anda yakin ingin menghapus task "${task.title}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<TaskProvider>().deleteTask(task.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Task berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<TaskProvider>().error ?? 'Gagal menghapus task.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus Task'),
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
    final canManageTasks = role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER';

    final taskProvider = context.watch<TaskProvider>();
    final allTasks = taskProvider.tasks;
    final isLoading = taskProvider.isLoading;

    final query = _searchController.text.toLowerCase().trim();
    final filteredTasks = allTasks.where((t) {
      final taskTitle = t.title.toLowerCase();
      final assignee = (t.assigneeName ?? '').toLowerCase();
      final phaseName = (t.phaseName ?? '').toLowerCase();
      final projectName = (t.projectName ?? '').toLowerCase();
      final matchesSearch = query.isEmpty ||
          taskTitle.contains(query) ||
          assignee.contains(query) ||
          phaseName.contains(query) ||
          projectName.contains(query);

      final statusStr = t.status.toUpperCase();
      final matchesStatus = _selectedStatus == 'ALL' || statusStr == _selectedStatus;

      final priorityStr = t.priority.toUpperCase();
      final matchesPriority = _selectedPriority == 'ALL' || priorityStr == _selectedPriority;

      final matchesMyTasks = !_filterMyTasksOnly || (currentUserId != null && t.assignedToId == currentUserId);

      return matchesSearch && matchesStatus && matchesPriority && matchesMyTasks;
    }).toList();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<TaskProvider>().fetchTasks();
          await context.read<ProjectProvider>().fetchProjects();
          await context.read<WbsProvider>().fetchPhases();
        },
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Task Management & Labor Allocation', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      const Text(
                        'Struktur tugas WBS, alokasi jam kerja (Est vs Actual), status, dan kalkulasi beban biaya labor',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                if (canManageTasks) ...[
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _showAddTaskModal,
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Create New Task'),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),

            // My Tasks Toggle Filter
            Row(
              children: [
                FilterChip(
                  label: const Text('Semua Task'),
                  selected: !_filterMyTasksOnly,
                  onSelected: (selected) {
                    if (selected) setState(() => _filterMyTasksOnly = false);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: Text('My Tasks (${user?.name ?? 'Saya'})'),
                  selected: _filterMyTasksOnly,
                  onSelected: (selected) {
                    if (selected) setState(() => _filterMyTasksOnly = true);
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Filters & Search Controls
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
                              hintText: 'Cari task (nama, pelaksana, phase)...',
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
                      value: _selectedStatus,
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                      items: const [
                        DropdownMenuItem(value: 'ALL', child: Text('Semua Status')),
                        DropdownMenuItem(value: 'TODO', child: Text('Todo')),
                        DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                        DropdownMenuItem(value: 'REVIEW', child: Text('Review')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedStatus = val);
                      },
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
                      value: _selectedPriority,
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                      items: const [
                        DropdownMenuItem(value: 'ALL', child: Text('Semua Prioritas')),
                        DropdownMenuItem(value: 'LOW', child: Text('Low')),
                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                        DropdownMenuItem(value: 'HIGH', child: Text('High')),
                        DropdownMenuItem(value: 'URGENT', child: Text('Urgent')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedPriority = val);
                      },
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            else if (filteredTasks.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Tidak ada task yang ditemukan.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredTasks.map((t) {
                final titleStr = t.title;
                final phaseStr = t.phaseName ?? 'WBS Phase';
                final projectStr = t.projectName;
                final assigneeStr = t.assigneeName ?? 'Belum Ditugaskan';
                final priorityStr = t.priority;
                final statusStr = t.status;
                final estHours = t.estHours;
                final actHours = t.loggedHours;
                final progress = t.progressPct;

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
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: _priorityColor(priorityStr).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    priorityStr.toUpperCase(),
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _priorityColor(priorityStr)),
                                  ),
                                ),
                                if (projectStr != null) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      projectStr,
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            Row(
                              children: [
                                PopupMenuButton<String>(
                                  offset: const Offset(0, 30),
                                  onSelected: (val) => _updateStatus(t, val),
                                  itemBuilder: (context) => const [
                                    PopupMenuItem(value: 'TODO', child: Text('Set to TODO')),
                                    PopupMenuItem(value: 'IN_PROGRESS', child: Text('Set to IN_PROGRESS')),
                                    PopupMenuItem(value: 'REVIEW', child: Text('Set to REVIEW')),
                                    PopupMenuItem(value: 'COMPLETED', child: Text('Set to COMPLETED')),
                                  ],
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: _statusColor(statusStr).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          statusStr.toUpperCase(),
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(statusStr)),
                                        ),
                                        const Icon(Icons.arrow_drop_down, size: 14),
                                      ],
                                    ),
                                  ),
                                ),
                                if (canManageTasks) ...[
                                  const SizedBox(width: 6),
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                                    icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                    onPressed: () => _showEditTaskModal(t),
                                    tooltip: 'Edit Task',
                                  ),
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                    onPressed: () => _confirmDeleteTask(t),
                                    tooltip: 'Hapus Task',
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(titleStr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                        const SizedBox(height: 2),
                        Text('Phase: $phaseStr', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.person_outline, size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(assigneeStr, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            if (t.dueDate != null)
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
                                    const Icon(Icons.event_available, size: 12, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Tenggat: ${Formatters.formatDate(t.dueDate!.toIso8601String())}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                    ),
                                  ],
                                ),
                              ),
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
                                    '${actHours}h / ${estHours}h jam kerja',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.info),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Progres Fisik', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                      Text('$progress%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: progress / 100.0,
                                      minHeight: 6,
                                      backgroundColor: AppColors.borderSubtle,
                                      valueColor: AlwaysStoppedAnimation<Color>(progress == 100 ? AppColors.success : AppColors.primary),
                                    ),
                                  ),
                                ],
                              ),
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

  static Color _priorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT':
      case 'HIGH':
        return AppColors.danger;
      case 'MEDIUM':
        return AppColors.warning;
      case 'LOW':
        return AppColors.success;
      default:
        return AppColors.textMuted;
    }
  }

  static Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return AppColors.success;
      case 'IN_PROGRESS':
        return AppColors.info;
      case 'REVIEW':
        return AppColors.warning;
      default:
        return AppColors.textMuted;
    }
  }
}

class _TaskFormModal extends StatefulWidget {
  final TaskModel? task;

  const _TaskFormModal({
    this.task,
  });

  @override
  State<_TaskFormModal> createState() => _TaskFormModalState();
}

class _TaskFormModalState extends State<_TaskFormModal> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _estHoursController = TextEditingController(text: '40');
  final _progressController = TextEditingController(text: '0');

  String? _selectedProjectId;
  String? _selectedPhaseId;
  String? _selectedAssigneeId;
  String _priority = 'MEDIUM';
  String _status = 'TODO';
  DateTime _startDate = DateTime.now();
  DateTime _dueDate = DateTime.now().add(const Duration(days: 14));
  bool _isSubmitting = false;

  List<dynamic> _users = [];

  @override
  void initState() {
    super.initState();
    _fetchUsers();

    final projects = context.read<ProjectProvider>().projects;
    final phases = context.read<WbsProvider>().phases;

    if (widget.task != null) {
      final t = widget.task!;
      _titleController.text = t.title;
      _descController.text = t.description ?? '';
      _estHoursController.text = t.estHours.toStringAsFixed(0);
      _progressController.text = t.progressPct.toString();
      _selectedProjectId = t.projectId.isNotEmpty ? t.projectId : null;
      _selectedPhaseId = t.phaseId.isNotEmpty ? t.phaseId : null;
      _selectedAssigneeId = t.assignedToId;
      _priority = t.priority;
      _status = t.status;
      _startDate = t.startDate ?? DateTime.now();
      _dueDate = t.dueDate ?? DateTime.now().add(const Duration(days: 14));
    } else {
      _selectedProjectId = projects.isNotEmpty ? projects.first.id : null;
    }

    if (_selectedProjectId != null && _selectedPhaseId == null) {
      final matchedPhases = phases.where((p) => p.projectId == _selectedProjectId).toList();
      if (matchedPhases.isNotEmpty) {
        _selectedPhaseId = matchedPhases.first.id;
      }
    }
  }

  Future<void> _fetchUsers() async {
    try {
      final res = await ApiService.get('/auth/users');
      if (res is List) {
        if (mounted) setState(() => _users = res);
      }
    } catch (_) {
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _estHoursController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  void _selectDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _dueDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_dueDate.isBefore(_startDate)) {
            _dueDate = _startDate.add(const Duration(days: 7));
          }
        } else {
          _dueDate = picked;
        }
      });
    }
  }

  void _submit() async {
    final title = _titleController.text.trim();
    final estHours = double.tryParse(_estHoursController.text.trim()) ?? 0;
    final progress = int.tryParse(_progressController.text.trim()) ?? 0;

    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Judul / Nama Task wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (_selectedProjectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Project wajib dipilih.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (estHours < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Estimasi jam kerja tidak boleh negatif.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (progress < 0 || progress > 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Progress harus antara 0 - 100%.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (_dueDate.isBefore(_startDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Due Date tidak boleh sebelum Start Date.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'title': title,
      'description': _descController.text.trim(),
      'projectId': _selectedProjectId,
      'phaseId': _selectedPhaseId,
      'assignedToId': _selectedAssigneeId,
      'priority': _priority,
      'status': _status,
      'estimatedHours': estHours,
      'progressPercentage': _status == 'COMPLETED' ? 100 : progress,
      'startDate': _startDate.toIso8601String(),
      'dueDate': _dueDate.toIso8601String(),
    };

    bool success;
    if (widget.task == null) {
      success = await context.read<TaskProvider>().createTask(payload);
    } else {
      success = await context.read<TaskProvider>().updateTask(widget.task!.id, payload, projectId: _selectedProjectId);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.task == null ? 'Task baru berhasil dibuat!' : 'Task berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<TaskProvider>().error ?? 'Gagal menyimpan task.';
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

    final availablePhases = _selectedProjectId == null
        ? allPhases
        : allPhases.where((p) => p.projectId == _selectedProjectId).toList();

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
                  widget.task == null ? 'Tambah Task Pekerjaan Baru' : 'Edit Task Pekerjaan',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Judul / Nama Task *'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedProjectId,
                    decoration: const InputDecoration(labelText: 'Project *'),
                    items: projects.isEmpty
                        ? [const DropdownMenuItem<String>(value: null, child: Text('Tidak ada project'))]
                        : projects.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedProjectId = val;
                        _selectedPhaseId = null;
                        final filteredPhases = allPhases.where((p) => p.projectId == val).toList();
                        if (filteredPhases.isNotEmpty) {
                          _selectedPhaseId = filteredPhases.first.id;
                        }
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedPhaseId,
                    decoration: const InputDecoration(labelText: 'WBS / Phase'),
                    items: _selectedProjectId == null
                        ? [const DropdownMenuItem<String>(value: null, child: Text('Select Project first'))]
                        : (availablePhases.isEmpty
                            ? [const DropdownMenuItem<String>(value: null, child: Text('No WBS available for this project'))]
                            : availablePhases.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList()),
                    onChanged: (val) => setState(() => _selectedPhaseId = val),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _selectedAssigneeId,
              decoration: const InputDecoration(labelText: 'Assignee / Pelaksana'),
              items: [
                const DropdownMenuItem<String>(value: null, child: Text('-- Belum Ditugaskan --')),
                ..._users.map((u) => DropdownMenuItem(value: u['id'].toString(), child: Text('${u['name']} (${u['role']})'))),
              ],
              onChanged: (val) => setState(() => _selectedAssigneeId = val),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _estHoursController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Estimasi Jam (Hours)'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _progressController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Progress Fisik (%)'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _priority,
                    decoration: const InputDecoration(labelText: 'Prioritas'),
                    items: const [
                      DropdownMenuItem(value: 'LOW', child: Text('Low')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                      DropdownMenuItem(value: 'HIGH', child: Text('High')),
                      DropdownMenuItem(value: 'URGENT', child: Text('Urgent')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _priority = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _status,
                    decoration: const InputDecoration(labelText: 'Status Task'),
                    items: const [
                      DropdownMenuItem(value: 'TODO', child: Text('Todo')),
                      DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                      DropdownMenuItem(value: 'REVIEW', child: Text('Review')),
                      DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _status = val;
                          if (val == 'COMPLETED') _progressController.text = '100';
                        });
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(true),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Start Date'),
                      child: Text('${_startDate.day}/${_startDate.month}/${_startDate.year}'),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(false),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Due Date'),
                      child: Text('${_dueDate.day}/${_dueDate.month}/${_dueDate.year}'),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              decoration: const InputDecoration(labelText: 'Deskripsi / Detail Pekerjaan'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.task == null ? 'Simpan Task Baru' : 'Simpan Perubahan Task', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
