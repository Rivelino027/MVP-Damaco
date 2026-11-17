import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class OnboardingPage extends ConsumerWidget {
  const OnboardingPage({super.key});

  Future<void> _handleStart(BuildContext context, WidgetRef ref) async {
    final storage = ref.read(secureStorageServiceProvider);
    await storage.setOnboardingSeen(true);
    if (context.mounted) {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF150324),
              Color(0xFF2B0B4D),
              Color(0xFF19062E),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Radial Glow di sudut kanan atas
            Positioned(
              top: -40,
              right: -30,
              child: Container(
                width: 240,
                height: 240,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Color(0x99FF3366),
                      Color(0x44E8141C),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: AppSpacing.xxl),
                    // Header Tag Pill
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(20),
                        borderRadius: AppSpacing.roundedPill,
                        border: Border.all(
                          color: Colors.white.withAlpha(35),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.bar_chart_rounded,
                            size: 18,
                            color: Colors.white,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Text(
                            AppConfig.appName,
                            style: AppTextStyles.subtitle2.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Teks Headline
                    Text(
                      'MANAJEMEN KERJA TERINTEGRASI',
                      style: AppTextStyles.overline.copyWith(
                        color: Colors.white70,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Kerja selesai,\nanggaran\nterkendali',
                      style: AppTextStyles.h1.copyWith(
                        color: Colors.white,
                        fontSize: 34,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Satukan progres, waktu, dan biaya dalam satu alur yang jernih.',
                      style: AppTextStyles.body1.copyWith(
                        color: Colors.white.withAlpha(190),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),
                    // Tombol "Mulai →"
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        key: const Key('onboarding_start_button'),
                        onPressed: () => _handleStart(context, ref),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primary,
                          elevation: 0,
                          shape: const RoundedRectangleBorder(
                            borderRadius: AppSpacing.roundedPill,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Mulai',
                              style: AppTextStyles.button.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
