import 'package:flutter/material.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/gradient_card.dart';

class WeeklyTargetCard extends StatelessWidget {
  final double filledHours;
  final double targetHours;
  final VoidCallback onFillTimesheet;

  const WeeklyTargetCard({
    super.key,
    required this.filledHours,
    this.targetHours = 40.0,
    required this.onFillTimesheet,
  });

  @override
  Widget build(BuildContext context) {
    final remaining = (targetHours - filledHours).clamp(0, targetHours).toInt();
    final filledInt = filledHours.toInt();
    final targetInt = targetHours.toInt();
    final progress = targetHours > 0 ? (filledHours / targetHours).clamp(0.0, 1.0) : 0.0;

    return GradientCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Row(
        children: [
          // Sisi Kiri: Teks & Tombol Aksi
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'TARGET MINGGUAN',
                  style: AppTextStyles.caption.copyWith(
                    color: Colors.white70,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.1,
                    fontSize: 10.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Teruskan Ritmemu!',
                  style: AppTextStyles.h3.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Kamu tinggal $remaining jam lagi untuk minggu ini.',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Colors.white.withAlpha(210),
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 14),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onFillTimesheet,
                    borderRadius: AppSpacing.roundedPill,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(45),
                        borderRadius: AppSpacing.roundedPill,
                        border: Border.all(
                          color: Colors.white.withAlpha(75),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Isi Timesheet',
                            style: AppTextStyles.button.copyWith(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            size: 15,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),

          // Sisi Kanan: Circular Progress Ring
          SizedBox(
            width: 86,
            height: 86,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Track Background Lingkaran
                SizedBox(
                  width: 86,
                  height: 86,
                  child: CircularProgressIndicator(
                    value: 1.0,
                    strokeWidth: 7,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.white.withAlpha(35),
                    ),
                  ),
                ),
                // Indikator Progress Aktif
                SizedBox(
                  width: 86,
                  height: 86,
                  child: CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 7,
                    strokeCap: StrokeCap.round,
                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
                // Angka & Label di Tengah
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$filledInt',
                      style: AppTextStyles.h2.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 21,
                        height: 1.1,
                      ),
                    ),
                    Text(
                      'dari $targetInt jam',
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white70,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

