import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../domain/entities/approval_item_entity.dart';
import '../providers/approvals_provider.dart';

class PaymentsPage extends ConsumerWidget {
  const PaymentsPage({super.key});

  void _showRecordPaymentSheet(BuildContext context, WidgetRef ref, ApprovalItemEntity item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RecordPaymentSheet(item: item),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(paymentsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: [
            Text(
              'Pembayaran',
              style: AppTextStyles.h1.copyWith(fontSize: 20),
            ),
            const SizedBox(width: 8),
            if (state.items.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${state.items.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    PaymentsState state,
  ) {
    if (state.status == ApprovalsStatus.loading) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: SkeletonList(itemCount: 4, itemHeight: 110),
      );
    }

    if (state.status == ApprovalsStatus.error) {
      return Center(
        child: ErrorState(
          title: 'Gagal Memuat Pembayaran',
          message: state.errorMessage ?? 'Terjadi kesalahan sistem.',
          onRetry: () =>
              ref.read(paymentsProvider.notifier).loadPayments(),
        ),
      );
    }

    if (state.items.isEmpty) {
      return const Center(
        child: EmptyState(
          icon: Icons.payments_outlined,
          title: 'Semua Telah Dibayar',
          message: 'Tidak ada pengeluaran yang menunggu pembayaran saat ini.',
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(paymentsProvider.notifier).loadPayments(),
      child: ListView.separated(
        padding: const EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: 100,
        ),
        itemCount: state.items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = state.items[index];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderLight),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(8),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Siap Dibayar',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ),
                    if (item.isLargeAmount)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF3DC),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Nominal Besar',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  item.title,
                  style: AppTextStyles.h2.copyWith(fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.applicantName} • ${item.applicantDepartment} (${item.costCenterCode})',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'NOMINAL',
                          style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 0.8,
                            color: AppColors.textPlaceholder,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          CurrencyFormatter.formatRupiah(item.amount),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.check_circle_outline_rounded,
                          size: 16, color: Colors.white),
                      label: const Text(
                        'Tandai Dibayar',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      onPressed: () =>
                          _showRecordPaymentSheet(context, ref, item),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _RecordPaymentSheet extends ConsumerStatefulWidget {
  final ApprovalItemEntity item;

  const _RecordPaymentSheet({required this.item});

  @override
  ConsumerState<_RecordPaymentSheet> createState() =>
      _RecordPaymentSheetState();
}

class _RecordPaymentSheetState extends ConsumerState<_RecordPaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _refNoController = TextEditingController();
  String _selectedMethod = 'transfer'; // 'transfer' | 'tunai'
  DateTime _paidDate = DateTime.now();
  bool _isLoading = false;

  @override
  void dispose() {
    _refNoController.dispose();
    super.dispose();
  }

  Future<void> _pickPaidDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _paidDate,
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _paidDate = picked);
    }
  }

  Future<void> _handleSubmitPayment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.lightImpact();

    final success = await ref.read(paymentsProvider.notifier).recordPayment(
          expenseId: widget.item.documentId,
          method: _selectedMethod,
          referenceNo: _refNoController.text.trim().isEmpty
              ? null
              : _refNoController.text.trim(),
          paidAt: _paidDate,
        );

    if (mounted) {
      setState(() => _isLoading = false);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: success ? AppColors.success : AppColors.danger,
          content: Text(
            success
                ? 'Pembayaran berhasil dicatat. Status pengeluaran kini "Dibayar".'
                : 'Gagal mencatat pembayaran.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: bottomInset > 0 ? bottomInset + 20 : 28,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Catat Pembayaran',
                    style: AppTextStyles.h2.copyWith(fontSize: 18),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(),
              const SizedBox(height: 12),

              // Rincian Pengeluaran
              Text(
                widget.item.title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Nominal: ${CurrencyFormatter.formatRupiah(widget.item.amount)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),

              // Pilihan Metode Pembayaran
              const Text(
                'Metode Pembayaran',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _selectedMethod == 'transfer'
                            ? AppColors.primary
                            : Colors.grey.shade100,
                        side: BorderSide(
                          color: _selectedMethod == 'transfer'
                              ? AppColors.primary
                              : Colors.grey.shade300,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () =>
                          setState(() => _selectedMethod = 'transfer'),
                      child: Text(
                        'Transfer Bank',
                        style: TextStyle(
                          color: _selectedMethod == 'transfer'
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _selectedMethod == 'tunai'
                            ? AppColors.primary
                            : Colors.grey.shade100,
                        side: BorderSide(
                          color: _selectedMethod == 'tunai'
                              ? AppColors.primary
                              : Colors.grey.shade300,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () =>
                          setState(() => _selectedMethod = 'tunai'),
                      child: Text(
                        'Tunai / Kas',
                        style: TextStyle(
                          color: _selectedMethod == 'tunai'
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Nomor Referensi
              TextFormField(
                controller: _refNoController,
                decoration: InputDecoration(
                  labelText: _selectedMethod == 'transfer'
                      ? 'Nomor Referensi Transfer (Wajib)'
                      : 'Nomor Kwitansi / Referensi (Opsional)',
                  hintText: 'Contoh: TRF-20261015-883',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                validator: (val) {
                  if (_selectedMethod == 'transfer') {
                    if (val == null || val.trim().isEmpty) {
                      return 'Nomor referensi transfer wajib diisi';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Tanggal Pembayaran
              InkWell(
                onTap: _pickPaidDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade400),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Tanggal Pembayaran',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textPlaceholder,
                            ),
                          ),
                          Text(
                            DateFormatter.formatFullDayAndDate(_paidDate),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const Icon(Icons.calendar_today_rounded, size: 20),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Tombol Konfirmasi
              AppButton(
                text: 'Konfirmasi Pembayaran',
                isLoading: _isLoading,
                onPressed: _handleSubmitPayment,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
