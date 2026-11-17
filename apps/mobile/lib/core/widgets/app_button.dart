import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

enum AppButtonVariant {
  primary,
  secondary,
  outline,
  reject, // Tombol Tolak: putih, border abu-abu, teks merah tua, ikon X
  text,
}

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;
  final double height;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.height = 48.0,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onPressed != null && !isLoading;

    Color backgroundColor;
    Color foregroundColor;
    BorderSide? borderSide;

    switch (variant) {
      case AppButtonVariant.primary:
        backgroundColor = isEnabled ? AppColors.primary : AppColors.primary.withAlpha(128);
        foregroundColor = Colors.white;
        borderSide = null;
        break;

      case AppButtonVariant.secondary:
        backgroundColor = Colors.white;
        foregroundColor = isEnabled ? AppColors.textPrimary : AppColors.textMuted;
        borderSide = const BorderSide(color: AppColors.border, width: 1);
        break;

      case AppButtonVariant.outline:
        backgroundColor = Colors.transparent;
        foregroundColor = isEnabled ? AppColors.primary : AppColors.textMuted;
        borderSide = BorderSide(
          color: isEnabled ? AppColors.primary : AppColors.border,
          width: 1.5,
        );
        break;

      case AppButtonVariant.reject:
        // Sesuai aturan: Putih, border abu-abu, teks merah tua, ikon X
        backgroundColor = Colors.white;
        foregroundColor = isEnabled ? AppColors.danger : AppColors.danger.withAlpha(128);
        borderSide = const BorderSide(color: AppColors.border, width: 1);
        break;

      case AppButtonVariant.text:
        backgroundColor = Colors.transparent;
        foregroundColor = isEnabled ? AppColors.primary : AppColors.textMuted;
        borderSide = null;
        break;
    }

    Widget content;
    if (isLoading) {
      content = SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
        ),
      );
    } else {
      final IconData? effectiveIcon =
          variant == AppButtonVariant.reject ? (icon ?? Icons.close_rounded) : icon;

      content = Row(
        mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (effectiveIcon != null) ...[
            Icon(effectiveIcon, size: 18, color: foregroundColor),
            const SizedBox(width: AppSpacing.sm),
          ],
          Text(
            text,
            style: AppTextStyles.button.copyWith(
              color: foregroundColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      );
    }

    Widget button = Material(
      color: backgroundColor,
      borderRadius: AppSpacing.roundedCard,
      child: InkWell(
        onTap: isEnabled ? onPressed : null,
        borderRadius: AppSpacing.roundedCard,
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: AppSpacing.roundedCard,
            border: borderSide != null ? Border.fromBorderSide(borderSide) : null,
          ),
          alignment: Alignment.center,
          child: content,
        ),
      ),
    );

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}

