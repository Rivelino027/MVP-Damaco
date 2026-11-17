import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/gradient_card.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../../core/widgets/status_chip.dart';
import '../../domain/entities/timesheet_entity.dart';
import '../../../notifications/presentation/widgets/notification_bell_button.dart';
import '../providers/timesheet_provider.dart';
import '../widgets/task_picker_sheet.dart';
import '../widgets/timesheet_bar_chart.dart';
import '../widgets/timesheet_entry_card.dart';

class TimesheetPage extends ConsumerWidget {
  const TimesheetPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timesheetAsync = ref.watch(timesheetProvider);
    final selectedDayIndex = ref.watch(selectedDayIndexProvider);
    final notifier = ref.read(timesheetProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Timesheet',
                    style: AppTextStyles.h1.copyWith(fontSize: 24),
                  ),
                  const NotificationBellButton(
                    color: AppColors.primary,
                    iconSize: 26,
                  ),
                ],
              ),
            ),

            // Content Area with 4 States
            Expanded(
              child: timesheetAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: SkeletonList(itemCount: 4),
                ),
                error: (error, _) => ErrorState(
                  message: error is AppException
                      ? error.message
                      : error.toString(),
                  onRetry: () => notifier.refresh(),
                ),
                data: (timesheet) {
                  return _buildTimesheetContent(
                    context,
                    ref,
                    timesheet,
                    selectedDayIndex,
                    notifier,
                  );
                },
              ),
            ),
          ],
        ),
      ),
      // Tombol Ajukan Timesheet melayang di atas floating navigation bar
      bottomNavigationBar: timesheetAsync.maybeWhen(
        data: (timesheet) {
          if (!timesheet.isEditable) {
            return const SizedBox.shrink();
          }

          return Container(
            color: AppColors.background,
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xs,
              AppSpacing.lg,
              88, // Tepat di atas floating pill nav
            ),
            child: AppButton(
              text: 'Ajukan Timesheet',
              onPressed: timesheet.canSubmit
                  ? () => _confirmSubmitTimesheet(context, timesheet, notifier)
                  : null,
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }

  Widget _buildTimesheetContent(
    BuildContext context,
    WidgetRef ref,
    TimesheetEntity timesheet,
    int selectedDayIndex,
    TimesheetNotifier notifier,
  ) {
    final selectedDate = timesheet.weekStart.add(Duration(days: selectedDayIndex));
    final entries = timesheet.entriesForDate(selectedDate);

    return RefreshIndicator(
      onRefresh: () => notifier.refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          bottom: 40,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Navigasi Minggu (< Tanggal > + Status Chip)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded),
                  onPressed: () => notifier.previousWeek(),
                ),
                Column(
                  children: [
                    Text(
                      timesheet.weekRangeLabel,
                      style: AppTextStyles.subtitle1.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    StatusChip(status: timesheet.status),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: () => notifier.nextWeek(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),

            // 2. Banner Status Khusus (Ditolak, Disetujui, Menunggu Admin)
            if (timesheet.status == 'ditolak') ...[
              _buildRejectedBanner(timesheet.rejectReason),
              const SizedBox(height: AppSpacing.md),
            ] else if (timesheet.status == 'disetujui') ...[
              _buildApprovedBanner(),
              const SizedBox(height: AppSpacing.md),
            ] else if (timesheet.status == 'menunggu_admin') ...[
              _buildPendingBanner(),
              const SizedBox(height: AppSpacing.md),
            ],

            // 3. Kartu Target Mingguan (Gradient Card)
            GradientCard(
              child: Row(
                children: [
                  // Progress Ring
                  _buildProgressRing(timesheet),
                  const SizedBox(width: AppSpacing.lg),
                  // Keterangan Target
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total Minggu Ini',
                          style: AppTextStyles.h3.copyWith(
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          timesheet.isTargetReached
                              ? 'Target tercapai'
                              : 'Kamu tinggal ${_formatHours(timesheet.remainingHours)} jam lagi untuk minggu ini.',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white.withAlpha(200),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 4. Grafik Batang Jam Per Hari
            TimesheetBarChart(
              timesheet: timesheet,
              selectedDayIndex: selectedDayIndex,
              onSelectDay: (index) => notifier.selectDay(index),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 5. Header Daftar Entri Hari Terpilih ("Kamis, 15 Okt" + Tombol "+ Tambah")
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormatter.formatDayAndShortDate(selectedDate),
                  style: AppTextStyles.h3,
                ),
                if (timesheet.isEditable)
                  OutlinedButton.icon(
                    onPressed: () => _openTaskPicker(context, selectedDate, notifier),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Tambah'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      shape: const RoundedRectangleBorder(
                        borderRadius: AppSpacing.roundedPill,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // 6. Daftar Entri Jam Kerja Hari Terpilih / Empty State
            if (entries.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                child: EmptyState(
                  title: 'Belum ada entri',
                  description: 'Tambahkan jam kerja untuk hari ini.',
                  icon: Icons.check_circle_rounded,
                ),
              )
            else
              ...entries.map(
                (entry) => TimesheetEntryCard(
                  key: ValueKey(entry.id ?? '${entry.taskId}-${entry.workDate}'),
                  entry: entry,
                  isEditable: timesheet.isEditable,
                  onHoursChanged: (newHours) async {
                    try {
                      await notifier.updateEntryHours(entry.id!, newHours);
                    } on AppException catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.message)),
                        );
                      }
                    }
                  },
                  onDelete: () {
                    notifier.deleteEntry(entry.id!);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressRing(TimesheetEntity timesheet) {
    final progress =
        (timesheet.totalHours / timesheet.targetHours).clamp(0.0, 1.0);

    return SizedBox(
      width: 68,
      height: 68,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress,
            strokeWidth: 5,
            backgroundColor: Colors.white.withAlpha(40),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _formatHours(timesheet.totalHours),
                style: AppTextStyles.h2.copyWith(
                  color: Colors.white,
                  fontSize: 18,
                ),
              ),
              Text(
                'dari 40 jam',
                style: AppTextStyles.caption.copyWith(
                  color: Colors.white70,
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRejectedBanner(String? reason) {
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
                  'Ditolak oleh Admin',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.danger,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  reason ?? 'Jam kerja perlu diperbaiki.',
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

  Widget _buildApprovedBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F4EA), // Hijau pastel
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCEEAD6)),
      ),
      child: const Row(
        children: [
          Icon(
            Icons.check_circle_outline_rounded,
            size: 18,
            color: Color(0xFF137333),
          ),
          SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Disetujui oleh Admin. Entri terkunci.',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFF137333),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF7E0), // Oranye/kuning pastel
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFEEFC3)),
      ),
      child: const Row(
        children: [
          Icon(
            Icons.access_time_rounded,
            size: 18,
            color: Color(0xFFB06000),
          ),
          SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Sedang menunggu persetujuan Admin. Entri terkunci.',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: Color(0xFFB06000),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatHours(double hours) {
    return hours % 1 == 0 ? hours.toInt().toString() : hours.toStringAsFixed(1);
  }

  void _openTaskPicker(
    BuildContext context,
    DateTime workDate,
    TimesheetNotifier notifier,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TaskPickerSheet(
        workDate: workDate,
        onSave: ({
          required String taskId,
          required DateTime workDate,
          required double hours,
          String? note,
          String? taskTitle,
          String? projectName,
        }) async {
          await notifier.addEntry(
            taskId: taskId,
            workDate: workDate,
            hours: hours,
            note: note,
            taskTitle: taskTitle,
            projectName: projectName,
          );
        },
      ),
    );
  }

  void _confirmSubmitTimesheet(
    BuildContext context,
    TimesheetEntity timesheet,
    TimesheetNotifier notifier,
  ) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Ajukan Timesheet?'),
        content: Text(
          'Ajukan timesheet minggu ini (${timesheet.weekRangeLabel}) dengan total ${_formatHours(timesheet.totalHours)} jam kerja ke Admin?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                await notifier.submitTimesheet();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Timesheet berhasil diajukan ke Admin.'),
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
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
            child: const Text('Ya, Ajukan'),
          ),
        ],
      ),
    );
  }
}
