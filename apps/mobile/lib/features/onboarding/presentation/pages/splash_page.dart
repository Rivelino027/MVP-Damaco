import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:damacoflow/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    _navigateNext();
  }

  Future<void> _navigateNext() async {
    // Memberikan jeda splash animasi singkat
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    final storage = ref.read(secureStorageServiceProvider);
    final onboardingSeen = await storage.getOnboardingSeen();

    if (!mounted) return;

    // Jika pengguna baru pertama kali membuka app: tampilkan Onboarding
    if (!onboardingSeen) {
      context.go(AppRoutes.onboarding);
      return;
    }

    final authState = ref.read(authProvider);
    if (authState.isAuthenticated) {
      if (authState.mustChangePassword) {
        context.go(AppRoutes.changePassword);
      } else {
        context.go(AppRoutes.dashboard);
      }
    } else {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
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
            // Signature Radial Glow di pojok kanan atas
            Positioned(
              top: -60,
              right: -50,
              child: Container(
                width: 260,
                height: 260,
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
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo / Ikon Chart Bar
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(25),
                      borderRadius: AppSpacing.roundedCardLarge,
                      border: Border.all(
                        color: Colors.white.withAlpha(40),
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.bar_chart_rounded,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    AppConfig.appName,
                    style: AppTextStyles.h1.copyWith(
                      color: Colors.white,
                      fontSize: 28,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Kerja selesai, anggaran terkendali',
                    style: AppTextStyles.body2.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Text(
                'Rencanakan • Kerjakan • Kendalikan',
                textAlign: TextAlign.center,
                style: AppTextStyles.caption.copyWith(
                  color: Colors.white38,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
