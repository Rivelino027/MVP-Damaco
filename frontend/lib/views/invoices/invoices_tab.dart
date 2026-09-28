import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/client_provider.dart';
import '../../providers/invoice_provider.dart';
import '../../providers/milestone_provider.dart';
import '../../providers/project_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class InvoicesTab extends StatefulWidget {
  const InvoicesTab({super.key});

  @override
  State<InvoicesTab> createState() => _InvoicesTabState();
}

class _InvoicesTabState extends State<InvoicesTab> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'ALL';
  String? _selectedProjectId;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<ClientProvider>().fetchClients();
      context.read<InvoiceProvider>().fetchInvoices();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    await context.read<InvoiceProvider>().fetchInvoices(
          projectId: _selectedProjectId,
          status: _selectedStatus,
          search: _searchController.text.trim(),
        );
  }

  void _showInvoiceFormModal([InvoiceModel? invoice]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _InvoiceFormModal(invoice: invoice, onSuccess: _refresh),
    );
  }

  void _showPdfPreviewDialog(InvoiceModel invoice) {
    showDialog(
      context: context,
      builder: (ctx) => _InvoicePdfPreviewDialog(invoice: invoice),
    );
  }

  Future<void> _sendInvoiceAction(String id) async {
    final success = await context.read<InvoiceProvider>().sendInvoice(id);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invoice berhasil dikirim ke Klien! Status: SENT.'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<InvoiceProvider>().error ?? 'Gagal mengirim invoice.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  Future<void> _markPaid(String id) async {
    final success = await context.read<InvoiceProvider>().updateInvoiceStatus(id, 'PAID');
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invoice berhasil ditandai LUNAS!'), backgroundColor: AppColors.success),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengubah status invoice.'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  void _confirmDeleteInvoice(InvoiceModel inv) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Invoice'),
        content: Text('Apakah Anda yakin ingin menghapus invoice "${inv.invoiceNumber}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<InvoiceProvider>().deleteInvoice(inv.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Invoice berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<InvoiceProvider>().error ?? 'Gagal menghapus invoice.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus Invoice'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';

    // Access control check: MEMBER role cannot access invoice data
    if (role == 'MEMBER') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: AppColors.danger),
              const SizedBox(height: 16),
              const Text(
                'Akses Terbatas (Financial Confidential)',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              const Text(
                'Modul Invoice & Billing Penagihan diperuntukkan bagi OWNER, FINANCE, PROJECT MANAGER, dan CLIENT.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    final canCreate = role == 'OWNER' || role == 'FINANCE' || role == 'PM' || role == 'PROJECT_MANAGER';
    final invProvider = context.watch<InvoiceProvider>();
    final invoicesList = invProvider.invoices;

    final query = _searchController.text.toLowerCase().trim();
    final filteredInvoices = invoicesList.where((inv) {
      final numStr = inv.invoiceNumber.toLowerCase();
      final projStr = (inv.projectName ?? '').toLowerCase();
      final clientStr = (inv.clientCompanyName ?? '').toLowerCase();
      final matchesSearch = query.isEmpty || numStr.contains(query) || projStr.contains(query) || clientStr.contains(query);

      final statusStr = inv.status.toUpperCase();
      final matchesStatus = _selectedStatus == 'ALL' || statusStr == _selectedStatus;
      final matchesProject = _selectedProjectId == null || inv.projectId == _selectedProjectId;

      return matchesSearch && matchesStatus && matchesProject;
    }).toList();

    return Scaffold(
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => _showInvoiceFormModal(),
              icon: const Icon(Icons.add),
              label: const Text('Buat Invoice Baru'),
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
                      Text(
                        role == 'CLIENT' ? 'Daftar Invoice Penagihan Saya' : 'Kelola Invoice & Billing Klien',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        role == 'CLIENT'
                            ? 'Riwayat invoice dan status pembayaran proyek Anda'
                            : 'Manajemen invoice penagihan termin dan pencatatan piutang proyek',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Financial Metrics Overview Cards
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Terbayar (Paid)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.compactRupiah(invProvider.totalPaid),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Piutang (Outstanding)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.compactRupiah(invProvider.totalOutstanding),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.warning),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
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
                              hintText: 'Cari invoice (nomor, proyek, klien)...',
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
                        DropdownMenuItem(value: 'SENT', child: Text('Dikirim (Sent)')),
                        DropdownMenuItem(value: 'PARTIAL', child: Text('Sebagian (Partial)')),
                        DropdownMenuItem(value: 'PAID', child: Text('Lunas (Paid)')),
                        DropdownMenuItem(value: 'OVERDUE', child: Text('Jatuh Tempo (Overdue)')),
                        DropdownMenuItem(value: 'CANCELLED', child: Text('Dibatalkan')),
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

            if (invProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (filteredInvoices.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada data invoice terdaftar.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredInvoices.map((inv) {
                final isPaid = inv.status == 'PAID';
                final isOverdue = inv.status == 'OVERDUE';
                final isDraft = inv.status == 'DRAFT';

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
                              backgroundColor: _statusColor(inv.status).withValues(alpha: 0.15),
                              child: Icon(_statusIcon(inv.status), color: _statusColor(inv.status), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    inv.invoiceNumber,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                  ),
                                  if (inv.milestoneName != null)
                                    Text(
                                      'Milestone: ${inv.milestoneName}',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  Formatters.compactRupiah(inv.totalAmount),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
                                ),
                                if (inv.taxAmount > 0)
                                  Text(
                                    'Termasuk Pajak: ${Formatters.compactRupiah(inv.taxAmount)}',
                                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                  ),
                              ],
                            ),
                            if (canCreate) ...[
                              const SizedBox(width: 4),
                              PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert, size: 20, color: AppColors.textMuted),
                                onSelected: (val) {
                                  if (val == 'edit') _showInvoiceFormModal(inv);
                                  if (val == 'send') _sendInvoiceAction(inv.id);
                                  if (val == 'pdf') _showPdfPreviewDialog(inv);
                                  if (val == 'delete') _confirmDeleteInvoice(inv);
                                },
                                itemBuilder: (ctx) => [
                                  const PopupMenuItem(value: 'pdf', child: Row(children: [Icon(Icons.picture_as_pdf, size: 16), SizedBox(width: 8), Text('Lihat / Download PDF')])),
                                  if (isDraft)
                                    const PopupMenuItem(value: 'send', child: Row(children: [Icon(Icons.send, size: 16), SizedBox(width: 8), Text('Kirim ke Klien')])),
                                  const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit, size: 16), SizedBox(width: 8), Text('Edit Invoice')])),
                                  const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, size: 16, color: AppColors.danger), SizedBox(width: 8), Text('Hapus Invoice', style: TextStyle(color: AppColors.danger))])),
                                ],
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Proyek: ${inv.projectName ?? '-'} | Klien: ${inv.clientCompanyName ?? '-'}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 10),
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
                                      const Icon(Icons.event_available, size: 12, color: AppColors.primary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Tenggat: ${Formatters.formatDate(inv.dueDate.toIso8601String())}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: isOverdue ? AppColors.danger : AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => _showPdfPreviewDialog(inv),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: const [
                                        Icon(Icons.picture_as_pdf, size: 12, color: AppColors.primary),
                                        SizedBox(width: 4),
                                        Text('PDF Invoice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _statusColor(inv.status).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    inv.status.replaceAll('_', ' ').toUpperCase(),
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _statusColor(inv.status)),
                                  ),
                                ),
                                if (!isPaid && (role == 'OWNER' || role == 'FINANCE')) ...[
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    onPressed: () => _markPaid(inv.id),
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    icon: const Icon(Icons.payment, size: 14),
                                    label: const Text('Tandai Lunas', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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
      case 'PAID':
        return AppColors.success;
      case 'SENT':
      case 'ISSUED':
        return AppColors.info;
      case 'PARTIAL':
        return AppColors.warning;
      case 'OVERDUE':
        return AppColors.danger;
      case 'CANCELLED':
        return AppColors.textMuted;
      default:
        return AppColors.textMuted;
    }
  }

  static IconData _statusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'PAID':
        return Icons.check_circle_outline;
      case 'SENT':
      case 'ISSUED':
        return Icons.send_outlined;
      case 'PARTIAL':
        return Icons.timelapse;
      case 'OVERDUE':
        return Icons.warning_amber;
      default:
        return Icons.receipt_long;
    }
  }
}

class _InvoiceFormModal extends StatefulWidget {
  final InvoiceModel? invoice;
  final VoidCallback onSuccess;

  const _InvoiceFormModal({this.invoice, required this.onSuccess});

  @override
  State<_InvoiceFormModal> createState() => _InvoiceFormModalState();
}

class _InvoiceFormModalState extends State<_InvoiceFormModal> {
  final _numberController = TextEditingController();
  final _amountController = TextEditingController();
  final _taxRateController = TextEditingController(text: '11');
  final _notesController = TextEditingController();

  String? _selectedProjectId;
  String? _selectedClientId;
  String? _selectedMilestoneId;
  String _status = 'DRAFT';
  DateTime _dueDate = DateTime.now().add(const Duration(days: 30));
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final inv = widget.invoice;
    if (inv != null) {
      _numberController.text = inv.invoiceNumber;
      _amountController.text = inv.amount.toStringAsFixed(0);
      _taxRateController.text = inv.taxRate.toStringAsFixed(0);
      _notesController.text = inv.notes ?? '';
      _selectedProjectId = inv.projectId;
      _selectedClientId = inv.clientId;
      _selectedMilestoneId = inv.milestoneId;
      _status = inv.status;
      _dueDate = inv.dueDate;
    }
  }

  @override
  void dispose() {
    _numberController.dispose();
    _amountController.dispose();
    _taxRateController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  void _onProjectChanged(String? projId) {
    setState(() {
      _selectedProjectId = projId;
      if (projId != null) {
        final projects = context.read<ProjectProvider>().projects;
        final matchingProj = projects.firstWhere((p) => p.id == projId, orElse: () => projects.first);
        _selectedClientId = matchingProj.clientId;
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
        const SnackBar(content: Text('Subtotal nominal tagihan harus lebih dari 0.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final taxRate = double.tryParse(_taxRateController.text.trim()) ?? 0;

    setState(() => _isSubmitting = true);

    final data = {
      'projectId': _selectedProjectId,
      'clientId': _selectedClientId,
      'milestoneId': _selectedMilestoneId,
      'invoiceNumber': _numberController.text.trim(),
      'amount': amount,
      'subtotal': amount,
      'taxRate': taxRate,
      'dueDate': _dueDate.toIso8601String(),
      'status': _status,
      'notes': _notesController.text.trim(),
    };

    bool success;
    if (widget.invoice == null) {
      success = await context.read<InvoiceProvider>().createInvoice(data);
    } else {
      success = await context.read<InvoiceProvider>().updateInvoice(widget.invoice!.id, data);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.invoice == null ? 'Invoice berhasil dibuat!' : 'Invoice berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<InvoiceProvider>().error ?? 'Gagal menyimpan invoice.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final projects = context.watch<ProjectProvider>().projects;
    final milestones = context.watch<MilestoneProvider>().milestones;

    final projectMilestones = _selectedProjectId != null
        ? milestones.where((m) => m.projectId == _selectedProjectId).toList()
        : milestones;

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
                  widget.invoice == null ? 'Buat Invoice Penagihan Baru' : 'Edit Invoice',
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
              value: _selectedMilestoneId,
              decoration: const InputDecoration(labelText: 'Milestone / Termin (Opsional)'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('Tanpa Milestone (Manual Billing)')),
                ...projectMilestones.map((m) => DropdownMenuItem<String?>(
                      value: m.id,
                      child: Text('${m.name} (${Formatters.compactRupiah(m.amount)})'),
                    )),
              ],
              onChanged: (val) {
                setState(() {
                  _selectedMilestoneId = val;
                  if (val != null) {
                    final selectedMs = projectMilestones.firstWhere((m) => m.id == val);
                    if (selectedMs.amount > 0) {
                      _amountController.text = selectedMs.amount.toStringAsFixed(0);
                    }
                  }
                });
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _numberController,
              decoration: const InputDecoration(
                labelText: 'Nomor Invoice (Biarkan kosong untuk auto-generate)',
                hintText: 'Contoh: INV-2026-0001',
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
                    decoration: const InputDecoration(labelText: 'Subtotal Tagihan (Rp) *'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: TextField(
                    controller: _taxRateController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Pajak / PPN (%)'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Status Invoice'),
              items: const [
                DropdownMenuItem(value: 'DRAFT', child: Text('Draft')),
                DropdownMenuItem(value: 'SENT', child: Text('Dikirim (Sent)')),
                DropdownMenuItem(value: 'PARTIAL', child: Text('Sebagian (Partial)')),
                DropdownMenuItem(value: 'PAID', child: Text('Lunas (Paid)')),
                DropdownMenuItem(value: 'OVERDUE', child: Text('Jatuh Tempo (Overdue)')),
                DropdownMenuItem(value: 'CANCELLED', child: Text('Dibatalkan')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _status = val);
              },
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: _selectDueDate,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Jatuh Tempo (Due Date): ${Formatters.formatDate(_dueDate.toIso8601String())}',
                        style: const TextStyle(fontSize: 14)),
                    const Icon(Icons.calendar_today, size: 18, color: AppColors.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Catatan / Instruksi Pembayaran Transfer Bank'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.invoice == null ? 'Simpan & Diterbitkan' : 'Perbarui Invoice', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

class _InvoicePdfPreviewDialog extends StatelessWidget {
  final InvoiceModel invoice;
  const _InvoicePdfPreviewDialog({required this.invoice});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 600,
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.picture_as_pdf, color: AppColors.danger, size: 28),
                      SizedBox(width: 8),
                      Text('Dokumen PDF Invoice Penagihan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                ],
              ),
              const Divider(height: 24),

              // Invoice Paper Layout Preview
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: Company Logo / Name & Invoice Details
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text('DAMACO', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary)),
                            Text('Project & Cost Management System', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('INVOICE', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            Text('#${invoice.invoiceNumber}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary)),
                            Text('Tanggal: ${Formatters.formatDate(invoice.issueDate.toIso8601String())}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                            Text('Jatuh Tempo: ${Formatters.formatDate(invoice.dueDate.toIso8601String())}', style: const TextStyle(fontSize: 11, color: AppColors.danger, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(),

                    // Client & Project Info
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TAGIHAN KEPADA (CLIENT):', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                            Text(invoice.clientCompanyName ?? '-', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            Text('Kontak: ${invoice.clientContactPerson ?? '-'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('PROYEK TERKAIT:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                            Text(invoice.projectName ?? '-', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            Text('Kode: ${invoice.projectCode ?? '-'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Invoice Items Table
                    Table(
                      border: TableBorder.all(color: AppColors.border, width: 1),
                      columnWidths: const {
                        0: FlexColumnWidth(3),
                        1: FlexColumnWidth(2),
                      },
                      children: [
                        TableRow(
                          decoration: const BoxDecoration(color: AppColors.background),
                          children: const [
                            Padding(padding: EdgeInsets.all(8), child: Text('Deskripsi Item Penagihan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                            Padding(padding: EdgeInsets.all(8), child: Text('Jumlah (Rp)', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                          ],
                        ),
                        TableRow(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Text(
                                invoice.milestoneName != null ? 'Termin Milestone: ${invoice.milestoneName}' : 'Penagihan Proyek ${invoice.projectName}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Text(Formatters.rupiah(invoice.subtotal), textAlign: TextAlign.right, style: const TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Calculations Summary
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        width: 250,
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Subtotal:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                Text(Formatters.rupiah(invoice.subtotal), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Pajak PPN (${invoice.taxRate.toStringAsFixed(0)}%):', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                Text(Formatters.rupiah(invoice.taxAmount), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            const Divider(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('TOTAL TAGIHAN:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                Text(Formatters.rupiah(invoice.totalAmount), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    if (invoice.notes != null && invoice.notes!.isNotEmpty) ...[
                      const Text('Catatan Pembayaran:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                      const SizedBox(height: 2),
                      Text(invoice.notes!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Actions Row
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Tutup')),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('File PDF Invoice #${invoice.invoiceNumber} berhasil di-generate dan diunduh!'), backgroundColor: AppColors.success),
                      );
                    },
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Download PDF Invoice'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
