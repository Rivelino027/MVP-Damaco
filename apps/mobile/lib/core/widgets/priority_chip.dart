import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

class PriorityChip extends StatelessWidget {
  final String priority;

  const PriorityChip({
    super.key,
    required this.priority,
  });

  @override
  Widget build(BuildContext context) {
    final normalized = priority.toLowerCase();
    Color bg;
    Color fg;
    String label;

    switch (normalized) {
      case 'tinggi':
      case 'high':
        bg = AppColors.priorityHighBg;
        fg = AppColors.priorityHighFg;
        label = 'Tinggi';
        break;
      case 'sedang':
      case 'medium':
        bg = AppColors.priorityMediumBg;
        fg = AppColors.priorityMediumFg;
        label = 'Sedang';
        break;
      case 'rendah':
      case 'low':
      default:
        bg = AppColors.priorityLowBg;
        fg = AppColors.priorityLowFg;
        label = 'Rendah';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppSpacing.roundedPill,
      ),
      child: Text(
        label,
        style: AppTextStyles.chip.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
      ),
    );
  }
}

