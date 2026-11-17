import 'package:flutter/material.dart';
import '../theme/app_spacing.dart';

class GradientCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? height;
  final double? width;
  final BorderRadiusGeometry borderRadius;

  const GradientCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.xl),
    this.height,
    this.width,
    this.borderRadius = AppSpacing.roundedCardLarge,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF19062E),
            Color(0xFF2B0B4D),
            Color(0xFF1E0738),
          ],
        ),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Stack(
          children: [
            // Radial Glow Merah/Pink di sudut kanan atas (Signature Design)
            Positioned(
              top: -40,
              right: -30,
              child: Container(
                width: 170,
                height: 170,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Color(0x99FF3366),
                      Color(0x55E8141C),
                      Colors.transparent,
                    ],
                    stops: [0.0, 0.45, 1.0],
                  ),
                ),
              ),
            ),
            // Konten kartu
            Padding(
              padding: padding,
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}
