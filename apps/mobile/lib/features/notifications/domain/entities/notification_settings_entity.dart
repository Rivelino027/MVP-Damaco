class NotificationSettingsEntity {
  final bool pushEnabled;
  final bool soundEnabled;
  final bool taskAssigned;
  final bool expenseUpdates;
  final bool timesheetReminders;

  const NotificationSettingsEntity({
    this.pushEnabled = true,
    this.soundEnabled = true,
    this.taskAssigned = true,
    this.expenseUpdates = true,
    this.timesheetReminders = true,
  });

  NotificationSettingsEntity copyWith({
    bool? pushEnabled,
    bool? soundEnabled,
    bool? taskAssigned,
    bool? expenseUpdates,
    bool? timesheetReminders,
  }) {
    return NotificationSettingsEntity(
      pushEnabled: pushEnabled ?? this.pushEnabled,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      taskAssigned: taskAssigned ?? this.taskAssigned,
      expenseUpdates: expenseUpdates ?? this.expenseUpdates,
      timesheetReminders: timesheetReminders ?? this.timesheetReminders,
    );
  }

  factory NotificationSettingsEntity.fromJson(Map<String, dynamic> json) {
    return NotificationSettingsEntity(
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      soundEnabled: json['soundEnabled'] as bool? ?? true,
      taskAssigned: json['taskAssigned'] as bool? ?? true,
      expenseUpdates: json['expenseUpdates'] as bool? ?? true,
      timesheetReminders: json['timesheetReminders'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pushEnabled': pushEnabled,
      'soundEnabled': soundEnabled,
      'taskAssigned': taskAssigned,
      'expenseUpdates': expenseUpdates,
      'timesheetReminders': timesheetReminders,
    };
  }
}

