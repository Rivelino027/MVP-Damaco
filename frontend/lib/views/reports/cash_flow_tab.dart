import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cash_flow_provider.dart';
import '../../providers/invoice_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/po_provider.dart';
import '../../providers/project_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/formatters.dart';

class CashFlowTab extends StatefulWidget {
  const CashFlowTab({super.key});

  @override
  State<CashFlowTab> createState() => _CashFlowTabState();
}

class _CashFlowTabState extends State<CashFlowTab> {
  String _selectedPeriod = 'ALL';
  String? _selectedProjectId;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<ProjectProvider>().fetchProjects();
      context.read<InvoiceProvider>().fetchInvoices();
      context.read<PurchaseOrderProvider>().fetchPurchaseOrders();
      context.read<CashFlowProvider>().fetchCashFlow();
    });
  }

  Future<void> _refresh() async {
    await context.read<CashFlowProvider>().fetchCashFlow(
          projectId: _selectedProjectId,
          period: _selectedPeriod,
        );
  }

  void _showRecordPaymentModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _RecordPaymentModal(onSuccess: _refresh),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';

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
                'Akses Terbatas Financial Cash Flow',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              const Text(
                'Laporan Cash Flow dan Kas Masuk/Keluar hanya diperuntukkan bagi OWNER, FINANCE, PROJECT MANAGER, dan CLIENT.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    final canRecordPayment = role == 'OWNER' || role == 'FINANCE';
    final cfProvider = context.watch<CashFlowProvider>();
    final projProvider = context.watch<ProjectProvider>();
    final isClient = role == 'CLIENT';

    return Scaffold(
      floatingActionButton: canRecordPayment
          ? FloatingActionButton.extended(
              onPressed: _showRecordPaymentModal,
              icon: const Icon(Icons.add_card),
              label: const Text('Catat Transaksi Kas'),
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
                        isClient ? 'Cash Flow Kas Masuk Pembayaran' : 'Arus Kas Realtime (Cash Flow)',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isClient
                            ? 'Monitoring realisasi transaksi kas pembayaran invoice proyek Anda'
                            : 'Pencatatan aktual Cash In (Pembayaran Invoice Client) & Cash Out (Pembayaran Vendor/Expenses)',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Cash Flow Summary Cards (Cash In, Cash Out, Net Cash Flow)
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
                        const Text('Total Cash In (Masuk)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.compactRupiah(cfProvider.totalCashIn),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
                        ),
                      ],
                    ),
                  ),
                ),
                if (!isClient) ...[
                  const SizedBox(width: 10),
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
                          const Text('Total Cash Out (Keluar)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          const SizedBox(height: 4),
                          Text(
                            Formatters.compactRupiah(cfProvider.totalCashOut),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.danger),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(width: 10),
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
                        const Text('Net Cash Flow', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.compactRupiah(cfProvider.netCashFlow),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: cfProvider.netCashFlow >= 0 ? AppColors.primary : AppColors.danger,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Period & Project Filters
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedPeriod,
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                        items: const [
                          DropdownMenuItem(value: 'ALL', child: Text('Semua Periode')),
                          DropdownMenuItem(value: 'today', child: Text('Hari Ini (Today)')),
                          DropdownMenuItem(value: 'this_week', child: Text('Minggu Ini')),
                          DropdownMenuItem(value: 'this_month', child: Text('Bulan Ini')),
                          DropdownMenuItem(value: 'this_year', child: Text('Tahun Ini')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedPeriod = val);
                            _refresh();
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String?>(
                        value: _selectedProjectId,
                        hint: const Text('Semua Proyek', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                        items: [
                          const DropdownMenuItem<String?>(value: null, child: Text('Semua Proyek')),
                          ...projProvider.projects.map((p) => DropdownMenuItem<String?>(
                                value: p.id,
                                child: Text(p.name),
                              )),
                        ],
                        onChanged: (val) {
                          setState(() => _selectedProjectId = val);
                          _refresh();
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Cash Flow Table View (Requirement #25)
            Text('Histori Transaksi Arus Kas (${cfProvider.transactions.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 10),

            if (cfProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (cfProvider.transactions.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada transaksi arus kas terdaftar.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columnSpacing: 16,
                    columns: const [
                      DataColumn(label: Text('Tanggal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      DataColumn(label: Text('Tipe Arus Kas', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      DataColumn(label: Text('Keterangan / Transaksi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      DataColumn(label: Text('Proyek', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      DataColumn(label: Text('Metode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      DataColumn(label: Text('Nominal (Rp)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    ],
                    rows: cfProvider.transactions.map((tx) {
                      final isCashIn = tx.type == 'Cash In';
                      final color = isCashIn ? AppColors.success : AppColors.danger;

                      return DataRow(
                        cells: [
                          DataCell(Text(Formatters.formatDate(tx.date.toIso8601String()), style: const TextStyle(fontSize: 11))),
                          DataCell(
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                tx.type.toUpperCase(),
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                              ),
                            ),
                          ),
                          DataCell(Text(tx.description, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
                          DataCell(Text(tx.projectName, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary))),
                          DataCell(Text(tx.paymentMethod, style: const TextStyle(fontSize: 11, color: AppColors.textMuted))),
                          DataCell(
                            Text(
                              '${isCashIn ? "+" : "-"} ${Formatters.rupiah(tx.amount)}',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RecordPaymentModal extends StatefulWidget {
  final VoidCallback onSuccess;
  const _RecordPaymentModal({required this.onSuccess});

  @override
  State<_RecordPaymentModal> createState() => _RecordPaymentModalState();
}

class _RecordPaymentModalState extends State<_RecordPaymentModal> {
  String _paymentType = 'CLIENT_PAYMENT'; // CLIENT_PAYMENT (Cash In) vs VENDOR_PAYMENT (Cash Out)
  String? _selectedProjectId;
  String? _selectedInvoiceId;
  String? _selectedPoId;
  final _amountController = TextEditingController();
  final _refNumberController = TextEditingController();
  final _notesController = TextEditingController();
  String _paymentMethod = 'BANK_TRANSFER';
  bool _isSubmitting = false;

  void _onInvoiceSelected(String? invId) {
    setState(() {
      _selectedInvoiceId = invId;
      if (invId != null) {
        final invoices = context.read<InvoiceProvider>().invoices;
        final matchingInv = invoices.firstWhere((inv) => inv.id == invId);
        _selectedProjectId = matchingInv.projectId;
        
        // Compute outstanding
        double paidSum = (matchingInv.payments ?? []).fold<double>(0, (sum, p) => sum + (p['amount'] as num? ?? 0).toDouble());
        double outstanding = matchingInv.totalAmount - paidSum;
        if (outstanding > 0) {
          _amountController.text = outstanding.toStringAsFixed(0);
        }
      }
    });
  }

  void _submit() async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nominal transaksi pembayaran harus lebih dari 0.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    if (_paymentType == 'CLIENT_PAYMENT' && _selectedInvoiceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invoice Klien wajib dipilih untuk Cash In.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final data = {
      'type': _paymentType,
      'invoiceId': _selectedInvoiceId,
      'purchaseOrderId': _selectedPoId,
      'projectId': _selectedProjectId,
      'amount': amount,
      'paymentDate': DateTime.now().toIso8601String(),
      'paymentMethod': _paymentMethod,
      'referenceNumber': _refNumberController.text.trim(),
      'notes': _notesController.text.trim(),
    };

    final success = await context.read<PaymentProvider>().createPayment(data);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaksi Kas berhasil dicatat!'), backgroundColor: AppColors.success),
        );
      } else {
        final err = context.read<PaymentProvider>().error ?? 'Gagal mencatat pembayaran.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoices = context.watch<InvoiceProvider>().invoices.where((inv) => inv.status != 'PAID').toList();
    final pos = context.watch<PurchaseOrderProvider>().purchaseOrders.where((po) => po.status == 'APPROVED').toList();

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
                const Text('Catat Transaksi Pembayaran / Arus Kas', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _paymentType,
              decoration: const InputDecoration(labelText: 'Tipe Pembayaran'),
              items: const [
                DropdownMenuItem(value: 'CLIENT_PAYMENT', child: Text('🟢 Cash In — Pembayaran Invoice Klien')),
                DropdownMenuItem(value: 'VENDOR_PAYMENT', child: Text('🔴 Cash Out — Pembayaran Vendor / PO')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _paymentType = val);
              },
            ),
            const SizedBox(height: 12),
            if (_paymentType == 'CLIENT_PAYMENT') ...[
              DropdownButtonFormField<String?>(
                value: _selectedInvoiceId,
                decoration: const InputDecoration(labelText: 'Pilih Invoice Klien *'),
                items: invoices.map((inv) {
                  return DropdownMenuItem(
                    value: inv.id,
                    child: Text('${inv.invoiceNumber} (${inv.clientCompanyName ?? "-"}) — Total: ${Formatters.compactRupiah(inv.totalAmount)}'),
                  );
                }).toList(),
                onChanged: _onInvoiceSelected,
              ),
            ] else ...[
              DropdownButtonFormField<String?>(
                value: _selectedPoId,
                decoration: const InputDecoration(labelText: 'Pilih PO Vendor (Opsional)'),
                items: pos.map((po) {
                  return DropdownMenuItem(
                    value: po.id,
                    child: Text('${po.poNumber} (${po.vendorName}) — ${Formatters.compactRupiah(po.totalAmount)}'),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedPoId = val;
                    if (val != null) {
                      final selectedPo = pos.firstWhere((p) => p.id == val);
                      _selectedProjectId = selectedPo.projectId;
                      _amountController.text = selectedPo.totalAmount.toStringAsFixed(0);
                    }
                  });
                },
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Nominal Pembayaran (Rp) *'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _paymentMethod,
              decoration: const InputDecoration(labelText: 'Metode Pembayaran'),
              items: const [
                DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Transfer Bank')),
                DropdownMenuItem(value: 'CASH', child: Text('Tunai (Cash)')),
                DropdownMenuItem(value: 'E_WALLET', child: Text('E-Wallet')),
                DropdownMenuItem(value: 'CHEQUE', child: Text('Cek / Bilyet Giro')),
                DropdownMenuItem(value: 'OTHER', child: Text('Lainnya')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _paymentMethod = val);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _refNumberController,
              decoration: const InputDecoration(labelText: 'Nomor Referensi / Struk Transfer'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Catatan Transaksi'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Simpan Transaksi Kas', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
