import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/decimal_converter.dart';
import 'task_attachment_entity.dart';
import 'task_checklist_entity.dart';
import 'task_comment_entity.dart';

class TaskProject {
  final String id;
  final String name;

  const TaskProject({required this.id, required this.name});

  factory TaskProject.fromJson(Map<String, dynamic> json) {
    return TaskProject(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}

class TaskPhase {
  final String id;
  final String name;

  const TaskPhase({required this.id, required this.name});

  factory TaskPhase.fromJson(Map<String, dynamic> json) {
    return TaskPhase(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}

class TaskAssignee {
  final String id;
  final String name;
  final String email;
  final String? jobTitle;
  final String? avatarUrl;

  const TaskAssignee({
    required this.id,
    required this.name,
    required this.email,
    this.jobTitle,
    this.avatarUrl,
  });

  factory TaskAssignee.fromJson(Map<String, dynamic> json) {
    return TaskAssignee(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      jobTitle: json['jobTitle']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'jobTitle': jobTitle,
        'avatarUrl': avatarUrl,
      };
}

class TaskEntity {
  final String id;
  final String projectId;
  final String? phaseId;
  final String title;
  final String? description;
  final String? assigneeId;
  final String status; // 'belum_mulai', 'dikerjakan', 'review', 'selesai'
  final String priority; // 'rendah', 'sedang', 'tinggi'
  final DateTime? dueDate;
  final double? estimatedHours;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? deletedAt;

  final TaskProject? project;
  final TaskPhase? phase;
  final TaskAssignee? assignee;
  final List<TaskChecklistEntity> checklists;
  final List<TaskCommentEntity> comments;
  final List<TaskAttachmentEntity> attachments;

  const TaskEntity({
    required this.id,
    required this.projectId,
    this.phaseId,
    required this.title,
    this.description,
    this.assigneeId,
    required this.status,
    required this.priority,
    this.dueDate,
    this.estimatedHours,
    this.createdAt,
    this.updatedAt,
    this.deletedAt,
    this.project,
    this.phase,
    this.assignee,
    this.checklists = const [],
    this.comments = const [],
    this.attachments = const [],
  });

  factory TaskEntity.fromJson(Map<String, dynamic> json) {
    // Parse estimatedHours safely using DecimalConverter or double.tryParse
    double? parsedHours;
    if (json['estimatedHours'] != null) {
      final hoursStr = DecimalConverter.toDecimalString(json['estimatedHours']);
      parsedHours = double.tryParse(hoursStr);
    }

    // Parse project
    TaskProject? project;
    if (json['project'] is Map<String, dynamic>) {
      project = TaskProject.fromJson(json['project'] as Map<String, dynamic>);
    }

    // Parse phase
    TaskPhase? phase;
    if (json['phase'] is Map<String, dynamic>) {
      phase = TaskPhase.fromJson(json['phase'] as Map<String, dynamic>);
    }

    // Parse assignee
    TaskAssignee? assignee;
    if (json['assignee'] is Map<String, dynamic>) {
      assignee = TaskAssignee.fromJson(json['assignee'] as Map<String, dynamic>);
    }

    // Parse checklists
    final checklists = <TaskChecklistEntity>[];
    if (json['checklists'] is List) {
      for (final item in json['checklists']) {
        if (item is Map<String, dynamic>) {
          checklists.add(TaskChecklistEntity.fromJson(item));
        }
      }
    }

    // Parse comments
    final comments = <TaskCommentEntity>[];
    if (json['comments'] is List) {
      for (final item in json['comments']) {
        if (item is Map<String, dynamic>) {
          comments.add(TaskCommentEntity.fromJson(item));
        }
      }
    }

    // Parse attachments
    final attachments = <TaskAttachmentEntity>[];
    if (json['attachments'] is List) {
      for (final item in json['attachments']) {
        if (item is Map<String, dynamic>) {
          attachments.add(TaskAttachmentEntity.fromJson(item));
        }
      }
    }

    return TaskEntity(
      id: json['id']?.toString() ?? '',
      projectId: json['projectId']?.toString() ?? '',
      phaseId: json['phaseId']?.toString(),
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      assigneeId: json['assigneeId']?.toString(),
      status: json['status']?.toString() ?? 'belum_mulai',
      priority: json['priority']?.toString() ?? 'sedang',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      estimatedHours: parsedHours,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
      deletedAt: json['deletedAt'] != null ? DateTime.tryParse(json['deletedAt'].toString()) : null,
      project: project,
      phase: phase,
      assignee: assignee,
      checklists: checklists,
      comments: comments,
      attachments: attachments,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'phaseId': phaseId,
      'title': title,
      'description': description,
      'assigneeId': assigneeId,
      'status': status,
      'priority': priority,
      'dueDate': dueDate?.toIso8601String(),
      'estimatedHours': estimatedHours?.toStringAsFixed(2),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'deletedAt': deletedAt?.toIso8601String(),
      if (project != null) 'project': project!.toJson(),
      if (phase != null) 'phase': phase!.toJson(),
      if (assignee != null) 'assignee': assignee!.toJson(),
      'checklists': checklists.map((c) => c.toJson()).toList(),
      'comments': comments.map((c) => c.toJson()).toList(),
      'attachments': attachments.map((a) => a.toJson()).toList(),
    };
  }

  String formattedDueDate({DateTime? customNow}) =>
      DateFormatter.formatTaskDueDate(dueDate, customNow: customNow);

  bool isDueTodayOrOverdue({DateTime? customNow}) =>
      DateFormatter.isDueTodayOrOverdue(dueDate, customNow: customNow);

  int get completedChecklistsCount => checklists.where((c) => c.isDone).length;
  int get totalChecklistsCount => checklists.length;

  TaskEntity copyWith({
    String? id,
    String? projectId,
    String? phaseId,
    String? title,
    String? description,
    String? assigneeId,
    String? status,
    String? priority,
    DateTime? dueDate,
    double? estimatedHours,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
    TaskProject? project,
    TaskPhase? phase,
    TaskAssignee? assignee,
    List<TaskChecklistEntity>? checklists,
    List<TaskCommentEntity>? comments,
    List<TaskAttachmentEntity>? attachments,
  }) {
    return TaskEntity(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      phaseId: phaseId ?? this.phaseId,
      title: title ?? this.title,
      description: description ?? this.description,
      assigneeId: assigneeId ?? this.assigneeId,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      dueDate: dueDate ?? this.dueDate,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      project: project ?? this.project,
      phase: phase ?? this.phase,
      assignee: assignee ?? this.assignee,
      checklists: checklists ?? this.checklists,
      comments: comments ?? this.comments,
      attachments: attachments ?? this.attachments,
    );
  }
}

