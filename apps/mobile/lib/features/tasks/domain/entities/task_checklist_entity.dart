class TaskChecklistEntity {
  final String id;
  final String taskId;
  final String text;
  final bool isDone;

  const TaskChecklistEntity({
    required this.id,
    required this.taskId,
    required this.text,
    this.isDone = false,
  });

  factory TaskChecklistEntity.fromJson(Map<String, dynamic> json) {
    return TaskChecklistEntity(
      id: json['id']?.toString() ?? '',
      taskId: json['taskId']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      isDone: json['isDone'] == true || json['isDone'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'text': text,
      'isDone': isDone,
    };
  }

  TaskChecklistEntity copyWith({
    String? id,
    String? taskId,
    String? text,
    bool? isDone,
  }) {
    return TaskChecklistEntity(
      id: id ?? this.id,
      taskId: taskId ?? this.taskId,
      text: text ?? this.text,
      isDone: isDone ?? this.isDone,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskChecklistEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          taskId == other.taskId &&
          text == other.text &&
          isDone == other.isDone;

  @override
  int get hashCode =>
      id.hashCode ^ taskId.hashCode ^ text.hashCode ^ isDone.hashCode;
}

