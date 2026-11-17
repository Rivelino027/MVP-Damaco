import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/timesheet_entry_entity.dart';

class TimesheetEntryCard extends StatelessWidget {
  final TimesheetEntryEntity entry;
  final bool isEditable;
  final ValueChanged<double>? onHoursChanged;
  final VoidCallback? onDelete;

  const TimesheetEntryCard({
    super.key,
    required this.entry,
    this.isEditable = true,
    this.onHoursChanged,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final title = entry.taskTitle ?? 'Task #${entry.taskId}';
    final project = entry.projectName ?? 'Proyek';

    final hoursDisplay = entry.hours % 1 == 0
        ? entry.hours.toInt().toString()
        : entry.hours.toStringAsFixed(1);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Row(
        children: [
          // Nama Task dan Proyek
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.subtitle1.copyWith(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  project,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (entry.note != null && entry.note!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    entry.note!,
                    style: AppTextStyles.caption.copyWith(
                      fontStyle: FontStyle.italic,
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // Kontrol Jam: Stepper (- / +) atau teks jam statis
          if (isEditable)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Tombol Kurang (-)
                _StepperButton(
                  icon: Icons.remove,
                  onTap: () {
                    final newHours = entry.hours - 0.5;
                    if (newHours <= 0) {
                      _confirmDelete(context);
                    } else {
                      onHoursChanged?.call(newHours);
                    }
                  },
                ),
                SizedBox(
                  width: 36,
                  child: Center(
                    child: Text(
                      hoursDisplay,
                      style: AppTextStyles.subtitle1.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                // Tombol Tambah (+)
                _StepperButton(
                  icon: Icons.add,
                  onTap: () {
                    final newHours = entry.hours + 0.5;
                    onHoursChanged?.call(newHours);
                  },
                ),
              ],
            )
          else
            Text(
              '$hoursDisplay jam',
              style: AppTextStyles.subtitle1.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
                fontSize: 14,
              ),
            ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus Jam Kerja?'),
        content: Text(
          'Jam kerja untuk "${entry.taskTitle ?? 'Task'}" akan dihapus dari hari ini.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogCtx);
              onDelete?.call();
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _StepperButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFE5E0EC), // Lavender pastel
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(
            icon,
            size: 18,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}

