import 'dart:math';
import '../../../../core/utils/date_formatter.dart';
import 'timesheet_entry_entity.dart';

class TimesheetEntity {
  final String id;
  final String userId;
  final DateTime weekStart; // Selalu hari Senin
  final String status; // 'draft', 'menunggu_admin', 'disetujui', 'ditolak'
  final String? rejectReason;
  final DateTime? submittedAt;
  final String? approvedBy;
  final DateTime? approvedAt;
  final List<TimesheetEntryEntity> entries;

  const TimesheetEntity({
    required this.id,
    required this.userId,
    required this.weekStart,
    required this.status,
    this.rejectReason,
    this.submittedAt,
    this.approvedBy,
    this.approvedAt,
    this.entries = const [],
  });

  factory TimesheetEntity.fromJson(Map<String, dynamic> json) {
    DateTime parsedWeekStart;
    if (json['weekStart'] != null) {
      parsedWeekStart =
          DateTime.tryParse(json['weekStart'].toString()) ?? DateTime.now();
    } else {
      parsedWeekStart = DateTime.now();
    }

    final entries = <TimesheetEntryEntity>[];
    if (json['entries'] is List) {
      for (final item in json['entries']) {
        if (item is Map<String, dynamic>) {
          entries.add(TimesheetEntryEntity.fromJson(item));
        }
      }
    }

    return TimesheetEntity(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      weekStart: parsedWeekStart,
      status: json['status']?.toString() ?? 'draft',
      rejectReason: json['rejectReason']?.toString(),
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString())
          : null,
      approvedBy: json['approvedBy']?.toString(),
      approvedAt: json['approvedAt'] != null
          ? DateTime.tryParse(json['approvedAt'].toString())
          : null,
      entries: entries,
    );
  }

  Map<String, dynamic> toJson() {
    final weekStartStr =
        "${weekStart.year.toString().padLeft(4, '0')}-${weekStart.month.toString().padLeft(2, '0')}-${weekStart.day.toString().padLeft(2, '0')}";

    return {
      'id': id,
      'userId': userId,
      'weekStart': weekStartStr,
      'status': status,
      if (rejectReason != null) 'rejectReason': rejectReason,
      'entries': entries.map((e) => e.toJson()).toList(),
    };
  }

  /// Hari Minggu dari minggu ini
  DateTime get weekEnd => weekStart.add(const Duration(days: 6));

  /// Label rentang minggu, contoh: "12 - 18 Okt 2026"
  String get weekRangeLabel => DateFormatter.formatWeekRange(weekStart, weekEnd);

  /// Total jam minggu ini (kalkulasi lokal dari entri untuk tampilan UI)
  double get totalHours {
    double sum = 0.0;
    for (final e in entries) {
      sum += e.hours;
    }
    return sum;
  }

  double get targetHours => 40.0;

  double get remainingHours => max(0.0, targetHours - totalHours);

  bool get isTargetReached => totalHours >= targetHours;

  /// Dapat diubah bila berstatus draft atau ditolak
  bool get isEditable => status == 'draft' || status == 'ditolak';

  /// Tombol Ajukan aktif hanya saat status draft/ditolak dan memiliki entri jam kerja
  bool get canSubmit => isEditable && totalHours > 0;

  /// Filter entri berdasarkan tanggal tertentu (mencocokkan tahun, bulan, hari dalam WIB)
  List<TimesheetEntryEntity> entriesForDate(DateTime date) {
    final jkt = DateFormatter.toJakarta(date);
    return entries.where((e) {
      final entryJkt = DateFormatter.toJakarta(e.workDate);
      return entryJkt.year == jkt.year &&
          entryJkt.month == jkt.month &&
          entryJkt.day == jkt.day;
    }).toList();
  }

  /// Total jam pada tanggal tertentu
  double totalHoursForDate(DateTime date) {
    final dayEntries = entriesForDate(date);
    double sum = 0.0;
    for (final e in dayEntries) {
      sum += e.hours;
    }
    return sum;
  }

  TimesheetEntity copyWith({
    String? id,
    String? userId,
    DateTime? weekStart,
    String? status,
    String? rejectReason,
    DateTime? submittedAt,
    String? approvedBy,
    DateTime? approvedAt,
    List<TimesheetEntryEntity>? entries,
  }) {
    return TimesheetEntity(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      weekStart: weekStart ?? this.weekStart,
      status: status ?? this.status,
      rejectReason: rejectReason ?? this.rejectReason,
      submittedAt: submittedAt ?? this.submittedAt,
      approvedBy: approvedBy ?? this.approvedBy,
      approvedAt: approvedAt ?? this.approvedAt,
      entries: entries ?? this.entries,
    );
  }
}

