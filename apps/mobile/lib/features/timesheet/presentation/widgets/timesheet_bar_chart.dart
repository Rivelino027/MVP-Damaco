import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/timesheet_entity.dart';

class TimesheetBarChart extends StatelessWidget {
  final TimesheetEntity timesheet;
  final int selectedDayIndex;
  final ValueChanged<int> onSelectDay;

  const TimesheetBarChart({
    super.key,
    required this.timesheet,
    required this.selectedDayIndex,
    required this.onSelectDay,
  });

  static const List<String> _dayNames = [
    'Sen',
    'Sel',
    'Rab',
    'Kam',
    'Jum',
    'Sab',
    'Min',
  ];

  @override
  Widget build(BuildContext context) {
    // Cek apakah ada entri di akhir pekan (Sabtu / Minggu)
    final hasWeekendEntries = timesheet.entries.any((e) {
      final jkt = DateFormatter.toJakarta(e.workDate);
      return jkt.weekday == DateTime.saturday || jkt.weekday == DateTime.sunday;
    });

    final int dayCount = hasWeekendEntries ? 7 : 5;
    const double barHeight = 82.0;

    return Container(
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.lg,
        horizontal: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(dayCount, (index) {
          final isSelected = selectedDayIndex == index;
          final dayDate = timesheet.weekStart.add(Duration(days: index));
          final double dayHours = timesheet.totalHoursForDate(dayDate);

          // Format angka jam di atas batang (misal: 8, 7, 5, atau kosong jika 0)
          String hoursText = '';
          if (dayHours > 0) {
            hoursText = dayHours % 1 == 0
                ? dayHours.toInt().toString()
                : dayHours.toStringAsFixed(1);
          }

          // Rasio pengisian terhadap target standar 8 jam/hari (maks 1.0)
          final double fillFraction = (dayHours / 8.0).clamp(0.0, 1.0);

          final double barWidth = dayCount == 7 ? 38.0 : 46.0;

          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onSelectDay(index),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Angka Jam di Atas Batang
                SizedBox(
                  height: 18,
                  child: Center(
                    child: Text(
                      hoursText,
                      style: AppTextStyles.captionBold.copyWith(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 6),

                // Batang Progres
                Container(
                  width: barWidth,
                  height: barHeight,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E0EC), // Track abu-lavender
                    borderRadius: BorderRadius.circular(12),
                    border: (isSelected && dayHours == 0)
                        ? Border.all(color: AppColors.primary, width: 1.5)
                        : null,
                  ),
                  child: Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      if (dayHours > 0)
                        Container(
                          width: barWidth,
                          height: (barHeight * fillFraction).clamp(12.0, barHeight),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary // Gelap pekat saat dipilih
                                : const Color(0xFF533E6E), // Ungu sedang
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Nama Hari (Sen, Sel, Rab, Kam, Jum)
                Text(
                  _dayNames[index],
                  style: AppTextStyles.caption.copyWith(
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

