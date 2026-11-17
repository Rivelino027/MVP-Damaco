import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'app_button.dart';

class ErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final bool isOffline;

  const ErrorState({
    super.key,
    this.title = 'Terjadi Kesalahan',
    this.message = 'Gagal memuat data. Silakan periksa koneksi Anda dan coba lagi.',
    this.onRetry,
    this.isOffline = false,
  });

  factory ErrorState.noConnection({VoidCallback? onRetry}) {
    return ErrorState(
      title: 'Tidak Ada Koneksi',
      message: 'Aplikasi membutuhkan koneksi internet untuk sinkronisasi data.',
      onRetry: onRetry,
      isOffline: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Lingkaran bahaya tint lembut (Sesuai Aturan Desain)
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: AppColors.dangerTint,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  isOffline ? Icons.wifi_off_rounded : Icons.warning_amber_rounded,
                  size: 38,
                  color: AppColors.danger,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppTextStyles.h3.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                text: 'Coba Lagi',
                icon: Icons.refresh_rounded,
                onPressed: onRetry,
                isFullWidth: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

