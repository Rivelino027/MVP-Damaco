import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/expense_approval_entity.dart';

class ApprovalTimelineWidget extends StatelessWidget {
  final List<ExpenseApprovalEntity> approvals;
  final String status;

  const ApprovalTimelineWidget({
    super.key,
    required this.approvals,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    if (approvals.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppSpacing.roundedCard,
          border: Border.all(color: AppColors.border),
        ),
        child: Text(
          status == 'draft'
              ? 'Pengeluaran masih berupa draft. Belum diajukan ke rantai persetujuan.'
              : 'Menunggu inisialisasi alur persetujuan Admin & Finance.',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
      );
    }

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
          Text('Riwayat Persetujuan', style: AppTextStyles.h3),
          const SizedBox(height: AppSpacing.md),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: approvals.length,
            separatorBuilder: (_, __) => Padding(
              padding: const EdgeInsets.only(left: 17),
              child: Container(
                width: 2,
                height: 24,
                color: AppColors.border,
              ),
            ),
            itemBuilder: (context, index) {
              final item = approvals[index];
              return _buildTimelineItem(item);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(ExpenseApprovalEntity item) {
    IconData icon;
    Color iconBg;
    Color iconColor;
    String statusText;

    switch (item.status.toLowerCase()) {
      case 'disetujui':
        icon = Icons.check_circle_rounded;
        iconBg = const Color(0xFFE6F4EA);
        iconColor = const Color(0xFF137333);
        statusText = 'Disetujui';
        break;
      case 'ditolak':
        icon = Icons.cancel_rounded;
        iconBg = const Color(0xFFFCE4E7);
        iconColor = const Color(0xFFB0000F);
        statusText = 'Ditolak';
        break;
      default:
        icon = Icons.access_time_rounded;
        iconBg = const Color(0xFFFEF7E0);
        iconColor = const Color(0xFFB06000);
        statusText = 'Menunggu';
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Indikator Ikon Bulat
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconBg,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: AppSpacing.md),

        // Detail Approval
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    item.stepTitle,
                    style: AppTextStyles.subtitle1.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: iconBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: iconColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                item.approverName != null
                    ? 'Oleh: ${item.approverName}'
                    : 'Menunggu review dari peran ${item.role.toUpperCase()}',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
              if (item.actedAt != null) ...[
                const SizedBox(height: 2),
                Text(
                  DateFormatter.formatFullDayAndDate(item.actedAt),
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
              if (item.reason != null && item.reason!.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.dangerTint,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.dangerBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        size: 14,
                        color: AppColors.danger,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          item.reason!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.danger,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

