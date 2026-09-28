import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/po_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../providers/wbs_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class PurchaseOrdersTab extends StatefulWidget {
  const PurchaseOrdersTab({super.key});

  @override
  State<PurchaseOrdersTab> createState() => _PurchaseOrdersTabState();
}

class _PurchaseOrdersTabState extends State<PurchaseOrdersTab> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'ALL';
  String? _selectedProjectId;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<VendorProvider>().fetchVendors();
      context.read<PurchaseOrderProvider>().fetchPurchaseOrders();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    await context.read<PurchaseOrderProvider>().fetchPurchaseOrders(
          projectId: _selectedProjectId,
          status: _selectedStatus,
          search: _searchController.text.trim(),
        );
  }

  void _showPoFormModal([PurchaseOrderModel? po]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _PoFormModal(po: po, onSuccess: _refresh),
    );
  }

  void _confirmApprovePo(PurchaseOrderModel po) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Approval Purchase Order'),
        content: Text(
          'Apakah Anda yakin ingin menyetujui PO "${po.poNumber}" (${Formatters.rupiah(po.totalAmount)})?\n\n'
          'Nilai PO ini akan masuk sebagai COMMITTED COST proyek.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<PurchaseOrderProvider>().approvePurchaseOrder(po.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Purchase Order berhasil disetujui! Status: APPROVED.'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<PurchaseOrderProvider>().error ?? 'Gagal menyetujui PO.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Approve PO'),
          ),
        ],
      ),
    );
  }

  void _confirmDeletePo(PurchaseOrderModel po) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Purchase Order'),
        content: Text('Apakah Anda yakin ingin menghapus PO "${po.poNumber}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<PurchaseOrderProvider>().deletePurchaseOrder(po.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Purchase Order berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<PurchaseOrderProvider>().error ?? 'Gagal menghapus PO.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus PO'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';

    if (role == 'CLIENT') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: AppColors.danger),
              const SizedBox(height: 16),
              const Text(
                'Akses Terbatas Internal',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              const Text(
                'Data Purchase Order dan Vendor bersifat rahasia dan hanya dapat diakses oleh tim internal.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    final canManage = role == 'OWNER' || role == 'FINANCE' || role == 'PM' || role == 'PROJECT_MANAGER';
    final poProvider = context.watch<PurchaseOrderProvider>();
    final posList = poProvider.purchaseOrders;

    final query = _searchController.text.toLowerCase().trim();
    final filteredPOs = posList.where((po) {
      final numStr = po.poNumber.toLowerCase();
      final vendorStr = po.vendorName.toLowerCase();
      final projStr = (po.projectName ?? '').toLowerCase();
      final matchesSearch = query.isEmpty || numStr.contains(query) || vendorStr.contains(query) || projStr.contains(query);

      final statusStr = po.status.toUpperCase();
      final matchesStatus = _selectedStatus == 'ALL' || statusStr == _selectedStatus;
      final matchesProject = _selectedProjectId == null || po.projectId == _selectedProjectId;

      return matchesSearch && matchesStatus && matchesProject;
    }).toList();

    return Scaffold(
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showPoFormModal(),
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Buat PO Baru'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _refresh,
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
                      Text('Purchase Orders & Committed Costs', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      const Text(
                        'Komitmen biaya proyek terikat melalui Purchase Order yang disetujui (Approved)',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Summary Card: Total Committed Cost
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.shopping_bag_outlined, color: AppColors.info, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Committed Cost (Approved PO)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.rupiah(poProvider.totalCommittedCost),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.info),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Search Bar & Filter Controls
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
                              hintText: 'Cari PO (nomor, vendor, atau proyek)...',
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
                        DropdownMenuItem(value: 'DRAFT', child: Text('Draft')),
                        DropdownMenuItem(value: 'SUBMITTED', child: Text('Submitted')),
                        DropdownMenuItem(value: 'APPROVED', child: Text('Approved (Committed)')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                        DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
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

            if (poProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (filteredPOs.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada Purchase Order terdaftar.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredPOs.map((po) {
                final isApproved = po.status == 'APPROVED';
                final isDraft = po.status == 'DRAFT' || po.status == 'SUBMITTED';

                return Card(
                  margin: const EdgeInsets.only(bottom: 14),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: _statusColor(po.status).withValues(alpha: 0.15),
                              child: Icon(Icons.shopping_bag_outlined, color: _statusColor(po.status), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    po.poNumber,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                  ),
                                  Text(
                                    'Vendor: ${po.vendorName}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  Formatters.rupiah(po.totalAmount),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                ),
                                if (isApproved)
                                  Container(
                                    margin: const EdgeInsets.only(top: 2),
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                                    child: const Text('COMMITTED COST', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.info)),
                                  ),
                              ],
                            ),
                            if (canManage) ...[
                              const SizedBox(width: 4),
                              PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert, size: 20, color: AppColors.textMuted),
                                onSelected: (val) {
                                  if (val == 'edit') _showPoFormModal(po);
                                  if (val == 'approve') _confirmApprovePo(po);
                                  if (val == 'delete') _confirmDeletePo(po);
                                },
                                itemBuilder: (ctx) => [
                                  if (isDraft)
                                    const PopupMenuItem(value: 'approve', child: Row(children: [Icon(Icons.check_circle_outline, size: 16, color: AppColors.success), SizedBox(width: 8), Text('Approve PO')])),
                                  const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit, size: 16), SizedBox(width: 8), Text('Edit PO')])),
                                  const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, size: 16, color: AppColors.danger), SizedBox(width: 8), Text('Hapus PO', style: TextStyle(color: AppColors.danger))])),
                                ],
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Proyek: ${po.projectName ?? '-'} ${po.phaseName != null ? "• Fase: ${po.phaseName}" : ""}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                        if (po.description != null && po.description!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(po.description!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ],
                        const SizedBox(height: 10),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Tgl Order: ${Formatters.formatDate(po.orderDate.toIso8601String())}',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                            ),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: _statusColor(po.status).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    po.status.replaceAll('_', ' ').toUpperCase(),
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(po.status)),
                                  ),
                                ),
                                if (isDraft && canManage) ...[
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    onPressed: () => _confirmApprovePo(po),
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      backgroundColor: AppColors.success,
                                      foregroundColor: Colors.white,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    icon: const Icon(Icons.check, size: 14),
                                    label: const Text('Approve', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
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

  static Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return AppColors.success;
      case 'COMPLETED':
        return AppColors.info;
      case 'SUBMITTED':
        return AppColors.warning;
      case 'CANCELLED':
      case 'REJECTED':
        return AppColors.danger;
      default:
        return AppColors.textMuted;
    }
  }
}

class _PoFormModal extends StatefulWidget {
  final PurchaseOrderModel? po;
  final VoidCallback onSuccess;

  const _PoFormModal({this.po, required this.onSuccess});

  @override
  State<_PoFormModal> createState() => _PoFormModalState();
}

class _PoFormModalState extends State<_PoFormModal> {
  final _poNumberController = TextEditingController();
  final _amountController = TextEditingController();
  final _taxRateController = TextEditingController(text: '0');
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();

  String? _selectedProjectId;
  String? _selectedPhaseId;
  String? _selectedVendorId;
  final TextEditingController _customVendorController = TextEditingController();

  String _status = 'DRAFT';
  DateTime _orderDate = DateTime.now();
  DateTime? _expectedDate;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final po = widget.po;
    if (po != null) {
      _poNumberController.text = po.poNumber;
      _amountController.text = po.amount.toStringAsFixed(0);
      _taxRateController.text = po.taxRate.toStringAsFixed(0);
      _descriptionController.text = po.description ?? '';
      _notesController.text = po.notes ?? '';
      _selectedProjectId = po.projectId;
      _selectedPhaseId = po.phaseId;
      _selectedVendorId = po.vendorId;
      _customVendorController.text = po.vendorName;
      _status = po.status;
      _orderDate = po.orderDate;
      _expectedDate = po.expectedDate;
    }
  }

  @override
  void dispose() {
    _poNumberController.dispose();
    _amountController.dispose();
    _taxRateController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    _customVendorController.dispose();
    super.dispose();
  }

  void _onProjectChanged(String? projId) {
    setState(() {
      _selectedProjectId = projId;
      _selectedPhaseId = null;
      if (projId != null) {
        context.read<WbsProvider>().fetchPhases(projectId: projId);
      }
    });
  }

  void _submit() async {
    if (_selectedProjectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proyek wajib dipilih.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nominal PO harus lebih dari 0.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final vendorName = _selectedVendorId != null
        ? context.read<VendorProvider>().vendors.firstWhere((v) => v.id == _selectedVendorId).name
        : _customVendorController.text.trim();

    if (vendorName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama vendor wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final taxRate = double.tryParse(_taxRateController.text.trim()) ?? 0;

    setState(() => _isSubmitting = true);

    final data = {
      'projectId': _selectedProjectId,
      'phaseId': _selectedPhaseId,
      'vendorId': _selectedVendorId,
      'vendorName': vendorName,
      'poNumber': _poNumberController.text.trim(),
      'amount': amount,
      'taxRate': taxRate,
      'description': _descriptionController.text.trim(),
      'notes': _notesController.text.trim(),
      'status': _status,
      'orderDate': _orderDate.toIso8601String(),
      'expectedDate': _expectedDate?.toIso8601String(),
    };

    bool success;
    if (widget.po == null) {
      success = await context.read<PurchaseOrderProvider>().createPurchaseOrder(data);
    } else {
      success = await context.read<PurchaseOrderProvider>().updatePurchaseOrder(widget.po!.id, data);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.po == null ? 'PO berhasil dibuat!' : 'PO berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<PurchaseOrderProvider>().error ?? 'Gagal menyimpan PO.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final projects = context.watch<ProjectProvider>().projects;
    final vendors = context.watch<VendorProvider>().vendors;
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
                  widget.po == null ? 'Buat Purchase Order Baru' : 'Edit Purchase Order',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedProjectId,
              decoration: const InputDecoration(labelText: 'Proyek *'),
              items: projects.map((p) {
                return DropdownMenuItem(value: p.id, child: Text('${p.code} - ${p.name}'));
              }).toList(),
              onChanged: _onProjectChanged,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: _selectedPhaseId,
              decoration: const InputDecoration(labelText: 'Fase WBS (Opsional)'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('Tanpa Fase WBS')),
                ...phases.map((ph) => DropdownMenuItem<String?>(value: ph.id, child: Text(ph.name))),
              ],
              onChanged: (val) => setState(() => _selectedPhaseId = val),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: _selectedVendorId,
              decoration: const InputDecoration(labelText: 'Vendor Terdaftar'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('Input Vendor Kustom...')),
                ...vendors.map((v) => DropdownMenuItem<String?>(value: v.id, child: Text(v.name))),
              ],
              onChanged: (val) {
                setState(() {
                  _selectedVendorId = val;
                  if (val != null) {
                    _customVendorController.text = vendors.firstWhere((v) => v.id == val).name;
                  }
                });
              },
            ),
            if (_selectedVendorId == null) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _customVendorController,
                decoration: const InputDecoration(labelText: 'Nama Vendor *'),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _poNumberController,
              decoration: const InputDecoration(
                labelText: 'Nomor PO (Kosongkan untuk auto-generate)',
                hintText: 'Contoh: PO-2026-0001',
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Subtotal Nominal PO (Rp) *'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: TextField(
                    controller: _taxRateController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Pajak (%)'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Status PO'),
              items: const [
                DropdownMenuItem(value: 'DRAFT', child: Text('Draft')),
                DropdownMenuItem(value: 'SUBMITTED', child: Text('Submitted')),
                DropdownMenuItem(value: 'APPROVED', child: Text('Approved (Committed Cost)')),
                DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _status = val);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Deskripsi Item PO'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.po == null ? 'Simpan PO' : 'Perbarui PO', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
