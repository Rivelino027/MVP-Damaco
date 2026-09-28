import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class ProgressBurnBar extends StatelessWidget {
  final int progressPct;
  final int burnPct;
  final bool isOverburn;

  const ProgressBurnBar({
    super.key,
    required this.progressPct,
    required this.burnPct,
    required this.isOverburn,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle_outline, size: 14, color: AppColors.secondary),
                const SizedBox(width: 4),
                Text(
                  'Progres Pekerjaan: $progressPct%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
              ],
            ),
            Row(
              children: [
                Icon(
                  isOverburn ? Icons.warning_amber_rounded : Icons.account_balance_wallet_outlined,
                  size: 14,
                  color: isOverburn ? AppColors.alertRed : AppColors.success,
                ),
                const SizedBox(width: 4),
                Text(
                  'Serapan Biaya: $burnPct%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isOverburn ? AppColors.alertRed : AppColors.success,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Progress Bar (Work Completed)
        Stack(
          children: [
            Container(
              height: 8,
              decoration: BoxDecoration(
                color: AppColors.darkBackground,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            FractionallySizedBox(
              widthFactor: (progressPct.clamp(0, 100)) / 100,
              child: Container(
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        // Cost Burn Bar
        Stack(
          children: [
            Container(
              height: 8,
              decoration: BoxDecoration(
                color: AppColors.darkBackground,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            FractionallySizedBox(
              widthFactor: (burnPct.clamp(0, 100)) / 100,
              child: Container(
                height: 8,
                decoration: BoxDecoration(
                  color: isOverburn ? AppColors.alertRed : AppColors.success,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ],
        ),
        if (isOverburn) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.alertRedBg,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: AppColors.alertRed.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.report_problem_rounded, size: 14, color: AppColors.alertRed),
                SizedBox(width: 6),
                Text(
                  'PERINGATAN: Serapan biaya melebihi progres fisik!',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.alertRed),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
