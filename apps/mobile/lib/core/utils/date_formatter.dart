class DateFormatter {
  DateFormatter._();

  static const Duration _jakartaOffset = Duration(hours: 7);

  /// Konversi DateTime ke Zona Waktu Asia/Jakarta (WIB: UTC+7)
  static DateTime toJakarta(DateTime dateTime) {
    if (dateTime.isUtc) {
      return dateTime.add(_jakartaOffset);
    }
    // Jika tidak ditandai UTC tapi tersimpan dari DB sebagai string UTC
    final utc = dateTime.toUtc();
    return utc.add(_jakartaOffset);
  }

  /// Format lengkap dengan nama hari, contoh: "Jum'at, 09 Oktober 2026"
  static String formatFullDayAndDate(DateTime? dateTime) {
    if (dateTime == null) return '-';
    final jkt = toJakarta(dateTime);
    // Custom handling nama hari Indonesia dengan kutip satu untuk Jum'at
    final dayName = _indonesianDayName(jkt.weekday);
    final monthName = _indonesianMonthName(jkt.month);
    final day = jkt.day.toString().padLeft(2, '0');
    return "$dayName, $day $monthName ${jkt.year}";
  }

  /// Format hari dan tanggal pendek, contoh: "Jum'at, 16 Okt"
  static String formatDayAndShortDate(DateTime? dateTime) {
    if (dateTime == null) return '-';
    final jkt = toJakarta(dateTime);
    final dayName = _indonesianDayName(jkt.weekday);
    final monthShort = _indonesianMonthShort(jkt.month);
    return "$dayName, ${jkt.day} $monthShort";
  }

  /// Format tanggal standar, contoh: "16 Okt 2026"
  static String formatShortDate(DateTime? dateTime) {
    if (dateTime == null) return '-';
    final jkt = toJakarta(dateTime);
    final monthShort = _indonesianMonthShort(jkt.month);
    return "${jkt.day} $monthShort ${jkt.year}";
  }

  /// Format rentang minggu, contoh: "12 - 18 Okt 2026"
  static String formatWeekRange(DateTime start, DateTime end) {
    final startJkt = toJakarta(start);
    final endJkt = toJakarta(end);
    final monthShort = _indonesianMonthShort(endJkt.month);

    if (startJkt.month == endJkt.month && startJkt.year == endJkt.year) {
      return "${startJkt.day} - ${endJkt.day} $monthShort ${endJkt.year}";
    }
    final startMonth = _indonesianMonthShort(startJkt.month);
    return "${startJkt.day} $startMonth - ${endJkt.day} $monthShort ${endJkt.year}";
  }

  /// Format relatif: "Hari Ini", "Besok", "Kemarin", atau tanggal jika lebih jauh
  static String formatRelative(DateTime? dateTime) {
    if (dateTime == null) return '-';
    final jkt = toJakarta(dateTime);
    final nowJkt = toJakarta(DateTime.now());

    final today = DateTime(nowJkt.year, nowJkt.month, nowJkt.day);
    final target = DateTime(jkt.year, jkt.month, jkt.day);
    final diffDays = target.difference(today).inDays;

    if (diffDays == 0) return 'Hari ini';
    if (diffDays == 1) return 'Besok';
    if (diffDays == -1) return 'Kemarin';

    return "${jkt.day} ${_indonesianMonthShort(jkt.month)}";
  }

  /// Format khusus tenggat task ("Hari ini", "Besok", atau "21 Okt 2026")
  static String formatTaskDueDate(DateTime? dateTime, {DateTime? customNow}) {
    if (dateTime == null) return '-';
    final jkt = toJakarta(dateTime);
    final nowJkt = toJakarta(customNow ?? DateTime.now());

    final today = DateTime(nowJkt.year, nowJkt.month, nowJkt.day);
    final target = DateTime(jkt.year, jkt.month, jkt.day);
    final diffDays = target.difference(today).inDays;

    if (diffDays == 0) return 'Hari ini';
    if (diffDays == 1) return 'Besok';
    if (diffDays == -1) return 'Kemarin';

    final monthShort = _indonesianMonthShort(jkt.month);
    return "${jkt.day} $monthShort ${jkt.year}";
  }

  /// Mengecek apakah tenggat waktu sudah jatuh tempo atau hari ini
  static bool isDueTodayOrOverdue(DateTime? dateTime, {DateTime? customNow}) {
    if (dateTime == null) return false;
    final jkt = toJakarta(dateTime);
    final nowJkt = toJakarta(customNow ?? DateTime.now());

    final today = DateTime(nowJkt.year, nowJkt.month, nowJkt.day);
    final target = DateTime(jkt.year, jkt.month, jkt.day);
    return target.compareTo(today) <= 0;
  }

  /// Sapaan ramah berbasis jam saat ini (WIB)
  static String getGreeting({DateTime? customNow}) {
    final jkt = toJakarta(customNow ?? DateTime.now());
    final hour = jkt.hour;

    if (hour >= 4 && hour < 11) {
      return 'Selamat Pagi';
    } else if (hour >= 11 && hour < 15) {
      return 'Selamat Siang';
    } else if (hour >= 15 && hour < 18) {
      return 'Selamat Sore';
    } else {
      return 'Selamat Malam';
    }
  }

  static String _indonesianDayName(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'Senin';
      case DateTime.tuesday:
        return 'Selasa';
      case DateTime.wednesday:
        return 'Rabu';
      case DateTime.thursday:
        return 'Kamis';
      case DateTime.friday:
        return "Jum'at";
      case DateTime.saturday:
        return 'Sabtu';
      case DateTime.sunday:
        return 'Minggu';
      default:
        return '';
    }
  }

  static String _indonesianMonthName(int month) {
    const months = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
    ];
    if (month >= 1 && month <= 12) return months[month];
    return '';
  }

  static String _indonesianMonthShort(int month) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Ags',
      'Sep',
      'Okt',
      'Nov',
      'Des'
    ];
    if (month >= 1 && month <= 12) return months[month];
    return '';
  }
}
