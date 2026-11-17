import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../utils/currency_formatter.dart';

class AmountText extends StatelessWidget {
  final dynamic amount;
  final TextStyle? style;
  final Color? color;
  final double? fontSize;
  final FontWeight? fontWeight;
  final bool forceDecimals;
  final String? prefix;

  const AmountText({
    super.key,
    required this.amount,
    this.style,
    this.color,
    this.fontSize,
    this.fontWeight,
    this.forceDecimals = false,
    this.prefix,
  });

  @override
  Widget build(BuildContext context) {
    final formatted = CurrencyFormatter.format(amount, forceDecimals: forceDecimals);
    final text = prefix != null ? '$prefix $formatted' : formatted;

    final defaultStyle = AppTextStyles.amountMedium.copyWith(
      color: color ?? AppColors.textPrimary,
      fontSize: fontSize,
      fontWeight: fontWeight,
    );

    return Text(
      text,
      style: style != null ? defaultStyle.merge(style) : defaultStyle,
    );
  }
}

