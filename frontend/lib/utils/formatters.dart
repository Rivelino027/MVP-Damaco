import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static final DateFormat _dateFormatter = DateFormat('dd MMM yyyy', 'id_ID');
  static final DateFormat _timeFormatter = DateFormat('HH:mm', 'id_ID');
  static final DateFormat _dateTimeFormatter = DateFormat('dd MMM yyyy, HH:mm', 'id_ID');
  static final DateFormat _shortDateFormatter = DateFormat('dd/MM/yyyy', 'id_ID');

  static String rupiah(dynamic amount) {
    if (amount == null) return 'Rp -';
    if (amount is String) {
      amount = double.tryParse(amount) ?? 0;
    }
    return _currencyFormatter.format(amount);
  }

  static String compactRupiah(dynamic amount) {
    if (amount == null) return 'Rp -';
    double val = (amount is String) ? double.tryParse(amount) ?? 0 : (amount as num).toDouble();
    if (val >= 1000000000) {
      return 'Rp ${(val / 1000000000).toStringAsFixed(1)} M';
    } else if (val >= 1000000) {
      return 'Rp ${(val / 1000000).toStringAsFixed(1)} Jt';
    } else if (val >= 1000) {
      return 'Rp ${(val / 1000).toStringAsFixed(0)} Rb';
    }
    return rupiah(val);
  }

  static String formatDate(dynamic date) {
    if (date == null) return '-';
    if (date is String) {
      DateTime? dt = DateTime.tryParse(date);
      if (dt != null) return _dateFormatter.format(dt);
      return date;
    }
    if (date is DateTime) return _dateFormatter.format(date);
    return '-';
  }

  static String formatTime(dynamic date) {
    if (date == null) return '-';
    if (date is String) {
      DateTime? dt = DateTime.tryParse(date);
      if (dt != null) return '${_timeFormatter.format(dt)} WIB';
      return date;
    }
    if (date is DateTime) return '${_timeFormatter.format(date)} WIB';
    return '-';
  }

  static String formatDateTime(dynamic date) {
    if (date == null) return '-';
    if (date is String) {
      DateTime? dt = DateTime.tryParse(date);
      if (dt != null) return _dateTimeFormatter.format(dt);
      return date;
    }
    if (date is DateTime) return _dateTimeFormatter.format(date);
    return '-';
  }

  static String formatShortDate(dynamic date) {
    if (date == null) return '-';
    if (date is String) {
      DateTime? dt = DateTime.tryParse(date);
      if (dt != null) return _shortDateFormatter.format(dt);
      return date;
    }
    if (date is DateTime) return _shortDateFormatter.format(date);
    return '-';
  }

  static String formatHours(dynamic hours) {
    if (hours == null) return '0 Jam';
    num val = (hours is String) ? (num.tryParse(hours) ?? 0) : hours;
    if (val == 1) return '1 Jam';
    return '$val Jam';
  }
}

