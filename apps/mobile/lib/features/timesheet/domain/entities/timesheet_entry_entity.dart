import '../../../../core/utils/decimal_converter.dart';

class TimesheetEntryEntity {
  final String? id;
  final String? timesheetId;
  final String taskId;
  final DateTime workDate;
  final double hours;
  final String? note;
  final String? taskTitle;
  final String? projectName;

  const TimesheetEntryEntity({
    this.id,
    this.timesheetId,
    required this.taskId,
    required this.workDate,
    required this.hours,
    this.note,
    this.taskTitle,
    this.projectName,
  });

  factory TimesheetEntryEntity.fromJson(Map<String, dynamic> json) {
    double parsedHours = 0.0;
    if (json['hours'] != null) {
      final hoursStr = DecimalConverter.toDecimalString(json['hours']);
      parsedHours = double.tryParse(hoursStr) ?? 0.0;
    }

    DateTime parsedDate;
    if (json['workDate'] != null) {
      parsedDate = DateTime.tryParse(json['workDate'].toString()) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    String? taskTitle;
    String? projectName;
    if (json['task'] is Map<String, dynamic>) {
      taskTitle = json['task']['title']?.toString();
      if (json['task']['project'] is Map<String, dynamic>) {
        projectName = json['task']['project']['name']?.toString();
      }
    } else {
      taskTitle = json['taskTitle']?.toString();
      projectName = json['projectName']?.toString();
    }

    return TimesheetEntryEntity(
      id: json['id']?.toString(),
      timesheetId: json['timesheetId']?.toString(),
      taskId: json['taskId']?.toString() ?? '',
      workDate: parsedDate,
      hours: parsedHours,
      note: json['note']?.toString() ?? json['description']?.toString(),
      taskTitle: taskTitle,
      projectName: projectName,
    );
  }

  Map<String, dynamic> toJson() {
    // Format tanggal YYYY-MM-DD untuk backend
    final dateStr =
        "${workDate.year.toString().padLeft(4, '0')}-${workDate.month.toString().padLeft(2, '0')}-${workDate.day.toString().padLeft(2, '0')}";

    return {
      if (id != null) 'id': id,
      if (timesheetId != null) 'timesheetId': timesheetId,
      'taskId': taskId,
      'workDate': dateStr,
      'hours': hours,
      if (note != null) 'note': note,
    };
  }

  TimesheetEntryEntity copyWith({
    String? id,
    String? timesheetId,
    String? taskId,
    DateTime? workDate,
    double? hours,
    String? note,
    String? taskTitle,
    String? projectName,
  }) {
    return TimesheetEntryEntity(
      id: id ?? this.id,
      timesheetId: timesheetId ?? this.timesheetId,
      taskId: taskId ?? this.taskId,
      workDate: workDate ?? this.workDate,
      hours: hours ?? this.hours,
      note: note ?? this.note,
      taskTitle: taskTitle ?? this.taskTitle,
      projectName: projectName ?? this.projectName,
    );
  }
}

