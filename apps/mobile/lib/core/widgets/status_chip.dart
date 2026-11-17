import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

class StatusChip extends StatelessWidget {
  final String status;
  final String? customLabel;
  final bool isLargeAmount;

  const StatusChip({
    super.key,
    required this.status,
    this.customLabel,
    this.isLargeAmount = false,
  });

  factory StatusChip.largeAmount() {
    return const StatusChip(
      status: 'nominal_besar',
      isLargeAmount: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLargeAmount || status.toLowerCase() == 'nominal_besar') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.warningTint,
          borderRadius: AppSpacing.roundedPill,
          border: Border.all(color: AppColors.warningBorder, width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.flag_rounded,
              size: 13,
              color: AppColors.warningText,
            ),
            const SizedBox(width: 4),
            Text(
              'Nominal Besar',
              style: AppTextStyles.chip.copyWith(
                color: AppColors.warningText,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    final normalized = status.toLowerCase().replaceAll(' ', '_');
    Color bg;
    Color fg;
    String label;
    IconData? icon;

    switch (normalized) {
      // Task Statuses
      case 'belum_mulai':
        bg = AppColors.taskNotStartedBg;
        fg = AppColors.taskNotStartedFg;
        label = 'Belum Mulai';
        break;
      case 'dikerjakan':
        bg = AppColors.taskInProgressBg;
        fg = AppColors.taskInProgressFg;
        label = 'Dikerjakan';
        break;
      case 'review':
        bg = AppColors.taskReviewBg;
        fg = AppColors.taskReviewFg;
        label = 'Review';
        break;
      case 'selesai':
        bg = AppColors.taskCompletedBg;
        fg = AppColors.taskCompletedFg;
        label = 'Selesai';
        icon = Icons.check_rounded;
        break;

      // Timesheet Statuses
      case 'draft':
        bg = const Color(0xFFEDE4F8);
        fg = const Color(0xFF5E2796);
        label = 'Draft';
        break;
      case 'menunggu_admin':
        bg = AppColors.warningTint;
        fg = AppColors.warningText;
        label = 'Menunggu Admin';
        icon = Icons.hourglass_top_rounded;
        break;
      case 'menunggu_finance':
        bg = AppColors.warningTint;
        fg = AppColors.warningText;
        label = 'Menunggu Finance';
        icon = Icons.hourglass_top_rounded;
        break;
      case 'disetujui':
        bg = AppColors.successTint;
        fg = AppColors.success;
        label = 'Disetujui';
        icon = Icons.check_circle_rounded;
        break;
      case 'ditolak':
        // Aturan: status bahaya selalu tint + teks bahaya + ikon penanda
        bg = AppColors.dangerTint;
        fg = AppColors.danger;
        label = 'Ditolak';
        icon = Icons.cancel_rounded;
        break;
      case 'siap_dibayar':
        bg = const Color(0xFFE8F1FD);
        fg = const Color(0xFF0A47B8);
        label = 'Siap Dibayar';
        icon = Icons.payments_outlined;
        break;
      case 'dibayar':
        bg = AppColors.successTint;
        fg = AppColors.success;
        label = 'Dibayar';
        icon = Icons.check_circle_rounded;
        break;

      default:
        bg = AppColors.taskNotStartedBg;
        fg = AppColors.taskNotStartedFg;
        label = customLabel ?? status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppSpacing.roundedPill,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            customLabel ?? label,
            style: AppTextStyles.chip.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

