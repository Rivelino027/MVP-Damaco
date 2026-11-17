import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../domain/entities/expense_entity.dart';
import '../providers/expenses_provider.dart';
import '../widgets/approval_timeline_widget.dart';
import '../widgets/receipt_zoom_dialog.dart';
import 'expense_form_page.dart';

class ExpenseDetailPage extends ConsumerWidget {
  final String expenseId;

  const ExpenseDetailPage({
    super.key,
    required this.expenseId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expenseAsync = ref.watch(expenseDetailProvider(expenseId));
    final notifier = ref.read(expenseDetailProvider(expenseId).notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded, size: 28),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Detail Pengeluaran',
          style: AppTextStyles.h2.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: expenseAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(AppSpacing.lg),
            child: SkeletonList(itemCount: 4),
          ),
          error: (err, _) => ErrorState(
            message: err is AppException ? err.message : err.toString(),
            onRetry: () => notifier.refresh(),
          ),
          data: (expense) {
            return RefreshIndicator(
              onRefresh: () => notifier.refresh(),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Banner Alasan Penolakan (Jika status Ditolak)
                    if (expense.status == 'ditolak') ...[
                      _buildRejectionBanner(expense.rejectReason),
                      const SizedBox(height: AppSpacing.md),
                    ],

                    // 2. Kartu Utama Info Pengeluaran
                    _buildMainInfoCard(context, expense),
                    const SizedBox(height: AppSpacing.md),

                    // 3. Pratinjau Bukti Nota
                    _buildReceiptCard(context, expense),
                    const SizedBox(height: AppSpacing.md),

                    // 4. Riwayat Timeline Persetujuan
                    ApprovalTimelineWidget(
                      approvals: expense.approvals,
                      status: expense.status,
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // 5. Info Pembayaran (Jika Dibayar)
                    if (expense.status == 'dibayar' && expense.payment != null) ...[
                      _buildPaymentInfoCard(expense),
                      const SizedBox(height: AppSpacing.md),
                    ],

                    // 6. Tombol Aksi Draft (Edit & Hapus & Ajukan)
                    if (expense.isEditable) ...[
                      const SizedBox(height: AppSpacing.sm),
                      _buildDraftActionButtons(context, ref, expense, notifier),
                    ],

                    const SizedBox(height: AppSpacing.xl),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildMainInfoCard(BuildContext context, ExpenseEntity expense) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Kode Dokumen & Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                expense.displayCode,
                style: AppTextStyles.captionBold.copyWith(
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              _buildStatusBadge(expense.status, expense.displayStatusLabel),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          // Judul Pengeluaran
          Text(
            expense.displayTitle,
            style: AppTextStyles.h2.copyWith(fontSize: 18),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Nominal Besar Badge & Nominal Rp
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                CurrencyFormatter.format(expense.amount),
                style: AppTextStyles.amountLarge.copyWith(
                  color: AppColors.primary,
                  fontSize: 24,
                ),
              ),
              if (expense.isLargeAmount) ...[
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF0DC),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFDE0B2)),
                  ),
                  child: const Text(
                    'Nominal Besar',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF9A5A0A),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const Divider(height: 24),

          // Metadata Details
          _buildDetailRow('Tanggal', DateFormatter.formatFullDayAndDate(expense.expenseDate)),
          _buildDetailRow('Kategori', expense.category?.name ?? 'Pengeluaran'),
          _buildDetailRow('Proyek', expense.projectName ?? '-'),
          if (expense.taskTitle != null) _buildDetailRow('Task', expense.taskTitle!),
          if (expense.costCenterName != null)
            _buildDetailRow('Cost Center', '${expense.costCenterCode ?? ''} ${expense.costCenterName ?? ''}'),
          if (expense.note != null && expense.note!.isNotEmpty)
            _buildDetailRow('Catatan', expense.note!),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 95,
            child: Text(
              label,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ),
          const Text(' :  ', style: TextStyle(color: AppColors.textSecondary)),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptCard(BuildContext context, ExpenseEntity expense) {
    final attachment =
        expense.attachments.isNotEmpty ? expense.attachments.first : null;
    final imageUrl = attachment?.url ??
        'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Bukti Nota', style: AppTextStyles.h3),
              TextButton.icon(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => ReceiptZoomDialog(imagePath: imageUrl),
                  );
                },
                icon: const Icon(Icons.zoom_in_rounded, size: 16),
                label: const Text('Perbesar'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  textStyle: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          GestureDetector(
            onTap: () {
              showDialog(
                context: context,
                builder: (_) => ReceiptZoomDialog(imagePath: imageUrl),
              );
            },
            child: Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFFAF7EE),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Icon(Icons.receipt_long_rounded,
                        size: 60, color: Color(0xFFF29D38)),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRejectionBanner(String? reason) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.dangerTint,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dangerBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.cancel_outlined,
            size: 20,
            color: AppColors.danger,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Pengeluaran Ditolak oleh Admin',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.danger,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  reason ?? 'Nota pengeluaran tidak sesuai atau perlu diperbaiki.',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.danger,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentInfoCard(ExpenseEntity expense) {
    final payment = expense.payment!;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9), // Hijau pastel
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: const Color(0xFFA5D6A7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF2E7D32),
                size: 20,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Informasi Pembayaran',
                style: AppTextStyles.subtitle1.copyWith(
                  color: const Color(0xFF2E7D32),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _buildDetailRow('Metode', payment.displayMethod),
          if (payment.referenceNo != null)
            _buildDetailRow('No. Referensi', payment.referenceNo!),
          _buildDetailRow('Tanggal Bayar', DateFormatter.formatFullDayAndDate(payment.paidAt)),
          _buildDetailRow('Dibayar Oleh', payment.paidByName ?? 'Finance'),
          _buildDetailRow('Jumlah', CurrencyFormatter.format(payment.amount)),
        ],
      ),
    );
  }

  Widget _buildDraftActionButtons(
    BuildContext context,
    WidgetRef ref,
    ExpenseEntity expense,
    ExpenseDetailNotifier notifier,
  ) {
    return Column(
      children: [
        Row(
          children: [
            // Tombol Edit
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ExpenseFormPage(expenseToEdit: expense),
                    ),
                  ).then((_) => notifier.refresh());
                },
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('Edit'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Tombol Hapus
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _confirmDelete(context, expense, notifier),
                icon: const Icon(Icons.delete_outline_rounded, size: 16),
                label: const Text('Hapus'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.dangerBorder),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
        if (expense.canSubmit) ...[
          const SizedBox(height: AppSpacing.md),
          AppButton(
            text: 'Ajukan ke Admin',
            onPressed: () async {
              try {
                await notifier.submit();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Pengeluaran berhasil diajukan ke Admin.'),
                      backgroundColor: AppColors.primary,
                    ),
                  );
                }
              } on AppException catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(e.message),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                }
              }
            },
          ),
        ],
      ],
    );
  }

  void _confirmDelete(
    BuildContext context,
    ExpenseEntity expense,
    ExpenseDetailNotifier notifier,
  ) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus Pengeluaran?'),
        content: Text(
          'Apakah Anda yakin ingin menghapus draft pengeluaran "${expense.displayTitle}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              await notifier.delete();
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status, String label) {
    Color bg;
    Color fg;

    switch (status.toLowerCase()) {
      case 'draft':
        bg = const Color(0xFFF0EDF2);
        fg = const Color(0xFF6B5E60);
        break;
      case 'menunggu_admin':
        bg = const Color(0xFFFDF0DC);
        fg = const Color(0xFF9A5A0A);
        break;
      case 'menunggu_finance':
        bg = const Color(0xFFEDE4F8);
        fg = const Color(0xFF5E2796);
        break;
      case 'disetujui':
      case 'siap_dibayar':
        bg = const Color(0xFFE8F0FE);
        fg = const Color(0xFF1967D2);
        break;
      case 'dibayar':
        bg = const Color(0xFFE6F4EA);
        fg = const Color(0xFF137333);
        break;
      case 'ditolak':
        bg = const Color(0xFFFCE4E7);
        fg = const Color(0xFFB0000F);
        break;
      default:
        bg = const Color(0xFFF0EDF2);
        fg = const Color(0xFF6B5E60);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}

