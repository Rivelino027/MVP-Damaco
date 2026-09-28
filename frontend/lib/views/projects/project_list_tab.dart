import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/client_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';
import '../widgets/progress_burn_bar.dart';
import 'project_detail_screen.dart';

class ProjectListTab extends StatefulWidget {
  const ProjectListTab({super.key});

  @override
  State<ProjectListTab> createState() => _ProjectListTabState();
}

class _ProjectListTabState extends State<ProjectListTab> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<ClientProvider>().fetchClients();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddProjectModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _AddProjectForm(),
    );
  }

  void _confirmDeleteProject(String id, String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Proyek'),
        content: Text('Apakah Anda yakin ingin menghapus proyek "$name"? Data yang dihapus tidak dapat dikembalikan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<ProjectProvider>().deleteProject(id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Proyek berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(context.read<ProjectProvider>().error ?? 'Gagal menghapus proyek.'),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                }
              }
            },
            child: const Text('Hapus Proyek'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final projProvider = context.watch<ProjectProvider>();

    if (projProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final allProjects = projProvider.projects;
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';
    final canCreateProject = role == 'OWNER' || role == 'PM' || role == 'PROJECT_MANAGER';

    // Apply Search and Status Filtering
    final query = _searchController.text.toLowerCase().trim();
    final filteredProjects = allProjects.where((proj) {
      final matchesSearch = query.isEmpty ||
          proj.name.toLowerCase().contains(query) ||
          proj.code.toLowerCase().contains(query) ||
          proj.clientName.toLowerCase().contains(query);
      final matchesStatus = _selectedStatus == 'ALL' || proj.status == _selectedStatus;
      return matchesSearch && matchesStatus;
    }).toList();

    String title = 'Daftar Proyek & RAB';
    String subtitle = 'Kelola WBS, Anggaran Baseline, dan Realisasi Biaya';

    if (role == 'MEMBER') {
      title = 'Proyek & WBS Saya';
      subtitle = 'Daftar proyek dan struktur pekerjaan tempat Anda berpartisipasi';
    } else if (role == 'PM' || role == 'PROJECT_MANAGER') {
      title = 'Manajemen Proyek & WBS Baseline';
      subtitle = 'Kelola struktur WBS, alokasi tim, dan progres fisik pekerjaan';
    } else if (role == 'FINANCE') {
      title = 'Ringkasan Anggaran & Biaya Proyek';
      subtitle = 'Pusat monitoring baseline RAB dan realisasi penyerapan biaya';
    } else if (role == 'OWNER') {
      title = 'Portofolio Proyek & WBS Baseline';
      subtitle = 'Pusat monitoring seluruh portofolio proyek dan baseline anggaran';
    }

    return RefreshIndicator(
      onRefresh: () => projProvider.fetchProjects(),
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
              if (canCreateProject) ...[
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _showAddProjectModal,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Tambah Proyek'),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Dynamic Metrics KPI Cards Row
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 650) {
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.8,
                  children: [
                    _kpiCard('Total Projects', '${projProvider.totalProjects}', Icons.folder_open_outlined, AppColors.primary),
                    _kpiCard('Active Projects', '${projProvider.activeProjects}', Icons.play_circle_outline, AppColors.info),
                    _kpiCard('Completed', '${projProvider.completedProjects}', Icons.check_circle_outline, AppColors.success),
                    _kpiCard('Total Value', Formatters.compactRupiah(projProvider.totalProjectValue), Icons.account_balance_outlined, AppColors.warning),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(child: _kpiCard('Total Projects', '${projProvider.totalProjects}', Icons.folder_open_outlined, AppColors.primary)),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Active Projects', '${projProvider.activeProjects}', Icons.play_circle_outline, AppColors.info)),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Completed Projects', '${projProvider.completedProjects}', Icons.check_circle_outline, AppColors.success)),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Total Project Value', Formatters.compactRupiah(projProvider.totalProjectValue), Icons.account_balance_outlined, AppColors.warning)),
                ],
              );
            },
          ),
          const SizedBox(height: 16),

          // Search & Filter Controls Bar
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
                            hintText: 'Cari proyek (nama, kode, atau klien)...',
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
              const SizedBox(width: 12),
              Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedStatus,
                    style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                    items: const [
                      DropdownMenuItem(value: 'ALL', child: Text('Semua Status')),
                      DropdownMenuItem(value: 'IN_PROGRESS', child: Text('Sedang Berjalan')),
                      DropdownMenuItem(value: 'COMPLETED', child: Text('Selesai')),
                      DropdownMenuItem(value: 'ON_HOLD', child: Text('Ditunda')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedStatus = val);
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          if (filteredProjects.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Text('Tidak ada proyek yang sesuai dengan pencarian.', style: TextStyle(color: AppColors.textMuted)),
              ),
            ),

          ...filteredProjects.map((proj) => Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ProjectDetailScreen(projectId: proj.id),
                      ),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                proj.code,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _statusColor(proj.status).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    proj.status,
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _statusColor(proj.status)),
                                  ),
                                ),
                                if (canCreateProject) ...[
                                  const SizedBox(width: 8),
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                    icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 18),
                                    onPressed: () => _confirmDeleteProject(proj.id, proj.name),
                                    tooltip: 'Hapus Proyek',
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          proj.name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        if (proj.description != null && proj.description!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            proj.description!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                        const SizedBox(height: 14),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 12,
                          runSpacing: 6,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.business_outlined, size: 14, color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(proj.clientName, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('RAB Total: ', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                Text(
                                  Formatters.compactRupiah(proj.budgetTotal),
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.info),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        ProgressBurnBar(
                          progressPct: proj.progressPct,
                          burnPct: proj.burnPct,
                          isOverburn: proj.isOverburn,
                        ),
                      ],
                    ),
                  ),
                ),
              )),
        ],
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

  Color _statusColor(String status) {
    switch (status) {
      case 'IN_PROGRESS':
        return AppColors.info;
      case 'COMPLETED':
        return AppColors.success;
      case 'ON_HOLD':
        return AppColors.warning;
      default:
        return AppColors.textMuted;
    }
  }
}

class _AddProjectForm extends StatefulWidget {
  const _AddProjectForm();

  @override
  State<_AddProjectForm> createState() => _AddProjectFormState();
}

class _AddProjectFormState extends State<_AddProjectForm> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController(text: 'PRJ-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}');
  final _nameController = TextEditingController();
  final _budgetController = TextEditingController();
  final _descController = TextEditingController();
  String? _selectedClientId;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 90));
  String _status = 'IN_PROGRESS';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ClientProvider>().fetchClients();
    });
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
    if (_isSubmitting) return;

    final code = _codeController.text.trim();
    final name = _nameController.text.trim();
    final budgetStr = _budgetController.text.trim();
    final budget = double.tryParse(budgetStr);

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama proyek wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kode proyek wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_selectedClientId == null || _selectedClientId!.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Client wajib dipilih.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (budget == null || budget < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contract Value / Budget tidak boleh negatif.'), backgroundColor: AppColors.danger),
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

    final success = await context.read<ProjectProvider>().createProject({
      'projectCode': code,
      'code': code,
      'name': name,
      'clientId': _selectedClientId,
      'contractValue': budget,
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
          const SnackBar(content: Text('Proyek baru berhasil dibuat!'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<ProjectProvider>().error ?? 'Gagal membuat proyek.';
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
    final clients = context.watch<ClientProvider>().clients;

    if (_selectedClientId != null && !clients.any((c) => c.id == _selectedClientId)) {
      _selectedClientId = null;
    }
    if (_selectedClientId == null && clients.isNotEmpty) {
      _selectedClientId = clients.first.id;
    }

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
                  const Text('Buat Proyek Baru', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _codeController,
                decoration: const InputDecoration(labelText: 'Kode Proyek *', hintText: 'PRJ-2026-001'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nama Proyek *', hintText: 'mis. Redesign Web Mobile'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _selectedClientId,
                decoration: const InputDecoration(labelText: 'Klien / Perusahaan *'),
                items: clients.isEmpty
                    ? [const DropdownMenuItem<String>(value: null, child: Text('Belum ada klien (Tambahkan Klien terlebih dahulu)'))]
                    : clients.map((c) => DropdownMenuItem(value: c.id, child: Text('${c.companyName} (${c.contactPerson})'))).toList(),
                onChanged: (val) {
                  setState(() => _selectedClientId = val);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _budgetController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Contract Value / Budget (Rp) *', hintText: '100000000'),
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
                decoration: const InputDecoration(labelText: 'Deskripsi Scope Proyek (Opsional)'),
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
                    : const Text('Simpan Proyek Baru', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
