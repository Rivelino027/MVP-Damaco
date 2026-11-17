import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class RupiahInputFormatter extends TextInputFormatter {
  final NumberFormat _formatter = NumberFormat('#,###', 'id_ID');

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    // Ambil hanya digit angka
    final cleanDigits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleanDigits.isEmpty) {
      return newValue.copyWith(text: '');
    }

    final number = int.tryParse(cleanDigits);
    if (number == null) {
      return oldValue;
    }

    final formatted = _formatter.format(number);

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  /// Ekstraksi nilai numeric (double) dari teks berformat ribuan
  static double parse(String text) {
    final clean = text.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.isEmpty) return 0.0;
    return double.tryParse(clean) ?? 0.0;
  }

  /// Format angka integer/double menjadi string ribuan gaya Indonesia (e.g. 6.200.000)
  static String format(num value) {
    final formatter = NumberFormat('#,###', 'id_ID');
    return formatter.format(value.toInt());
  }
}

