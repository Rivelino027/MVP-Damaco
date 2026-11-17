import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class DashboardKpiCard extends StatelessWidget {
  final int count;
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;

  const DashboardKpiCard({
    super.key,
    required this.count,
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder, width: 0.9),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '$count',
                style: AppTextStyles.h2.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  color: AppColors.textPrimary,
                ),
              ),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  size: 16,
                  color: iconColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class DashboardKpiRow extends StatelessWidget {
  final int activeTasksCount;
  final int dueTasksCount;
  final int pendingApprovalsCount;

  const DashboardKpiRow({
    super.key,
    required this.activeTasksCount,
    required this.dueTasksCount,
    required this.pendingApprovalsCount,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: DashboardKpiCard(
            count: activeTasksCount,
            label: 'Task Aktif',
            icon: Icons.check_circle_rounded,
            iconColor: const Color(0xFF6B26B2),
            iconBgColor: const Color(0xFFEFE8FC),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: DashboardKpiCard(
            count: dueTasksCount,
            label: 'Jatuh Tempo',
            icon: Icons.calendar_month_rounded,
            iconColor: const Color(0xFFD32F2F),
            iconBgColor: const Color(0xFFFDE8EC),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: DashboardKpiCard(
            count: pendingApprovalsCount,
            label: 'Menunggu',
            icon: Icons.assignment_outlined,
            iconColor: const Color(0xFFD97706),
            iconBgColor: const Color(0xFFFEF3E6),
          ),
        ),
      ],
    );
  }
}

