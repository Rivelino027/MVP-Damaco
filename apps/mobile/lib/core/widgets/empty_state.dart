import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'app_button.dart';

class EmptyState extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final String? actionText;
  final VoidCallback? onActionPressed;
  final double iconSize;

  const EmptyState({
    super.key,
    this.title = 'Belum Ada Data',
    String? message,
    String description = 'Data akan muncul di sini setelah Anda menambahkannya.',
    this.icon = Icons.inbox_outlined,
    this.actionText,
    this.onActionPressed,
    this.iconSize = 44.0,
  }) : description = message ?? description;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Lingkaran visual bernuansa ungu lembut
            Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(
                color: Color(0xFFEDE4F8),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  icon,
                  size: iconSize,
                  color: AppColors.primary,
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
              description,
              textAlign: TextAlign.center,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            if (actionText != null && onActionPressed != null) ...[
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                text: actionText!,
                onPressed: onActionPressed,
                isFullWidth: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

