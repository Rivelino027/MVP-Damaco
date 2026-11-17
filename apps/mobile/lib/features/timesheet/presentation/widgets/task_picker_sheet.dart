import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../tasks/domain/entities/task_entity.dart';
import '../../../tasks/presentation/providers/tasks_provider.dart';

class TaskPickerSheet extends ConsumerStatefulWidget {
  final DateTime workDate;
  final Function({
    required String taskId,
    required DateTime workDate,
    required double hours,
    String? note,
    String? taskTitle,
    String? projectName,
  }) onSave;

  const TaskPickerSheet({
    super.key,
    required this.workDate,
    required this.onSave,
  });

  @override
  ConsumerState<TaskPickerSheet> createState() => _TaskPickerSheetState();
}

class _TaskPickerSheetState extends ConsumerState<TaskPickerSheet> {
  TaskEntity? _selectedTask;
  double _hours = 4.0;
  final TextEditingController _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(taskListProvider);

    return Container(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar sheet
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Tambah Jam Kerja', style: AppTextStyles.h2),
                      const SizedBox(height: 2),
                      Text(
                        DateFormatter.formatDayAndShortDate(widget.workDate),
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Pemilih Task
              Text('Pilih Task', style: AppTextStyles.subtitle2),
              const SizedBox(height: AppSpacing.xs),
              tasksAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (err, _) => Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.dangerTint,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.dangerBorder),
                  ),
                  child: Text(
                    'Gagal memuat task: $err',
                    style: const TextStyle(color: AppColors.danger, fontSize: 13),
                  ),
                ),
                data: (tasks) {
                  if (tasks.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Text(
                        'Tidak ada task yang ditugaskan kepada Anda saat ini.',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    );
                  }

                  // Default select task pertama jika belum dipilih
                  _selectedTask ??= tasks.first;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(12),
                      color: AppColors.cardBackground,
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<TaskEntity>(
                        isExpanded: true,
                        value: _selectedTask,
                        items: tasks.map((task) {
                          return DropdownMenuItem<TaskEntity>(
                            value: task,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  task.title,
                                  style: AppTextStyles.subtitle1.copyWith(fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (task.project != null)
                                  Text(
                                    task.project!.name,
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedTask = val;
                            });
                          }
                        },
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              // Durasi Jam Kerja (Stepper)
              Text('Durasi Jam Kerja', style: AppTextStyles.subtitle2),
              const SizedBox(height: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.cardBackground,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline_rounded),
                      color: _hours > 0.5 ? AppColors.primary : AppColors.textSecondary,
                      onPressed: _hours > 0.5
                          ? () {
                              setState(() {
                                _hours -= 0.5;
                              });
                            }
                          : null,
                    ),
                    Text(
                      '${_hours % 1 == 0 ? _hours.toInt() : _hours.toStringAsFixed(1)} Jam',
                      style: AppTextStyles.h3.copyWith(color: AppColors.primary),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline_rounded),
                      color: _hours < 24.0 ? AppColors.primary : AppColors.textSecondary,
                      onPressed: _hours < 24.0
                          ? () {
                              setState(() {
                                _hours += 0.5;
                              });
                            }
                          : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Catatan Opsional
              Text('Catatan (Opsional)', style: AppTextStyles.subtitle2),
              const SizedBox(height: AppSpacing.xs),
              AppTextField(
                controller: _noteController,
                hint: 'Contoh: Penyesuaian port switch dan testing',
                maxLines: 2,
              ),
              const SizedBox(height: AppSpacing.xl),

              // Tombol Simpan
              AppButton(
                text: 'Simpan Jam Kerja',
                isLoading: _isSubmitting,
                onPressed: _selectedTask == null
                    ? null
                    : () async {
                        final navigator = Navigator.of(context);
                        setState(() {
                          _isSubmitting = true;
                        });
                        try {
                          await widget.onSave(
                            taskId: _selectedTask!.id,
                            workDate: widget.workDate,
                            hours: _hours,
                            note: _noteController.text.trim().isEmpty
                                ? null
                                : _noteController.text.trim(),
                            taskTitle: _selectedTask!.title,
                            projectName: _selectedTask!.project?.name,
                          );
                          navigator.pop();
                        } finally {
                          if (mounted) {
                            setState(() {
                              _isSubmitting = false;
                            });
                          }
                        }
                      },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

