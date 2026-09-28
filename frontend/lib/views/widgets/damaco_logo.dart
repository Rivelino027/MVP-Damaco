import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class DamacoLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final TextStyle? textStyle;
  final Color? textColor;

  const DamacoLogo({
    super.key,
    this.size = 36,
    this.showText = false,
    this.textStyle,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final logoImage = Image.asset(
      'assets/images/damaco_logo.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        // Fallback custom painted logo matching DAMACO branding
        return Container(
          width: size,
          height: size,
          padding: EdgeInsets.all(size * 0.15),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.primary, width: 2),
            boxShadow: const [
              BoxShadow(color: Color(0x1A000000), blurRadius: 8, offset: Offset(0, 2)),
            ],
          ),
          child: CustomPaint(
            size: Size(size, size),
            painter: _DamacoLogoPainter(),
          ),
        );
      },
    );

    if (!showText) return logoImage;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        logoImage,
        const SizedBox(width: 10),
        Text(
          'DAMACO',
          style: textStyle ??
              TextStyle(
                fontSize: size * 0.7,
                fontWeight: FontWeight.bold,
                color: textColor ?? AppColors.textPrimary,
                letterSpacing: 1.2,
              ),
        ),
      ],
    );
  }
}

class _DamacoLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Left Oval Wing (Blue)
    final bluePaint = Paint()
      ..color = const Color(0xFF2563EB)
      ..style = PaintingStyle.fill;

    final leftPath = Path()
      ..moveTo(w * 0.3, 0)
      ..cubicTo(0, 0, 0, h, w * 0.3, h)
      ..close();
    canvas.drawPath(leftPath, bluePaint);

    // Right Oval Wing (Red)
    final redPaint = Paint()
      ..color = const Color(0xFFDC2626)
      ..style = PaintingStyle.fill;

    final rightPath = Path()
      ..moveTo(w * 0.7, 0)
      ..cubicTo(w, 0, w, h, w * 0.7, h)
      ..close();
    canvas.drawPath(rightPath, redPaint);

    // Center Monogram 'M' Outline (Navy/Blue)
    final strokePaint = Paint()
      ..color = const Color(0xFF1E3A8A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.08;

    final centerPath = Path()
      ..moveTo(w * 0.38, h * 0.9)
      ..lineTo(w * 0.38, h * 0.1)
      ..lineTo(w * 0.5, h * 0.35)
      ..lineTo(w * 0.62, h * 0.1)
      ..lineTo(w * 0.62, h * 0.9);
    canvas.drawPath(centerPath, strokePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
