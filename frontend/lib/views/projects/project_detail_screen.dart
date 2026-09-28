import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/project.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/timesheet_provider.dart';
import '../../providers/milestone_provider.dart';
import '../../providers/invoice_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';
import '../widgets/progress_burn_bar.dart';

class ProjectDetailScreen extends StatefulWidget {
  final String projectId;
  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 8, vsync: this);
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjectById(widget.projectId);
      context.read<WbsProvider>().fetchPhases(projectId: widget.projectId);
      context.read<TaskProvider>().fetchTasks(projectId: widget.projectId);
      context.read<TimesheetProvider>().fetchTimesheets(projectId: widget.projectId);
      context.read<MilestoneProvider>().fetchMilestones(projectId: widget.projectId);
      context.read<InvoiceProvider>().fetchInvoices(projectId: widget.projectId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showEditProjectModal(ProjectModel project) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _EditProjectForm(project: project),
    );
  }

  void _showAddPhaseModal(String projectId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _PhaseFormModal(projectId: projectId),
    );
  }

  void _showEditPhaseModal(PhaseModel phase) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _PhaseFormModal(projectId: phase.projectId, phase: phase),
    );
  }

  void _confirmDeletePhase(PhaseModel phase) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus WBS Phase'),
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
                  context.read<ProjectProvider>().fetchProjectById(widget.projectId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('WBS Phase berhasil dihapus!'), backgroundColor: AppColors.success),
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

  void _showAddTaskModal(String projectId, {String? phaseId}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _DetailTaskFormModal(projectId: projectId, initialPhaseId: phaseId),
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
      builder: (context) => _DetailTaskFormModal(projectId: task.projectId, task: task),
    );
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
              final success = await context.read<TaskProvider>().deleteTask(task.id, projectId: widget.projectId);
              if (mounted) {
                if (success) {
                  context.read<ProjectProvider>().fetchProjectById(widget.projectId);
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
    final projProvider = context.watch<ProjectProvider>();
    final project = projProvider.selectedProject;
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';
    final isClient = role == 'CLIENT';
    final canEdit = role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER';

    final wbsProvider = context.watch<WbsProvider>();
    final taskProvider = context.watch<TaskProvider>();

    if (projProvider.isLoading || project == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detail Proyek')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    bool isCostHigherThanProgress = !isClient && (project.burnPct > project.progressPct);
    final phasesList = wbsProvider.phases.isNotEmpty ? wbsProvider.phases : project.phases;
    final projectTasks = taskProvider.tasks;

    return Scaffold(
      appBar: AppBar(
        title: Text(project.name),
        backgroundColor: AppColors.card,
        elevation: 0,
        actions: [
          if (canEdit) ...[
            OutlinedButton.icon(
              onPressed: () => _showEditProjectModal(project),
              icon: const Icon(Icons.edit, size: 14),
              label: const Text('Edit Project'),
            ),
            const SizedBox(width: 16),
          ],
        ],
      ),
      body: Column(
        children: [
          // Project Header & KPI Bar
          Container(
            padding: const EdgeInsets.all(20),
            color: AppColors.card,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Wrap(
                      spacing: 10,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(6)),
                          child: Text(project.code, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 12)),
                        ),
                        Text('Client: ${project.clientName}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                        if (project.startDate != null && project.endDate != null)
                          Text(
                            'Period: ${project.startDate!.day}/${project.startDate!.month}/${project.startDate!.year} - ${project.endDate!.day}/${project.endDate!.month}/${project.endDate!.year}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(20)),
                      child: Text(project.status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Financial & Progress KPIs Row / Grid
                LayoutBuilder(
                  builder: (context, constraints) {
                    if (isClient) {
                      return Row(
                        children: [
                          _kpiPill('Progres Fisik Proyek', '${project.progressPct}%', AppColors.primary),
                        ],
                      );
                    }

                    if (constraints.maxWidth < 700) {
                      return GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 2.2,
                        children: [
                          _kpiBox('Progress', '${project.progressPct}%', AppColors.primary),
                          _kpiBox('Total Budget', Formatters.compactRupiah(project.budgetTotal), AppColors.textPrimary),
                          _kpiBox('Actual Cost', Formatters.compactRupiah(project.actualTotalCost), AppColors.warning),
                          _kpiBox('Remaining', Formatters.compactRupiah(project.remainingBudget), project.remainingBudget < 0 ? AppColors.danger : AppColors.success),
                          _kpiBox('Consumption', '${project.burnPct}%', isCostHigherThanProgress ? AppColors.danger : AppColors.info),
                        ],
                      );
                    }
                    return Row(
                      children: [
                        _kpiPill('Progress', '${project.progressPct}%', AppColors.primary),
                        _kpiPill('Total Budget', Formatters.compactRupiah(project.budgetTotal), AppColors.textPrimary),
                        _kpiPill('Actual Cost', Formatters.compactRupiah(project.actualTotalCost), AppColors.warning),
                        _kpiPill('Remaining Budget', Formatters.compactRupiah(project.remainingBudget), project.remainingBudget < 0 ? AppColors.danger : AppColors.success),
                        _kpiPill('Cost Consumption', '${project.burnPct}%', isCostHigherThanProgress ? AppColors.danger : AppColors.info),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),

                // Warning Banner if Cost Consumption > Progress %
                if (isCostHigherThanProgress) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.dangerBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Penyerapan biaya (Cost consumption) lebih tinggi dari persentase progres fisik pekerjaan.',
                            style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Tabs Header
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  tabs: [
                    const Tab(text: 'Overview'),
                    const Tab(text: 'WBS'),
                    const Tab(text: 'Tasks'),
                    if (!isClient) const Tab(text: 'Budget'),
                    if (!isClient) const Tab(text: 'Timesheets'),
                    if (!isClient) const Tab(text: 'Expenses'),
                    const Tab(text: 'Milestones'),
                    const Tab(text: 'Invoices'),
                  ],
                ),
              ],
            ),
          ),

          // Tab Body Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // 1. Overview Tab
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    ProgressBurnBar(progressPct: project.progressPct, burnPct: project.burnPct, isOverburn: project.isOverburn),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Project Scope & Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 8),
                          Text(project.description ?? 'Pengembangan sistem terintegrasi.', style: const TextStyle(color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),

                // 2. WBS Tab
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Struktur WBS / Phase (${phasesList.length} Phase)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        if (canEdit)
                          ElevatedButton.icon(
                            onPressed: () => _showAddPhaseModal(project.id),
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Add Phase / WBS'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (phasesList.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(30),
                        child: Center(child: Text('Belum ada fase WBS terdaftar.', style: TextStyle(color: AppColors.textMuted))),
                      )
                    else
                      ...phasesList.map((p) {
                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                                          if (p.description != null && p.description!.isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(p.description!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(6)),
                                          child: Text(p.status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                        ),
                                        if (canEdit) ...[
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                            onPressed: () => _showEditPhaseModal(p),
                                            tooltip: 'Edit Phase',
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                            onPressed: () => _confirmDeletePhase(p),
                                            tooltip: 'Hapus Phase',
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 16,
                                  runSpacing: 8,
                                  children: [
                                    if (!isClient) Text('Budget: ${Formatters.rupiah(p.budgetTotal)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                                    Text('Progres: ${p.progressPct}%', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                    Text('Jumlah Tasks: ${p.taskCount}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: p.progressPct / 100.0,
                                    minHeight: 6,
                                    backgroundColor: AppColors.borderSubtle,
                                    valueColor: AlwaysStoppedAnimation<Color>(p.progressPct == 100 ? AppColors.success : AppColors.primary),
                                  ),
                                ),
                                if (canEdit) ...[
                                  const SizedBox(height: 12),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton.icon(
                                      onPressed: () => _showAddTaskModal(project.id, phaseId: p.id),
                                      icon: const Icon(Icons.add_task, size: 14),
                                      label: const Text('Tambah Task ke Phase Ini', style: TextStyle(fontSize: 12)),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }),
                  ],
                ),

                // 3. Tasks Tab
                ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Daftar Tugas Proyek (${projectTasks.length} Task)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        if (canEdit)
                          ElevatedButton.icon(
                            onPressed: () => _showAddTaskModal(project.id),
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Add Task'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (projectTasks.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(30),
                        child: Center(child: Text('Belum ada tugas untuk proyek ini.', style: TextStyle(color: AppColors.textMuted))),
                      )
                    else
                      ...projectTasks.map((t) {
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
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: _priorityColor(t.priority).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        t.priority.toUpperCase(),
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _priorityColor(t.priority)),
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _statusColor(t.status).withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            t.status.toUpperCase(),
                                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(t.status)),
                                          ),
                                        ),
                                        if (canEdit) ...[
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                                            onPressed: () => _showEditTaskModal(t),
                                            tooltip: 'Edit Task',
                                          ),
                                          IconButton(
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
                                Text(t.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                                if (t.phaseName != null) ...[
                                  const SizedBox(height: 2),
                                  Text('Phase: ${t.phaseName}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                ],
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.person_outline, size: 14, color: AppColors.textSecondary),
                                    const SizedBox(width: 4),
                                    Text(t.assigneeName ?? 'Belum Ditugaskan', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text('Jam Kerja: ${t.loggedHours}h / ${t.estHours}h', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                              Text('${t.progressPct}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                          const SizedBox(height: 3),
                                          ClipRRect(
                                            borderRadius: BorderRadius.circular(4),
                                            child: LinearProgressIndicator(
                                              value: t.progressPct / 100.0,
                                              minHeight: 6,
                                              backgroundColor: AppColors.borderSubtle,
                                              valueColor: AlwaysStoppedAnimation<Color>(t.progressPct == 100 ? AppColors.success : AppColors.primary),
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

                // 4. Budget Tab
                if (!isClient)
                  ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Text('Hirarki Anggaran RAB ${project.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('Total Baseline RAB: ${Formatters.rupiah(project.budgetTotal)}'),
                        ),
                      ),
                    ],
                  ),

                // 5. Timesheets Tab
                if (!isClient)
                  Builder(
                    builder: (context) {
                      final projectTimesheets = context.watch<TimesheetProvider>().timesheets;
                      final totalLaborCost = projectTimesheets.fold<double>(0, (sum, ts) => sum + (ts.laborCost ?? 0));
                      final totalHours = projectTimesheets.fold<double>(0, (sum, ts) => sum + ts.hours);

                      return ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Catatan Jam Kerja Proyek ${project.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                  const SizedBox(height: 2),
                                  Text('Total Jam: ${totalHours}h • Total Labor Cost: ${Formatters.rupiah(totalLaborCost)}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                ],
                              ),
                              ElevatedButton.icon(
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: AppColors.card,
                                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
                                    builder: (context) => _DetailTimesheetFormModal(projectId: project.id),
                                  );
                                },
                                icon: const Icon(Icons.add_alarm, size: 16),
                                label: const Text('Input Jam Kerja'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (projectTimesheets.isEmpty)
                            const Padding(
                              padding: EdgeInsets.all(30),
                              child: Center(child: Text('Belum ada catatan jam kerja (timesheet) untuk proyek ini.', style: TextStyle(color: AppColors.textMuted))),
                            )
                          else
                            ...projectTimesheets.map((ts) {
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
                                          Text(ts.taskTitle ?? 'Task Pekerjaan', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                                          Text(
                                            ts.laborCost != null ? Formatters.compactRupiah(ts.laborCost!) : 'Rp -',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.success),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text('Oleh: ${ts.userName} • Tgl: ${Formatters.formatDate(ts.date.toIso8601String())} • Durasi: ${ts.hours} Jam', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                      if (ts.description != null && ts.description!.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Text(ts.description!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            }),
                        ],
                      );
                    },
                  ),

                // 6. Expenses Tab
                if (!isClient)
                  ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Text('Pengeluaran Langsung Proyek ${project.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('Realisasi Biaya Terpakai: ${Formatters.rupiah(project.actualTotalCost)}'),
                        ),
                      ),
                    ],
                  ),

                // 7. Milestones Tab
                Builder(
                  builder: (context) {
                    final projectMilestones = context.watch<MilestoneProvider>().milestones
                        .where((m) => m.projectId == project.id).toList();

                    return ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Text('Milestone & Termin Proyek ${project.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 12),
                        if (projectMilestones.isEmpty)
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(20),
                              child: Center(child: Text('Belum ada milestone terdaftar untuk proyek ini.', style: TextStyle(color: AppColors.textMuted))),
                            ),
                          )
                        else
                          ...projectMilestones.map((m) => Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(m.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: AppColors.primaryLight,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(m.status, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text('Target Progress: ${m.progressRequirement.toStringAsFixed(0)}% • Tenggat: ${Formatters.formatDate(m.dueDate.toIso8601String())}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                      const SizedBox(height: 6),
                                      Text('Nilai Termin: ${Formatters.rupiah(m.amount)} (${m.billingType})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                    ],
                                  ),
                                ),
                              )),
                      ],
                    );
                  },
                ),

                // 8. Invoices Tab
                Builder(
                  builder: (context) {
                    final projInvoices = context.watch<InvoiceProvider>().invoices
                        .where((inv) => inv.projectId == project.id).toList();

                    final contractVal = project.budgetTotal;
                    final totalInvoiced = projInvoices.fold<double>(0, (sum, inv) => sum + inv.totalAmount);
                    final totalPaid = projInvoices.fold<double>(0, (sum, inv) => sum + inv.paidAmount);
                    final outstanding = (totalInvoiced - totalPaid) > 0 ? (totalInvoiced - totalPaid) : 0.0;
                    final projectCost = project.actualTotalCost;
                    final cashIn = totalPaid;
                    final cashOut = projectCost;
                    final netCashFlow = cashIn - cashOut;

                    return ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Text('Project Billing & Cash Flow Overview', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 12),

                        // Project Financial & Cash Flow Overview Box (Requirement #21)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Billing & Project Cash Flow', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(child: _kpiBox('Contract Value', Formatters.compactRupiah(contractVal), AppColors.textPrimary)),
                                  const SizedBox(width: 8),
                                  Expanded(child: _kpiBox('Invoiced', Formatters.compactRupiah(totalInvoiced), AppColors.info)),
                                  const SizedBox(width: 8),
                                  Expanded(child: _kpiBox('Paid', Formatters.compactRupiah(totalPaid), AppColors.success)),
                                  const SizedBox(width: 8),
                                  Expanded(child: _kpiBox('Outstanding', Formatters.compactRupiah(outstanding), outstanding > 0 ? AppColors.warning : AppColors.success)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              if (!isClient) ...[
                                Row(
                                  children: [
                                    Expanded(child: _kpiBox('Project Cost (Actual)', Formatters.compactRupiah(projectCost), AppColors.warning)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _kpiBox('Cash In', Formatters.compactRupiah(cashIn), AppColors.success)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _kpiBox('Cash Out', Formatters.compactRupiah(cashOut), AppColors.danger)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _kpiBox('Net Cash Flow', Formatters.compactRupiah(netCashFlow), netCashFlow >= 0 ? AppColors.primary : AppColors.danger)),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        Text('Daftar Invoice Proyek (${projInvoices.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 10),

                        if (projInvoices.isEmpty)
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(20),
                              child: Center(child: Text('Belum ada invoice diterbitkan untuk proyek ini.', style: TextStyle(color: AppColors.textMuted))),
                            ),
                          )
                        else
                          ...projInvoices.map((inv) => Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(inv.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                          Text('Tenggat: ${Formatters.formatDate(inv.dueDate.toIso8601String())}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(Formatters.rupiah(inv.totalAmount), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary)),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: (inv.status == 'PAID' ? AppColors.success : AppColors.warning).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(inv.status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: inv.status == 'PAID' ? AppColors.success : AppColors.warning)),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              )),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
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

  static Widget _kpiPill(String label, String value, Color color) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  static Widget _kpiBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _PhaseFormModal extends StatefulWidget {
  final String projectId;
  final PhaseModel? phase;

  const _PhaseFormModal({required this.projectId, this.phase});

  @override
  State<_PhaseFormModal> createState() => _PhaseFormModalState();
}

class _PhaseFormModalState extends State<_PhaseFormModal> {
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _budgetController = TextEditingController(text: '0');
  String _status = 'IN_PROGRESS';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.phase != null) {
      _nameController.text = widget.phase!.name;
      _descController.text = widget.phase!.description ?? '';
      _budgetController.text = widget.phase!.budgetTotal.toStringAsFixed(0);
      _status = widget.phase!.status;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _submit() async {
    final name = _nameController.text.trim();
    final budget = double.tryParse(_budgetController.text.trim()) ?? 0;

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama WBS / Phase wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (budget < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Budget Phase tidak boleh negatif.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'projectId': widget.projectId,
      'name': name,
      'description': _descController.text.trim(),
      'budgetAmount': budget,
      'status': _status,
    };

    bool success;
    if (widget.phase == null) {
      success = await context.read<WbsProvider>().createPhase(payload);
    } else {
      success = await context.read<WbsProvider>().updatePhase(widget.phase!.id, payload, projectId: widget.projectId);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        context.read<ProjectProvider>().fetchProjectById(widget.projectId);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.phase == null ? 'Phase WBS baru berhasil dibuat!' : 'Phase WBS berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<WbsProvider>().error ?? 'Gagal menyimpan phase.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  widget.phase == null ? 'Tambah WBS Phase Baru' : 'Edit WBS Phase',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nama Phase / WBS *'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _budgetController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Pagu Budget Phase (Rp)'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Status Phase'),
              items: const [
                DropdownMenuItem(value: 'PLANNING', child: Text('Planning')),
                DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _status = val);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              decoration: const InputDecoration(labelText: 'Deskripsi / Detail Phase'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.phase == null ? 'Simpan Phase' : 'Simpan Perubahan Phase', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailTaskFormModal extends StatefulWidget {
  final String projectId;
  final String? initialPhaseId;
  final TaskModel? task;

  const _DetailTaskFormModal({
    required this.projectId,
    this.initialPhaseId,
    this.task,
  });

  @override
  State<_DetailTaskFormModal> createState() => _DetailTaskFormModalState();
}

class _DetailTaskFormModalState extends State<_DetailTaskFormModal> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _estHoursController = TextEditingController(text: '40');
  final _progressController = TextEditingController(text: '0');

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

    final phases = context.read<WbsProvider>().phases;

    if (widget.task != null) {
      final t = widget.task!;
      _titleController.text = t.title;
      _descController.text = t.description ?? '';
      _estHoursController.text = t.estHours.toStringAsFixed(0);
      _progressController.text = t.progressPct.toString();
      _selectedPhaseId = t.phaseId.isNotEmpty ? t.phaseId : null;
      _selectedAssigneeId = t.assignedToId;
      _priority = t.priority;
      _status = t.status;
      _startDate = t.startDate ?? DateTime.now();
      _dueDate = t.dueDate ?? DateTime.now().add(const Duration(days: 14));
    } else {
      _selectedPhaseId = widget.initialPhaseId;
      if (_selectedPhaseId == null && phases.isNotEmpty) {
        _selectedPhaseId = phases.first.id;
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
      'projectId': widget.projectId,
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
      success = await context.read<TaskProvider>().updateTask(widget.task!.id, payload, projectId: widget.projectId);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        context.read<ProjectProvider>().fetchProjectById(widget.projectId);
        context.read<WbsProvider>().fetchPhases(projectId: widget.projectId);
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
    final phases = context.watch<WbsProvider>().phases;

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
                  widget.task == null ? 'Tambah Task Baru' : 'Edit Task Pekerjaan',
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
            DropdownButtonFormField<String>(
              value: _selectedPhaseId,
              decoration: const InputDecoration(labelText: 'WBS / Phase *'),
              items: phases.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
              onChanged: (val) => setState(() => _selectedPhaseId = val),
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

class _EditProjectForm extends StatefulWidget {
  final ProjectModel project;
  const _EditProjectForm({required this.project});

  @override
  State<_EditProjectForm> createState() => _EditProjectFormState();
}

class _EditProjectFormState extends State<_EditProjectForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _codeController;
  late TextEditingController _nameController;
  late TextEditingController _clientController;
  late TextEditingController _budgetController;
  late TextEditingController _progressController;
  late TextEditingController _descController;
  late DateTime _startDate;
  late DateTime _endDate;
  late String _status;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.project.code);
    _nameController = TextEditingController(text: widget.project.name);
    _clientController = TextEditingController(text: widget.project.clientName);
    _budgetController = TextEditingController(text: widget.project.budgetTotal.toStringAsFixed(0));
    _progressController = TextEditingController(text: widget.project.progressPct.toString());
    _descController = TextEditingController(text: widget.project.description ?? '');
    _startDate = widget.project.startDate ?? DateTime.now();
    _endDate = widget.project.endDate ?? DateTime.now().add(const Duration(days: 90));
    _status = widget.project.status;
  }

  @override
  void dispose() {
    _codeController.dispose();
    _nameController.dispose();
    _clientController.dispose();
    _budgetController.dispose();
    _progressController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _selectDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate.isBefore(_startDate)) {
            _endDate = _startDate.add(const Duration(days: 30));
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _submit() async {
    final code = _codeController.text.trim();
    final name = _nameController.text.trim();
    final clientName = _clientController.text.trim();
    final budgetStr = _budgetController.text.trim();
    final progressStr = _progressController.text.trim();
    final budget = double.tryParse(budgetStr);
    final progress = double.tryParse(progressStr);

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Project name is required.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Project code is required.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (clientName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Client is required.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (budget == null || budget < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contract Value / Budget cannot be negative.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (progress == null || progress < 0 || progress > 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Progress must be between 0 and 100%.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_endDate.isBefore(_startDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End date cannot be before start date.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final success = await context.read<ProjectProvider>().updateProject(widget.project.id, {
      'projectCode': code,
      'code': code,
      'name': name,
      'clientName': clientName,
      'contractValue': budget,
      'progressPercentage': progress,
      'description': _descController.text.trim(),
      'status': _status,
      'startDate': _startDate.toIso8601String(),
      'endDate': _endDate.toIso8601String(),
    });

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Detail proyek berhasil diperbarui!'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<ProjectProvider>().error ?? 'Gagal memperbarui proyek.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err.contains('DUPLICATE') ? 'Project code already exists.' : err),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Edit Detail Proyek', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _codeController,
                decoration: const InputDecoration(labelText: 'Kode Proyek *'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nama Proyek *'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _clientController,
                decoration: const InputDecoration(labelText: 'Klien / Perusahaan *'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _budgetController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Contract Value / Budget (Rp) *'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _progressController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Progress Physical (%) *', hintText: '0 - 100'),
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
                        decoration: const InputDecoration(labelText: 'End Date'),
                        child: Text('${_endDate.day}/${_endDate.month}/${_endDate.year}'),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Deskripsi Scope Proyek'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(labelText: 'Status Proyek'),
                items: const [
                  DropdownMenuItem(value: 'IN_PROGRESS', child: Text('Sedang Berjalan (In Progress)')),
                  DropdownMenuItem(value: 'ON_HOLD', child: Text('Ditunda (On Hold)')),
                  DropdownMenuItem(value: 'COMPLETED', child: Text('Selesai (Completed)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _status = val);
                },
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Simpan Perubahan', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailTimesheetFormModal extends StatefulWidget {
  final String projectId;
  const _DetailTimesheetFormModal({required this.projectId});

  @override
  State<_DetailTimesheetFormModal> createState() => _DetailTimesheetFormModalState();
}

class _DetailTimesheetFormModalState extends State<_DetailTimesheetFormModal> {
  final _hoursController = TextEditingController(text: '8');
  final _descController = TextEditingController();

  String? _selectedPhaseId;
  String? _selectedTaskId;
  DateTime _timesheetDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final phases = context.read<WbsProvider>().phases;
    final tasks = context.read<TaskProvider>().tasks;

    final matchedPhases = phases.where((p) => p.projectId == widget.projectId).toList();
    if (matchedPhases.isNotEmpty) {
      _selectedPhaseId = matchedPhases.first.id;
    }

    final matchedTasks = tasks.where((t) => _selectedPhaseId != null ? t.phaseId == _selectedPhaseId : t.projectId == widget.projectId).toList();
    if (matchedTasks.isNotEmpty) {
      _selectedTaskId = matchedTasks.first.id;
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
      'projectId': widget.projectId,
      'taskId': _selectedTaskId,
      'date': _timesheetDate.toIso8601String(),
      'hours': hours,
      'description': _descController.text.trim(),
    };

    final success = await context.read<TimesheetProvider>().createTimesheet(payload);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        context.read<TaskProvider>().fetchTasks(projectId: widget.projectId);
        context.read<ProjectProvider>().fetchProjectById(widget.projectId);
        context.read<TimesheetProvider>().fetchTimesheets(projectId: widget.projectId);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Timesheet berhasil ditambahkan!'), backgroundColor: AppColors.success),
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
    final allPhases = context.watch<WbsProvider>().phases;
    final allTasks = context.watch<TaskProvider>().tasks;

    final availablePhases = allPhases.where((p) => p.projectId == widget.projectId).toList();
    final availableTasks = _selectedPhaseId == null
        ? allTasks.where((t) => t.projectId == widget.projectId).toList()
        : allTasks.where((t) => t.phaseId == _selectedPhaseId).toList();

    double hours = double.tryParse(_hoursController.text) ?? 0;
    double userRate = user?.hourlyRate ?? 100000;
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
                const Text('Input Jam Kerja (Timesheet)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),

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
              items: availableTasks.map((t) => DropdownMenuItem(value: t.id, child: Text(t.title))).toList(),
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
                  : const Text('Simpan Timesheet', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
