import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/priority_chip.dart';
import '../../../../core/widgets/status_chip.dart';
import '../../../tasks/domain/entities/task_entity.dart';

class TaskHorizontalCard extends StatelessWidget {
  final TaskEntity task;
  final VoidCallback onTap;

  const TaskHorizontalCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDueSoon = task.isDueTodayOrOverdue();
    final dueDateText = task.formattedDueDate();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppSpacing.roundedCard,
        child: Container(
          width: 240,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: AppSpacing.roundedCard,
            border: Border.all(color: AppColors.cardBorder, width: 0.9),
            boxShadow: AppSpacing.cardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Bagian Atas: Judul & Priority Chip
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          task.title,
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            fontSize: 13.5,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      PriorityChip(priority: task.priority),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    task.project?.name ?? 'Proyek Tanpa Nama',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 11.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),

              // Bagian Bawah: Status Chip & Tenggat
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  StatusChip(status: task.status),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 11.5,
                        color: isDueSoon ? const Color(0xFFD97706) : AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        dueDateText,
                        style: AppTextStyles.caption.copyWith(
                          fontSize: 11,
                          fontWeight: isDueSoon ? FontWeight.w700 : FontWeight.w500,
                          color: isDueSoon ? const Color(0xFFD97706) : AppColors.textSecondary,
                        ),
                      ),
                    ],
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

