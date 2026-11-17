import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../domain/entities/approval_item_entity.dart';
import '../../domain/logic/approval_action_evaluator.dart';
import '../providers/approvals_provider.dart';

class ApprovalDetailSheet extends ConsumerStatefulWidget {
  final ApprovalItemEntity item;

  const ApprovalDetailSheet({super.key, required this.item});

  static Future<void> show(BuildContext context, ApprovalItemEntity item) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ApprovalDetailSheet(item: item),
    );
  }

  @override
  ConsumerState<ApprovalDetailSheet> createState() =>
      _ApprovalDetailSheetState();
}

class _ApprovalDetailSheetState extends ConsumerState<ApprovalDetailSheet> {
  bool _isProcessing = false;

  void _showReceiptZoom(BuildContext context, String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            title: const Text(
              'Pratinjau Nota',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ),
          body: Center(
            child: InteractiveViewer(
              panEnabled: true,
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                errorBuilder: (_, __, ___) => const Center(
                  child: Text(
                    'Gagal memuat gambar nota',
                    style: TextStyle(color: Colors.white70),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleApprove() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Setujui Dokumen?'),
        content: Text(
          'Anda akan menyetujui pengajuan "${widget.item.title}". Tindakan ini akan dicatat di log aktivitas.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Setujui', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isProcessing = true);
      HapticFeedback.lightImpact();

      final success = await ref
          .read(approvalsProvider.notifier)
          .approveDocument(widget.item);

      if (mounted) {
        setState(() => _isProcessing = false);
        Navigator.pop(context); // Tutup sheet
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: success ? AppColors.success : AppColors.danger,
            content: Text(
              success
                  ? 'Pengajuan berhasil disetujui'
                  : 'Gagal memproses persetujuan',
            ),
          ),
        );
      }
    }
  }

  Future<void> _handleReject() async {
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final confirmedReason = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Tolak Dokumen'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Alasan penolakan wajib diisi untuk memberi tahu pemohon:',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Contoh: Nota tidak jelas / nominal melebihi kuota',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Alasan wajib diisi';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFCE4E7),
              elevation: 0,
              side: const BorderSide(color: Color(0xFFF5B6BC)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, reasonController.text.trim());
              }
            },
            child: const Text(
              'Tolak Dokumen',
              style: TextStyle(color: Color(0xFFB0000F), fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmedReason != null && confirmedReason.isNotEmpty && mounted) {
      setState(() => _isProcessing = true);
      HapticFeedback.lightImpact();

      final success = await ref
          .read(approvalsProvider.notifier)
          .rejectDocument(widget.item, confirmedReason);

      if (mounted) {
        setState(() => _isProcessing = false);
        Navigator.pop(context); // Tutup sheet
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: success ? AppColors.success : AppColors.danger,
            content: Text(
              success
                  ? 'Pengajuan berhasil ditolak'
                  : 'Gagal memproses penolakan',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final role = user?.role ?? 'admin';
    final item = widget.item;

    final canApprove = ApprovalActionEvaluator.canApprove(
      role: role,
      documentType: item.documentType,
      status: item.status,
    );

    final canReject = ApprovalActionEvaluator.canReject(
      role: role,
      documentType: item.documentType,
      status: item.status,
    );

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: Column(
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Detail Persetujuan',
                      style: AppTextStyles.h2.copyWith(fontSize: 18),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                      tooltip: 'Tutup',
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Content scrollable
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Badge Dokumen & Nominal Besar
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0EDF3),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            item.documentType.displayName,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        if (item.isLargeAmount)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3DC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFFD580)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.warning_amber_rounded,
                                    size: 14, color: Color(0xFFD97706)),
                                SizedBox(width: 4),
                                Text(
                                  'Nominal Besar',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFD97706),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        for (final flag in item.flags)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              flag == 'terindikasi_dipecah'
                                  ? '⚠️ Terindikasi Dipecah'
                                  : '⚠️ Vendor Baru',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFB91C1C),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Judul Dokumen
                    Text(
                      item.title,
                      style: AppTextStyles.h1.copyWith(fontSize: 20),
                    ),
                    const SizedBox(height: 12),

                    // Kartu Nominal / Jam
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9F8FA),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.documentType == ApprovalDocumentType.timesheet
                                ? 'TOTAL JAM KERJA'
                                : 'NOMINAL PENGAJUAN',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                              color: AppColors.textPlaceholder,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.documentType == ApprovalDocumentType.timesheet
                                ? '${item.hours.toStringAsFixed(item.hours.truncateToDouble() == item.hours ? 0 : 1)} Jam'
                                : CurrencyFormatter.formatRupiah(item.amount),
                            style: AppTextStyles.h1.copyWith(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Info Pemohon & Cost Center
                    _buildInfoRow(
                      icon: Icons.person_outline_rounded,
                      label: 'Diajukan Oleh',
                      value: '${item.applicantName} (${item.applicantDepartment})',
                    ),
                    _buildInfoRow(
                      icon: Icons.tag_rounded,
                      label: 'Cost Center',
                      value: item.costCenterCode,
                    ),
                    _buildInfoRow(
                      icon: Icons.calendar_today_outlined,
                      label: 'Tanggal Pengajuan',
                      value: DateFormatter.formatFullDayAndDate(item.submittedAt),
                    ),
                    if (item.vendor != null && item.vendor!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.storefront_outlined,
                        label: 'Vendor',
                        value: item.vendor!,
                      ),
                    if (item.note != null && item.note!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.notes_rounded,
                        label: 'Catatan / Alasan',
                        value: item.note!,
                      ),
                    const SizedBox(height: 16),

                    // Pratinjau Nota (Jika ada)
                    if (item.receiptUrl != null && item.receiptUrl!.isNotEmpty) ...[
                      const Text(
                        'Lampiran Nota',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () => _showReceiptZoom(context, item.receiptUrl!),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Stack(
                            alignment: Alignment.bottomRight,
                            children: [
                              Image.network(
                                item.receiptUrl!,
                                height: 160,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  height: 120,
                                  color: Colors.grey.shade100,
                                  child: const Center(
                                    child: Text('Nota tidak dapat dimuat'),
                                  ),
                                ),
                              ),
                              Container(
                                margin: const EdgeInsets.all(8),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withAlpha(150),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.zoom_in_rounded,
                                        size: 14, color: Colors.white),
                                    SizedBox(width: 4),
                                    Text(
                                      'Perbesar',
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Riwayat Persetujuan
                    const Text(
                      'Riwayat Persetujuan',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (item.history.isEmpty)
                      const Text(
                        'Belum ada riwayat tindakan.',
                        style: TextStyle(fontSize: 12, color: AppColors.textPlaceholder),
                      )
                    else
                      for (final step in item.history)
                        Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9F8FA),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                step.status == 'disetujui'
                                    ? Icons.check_circle_rounded
                                    : Icons.cancel_rounded,
                                size: 18,
                                color: step.status == 'disetujui'
                                    ? AppColors.success
                                    : AppColors.danger,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${step.role.toUpperCase()} • ${step.approverName ?? 'Petugas'}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (step.reason != null && step.reason!.isNotEmpty)
                                      Text(
                                        'Alasan: ${step.reason}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.danger,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // Bottom Action Buttons
              if (canApprove || canReject)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(15),
                        blurRadius: 8,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      if (canReject)
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: const BorderSide(color: Color(0xFFF5B6BC)),
                              backgroundColor: const Color(0xFFFCE4E7),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: _isProcessing ? null : _handleReject,
                            child: const Text(
                              'Tolak',
                              style: TextStyle(
                                color: Color(0xFFB0000F),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      if (canApprove && canReject) const SizedBox(width: 12),
                      if (canApprove)
                        Expanded(
                          child: AppButton(
                            text: 'Setujui',
                            isLoading: _isProcessing,
                            onPressed: _handleApprove,
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textPlaceholder),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textPlaceholder,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
