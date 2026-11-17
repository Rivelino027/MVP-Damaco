import 'package:intl/intl.dart';

class CurrencyFormatter {
  CurrencyFormatter._();

  static final NumberFormat _idrFormatNoDecimals = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static final NumberFormat _idrFormatWithDecimals = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 2,
  );

  /// Format angka / string menjadi format Rupiah Indonesia, e.g. "Rp 6.200.000"
  static String formatRupiah(dynamic value, {bool forceDecimals = false}) =>
      format(value, forceDecimals: forceDecimals);

  /// Format angka / string menjadi format Rupiah Indonesia, e.g. "Rp 6.200.000"
  static String format(dynamic value, {bool forceDecimals = false}) {
    if (value == null) return 'Rp 0';

    num numericValue;
    if (value is num) {
      numericValue = value;
    } else if (value is String) {
      final sanitized = value.replaceAll(',', '.').trim();
      numericValue = num.tryParse(sanitized) ?? 0;
    } else {
      return 'Rp 0';
    }

    final hasFractions = (numericValue % 1 != 0);
    if (forceDecimals || hasFractions) {
      return _idrFormatWithDecimals.format(numericValue);
    }
    return _idrFormatNoDecimals.format(numericValue);
  }

  /// Format angka tanpa prefix "Rp ", misal untuk input field: "6.200.000"
  static String formatPlain(dynamic value) {
    if (value == null) return '0';
    num numericValue = 0;
    if (value is num) {
      numericValue = value;
    } else if (value is String) {
      numericValue = num.tryParse(value.replaceAll(',', '.').trim()) ?? 0;
    }
    final formatter = NumberFormat.decimalPattern('id_ID');
    return formatter.format(numericValue);
  }

  /// Parse string Rupiah menjadi double, menghapus "Rp" dan titik
  static double parse(String formatted) {
    final cleaned = formatted
        .replaceAll('Rp', '')
        .replaceAll('.', '')
        .replaceAll(' ', '')
        .replaceAll(',', '.')
        .trim();
    return double.tryParse(cleaned) ?? 0.0;
  }
}

