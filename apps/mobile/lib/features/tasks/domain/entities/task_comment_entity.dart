class TaskCommentEntity {
  final String id;
  final String taskId;
  final String userId;
  final String body;
  final DateTime createdAt;
  final String? userName;
  final String? userAvatarUrl;

  const TaskCommentEntity({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.body,
    required this.createdAt,
    this.userName,
    this.userAvatarUrl,
  });

  factory TaskCommentEntity.fromJson(Map<String, dynamic> json) {
    String? userName;
    String? userAvatarUrl;
    if (json['user'] is Map<String, dynamic>) {
      userName = json['user']['name']?.toString();
      userAvatarUrl = json['user']['avatarUrl']?.toString();
    }

    DateTime parsedDate;
    if (json['createdAt'] != null) {
      parsedDate = DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    return TaskCommentEntity(
      id: json['id']?.toString() ?? '',
      taskId: json['taskId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      createdAt: parsedDate,
      userName: userName,
      userAvatarUrl: userAvatarUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'userId': userId,
      'body': body,
      'createdAt': createdAt.toIso8601String(),
      'user': {
        'name': userName,
        'avatarUrl': userAvatarUrl,
      },
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskCommentEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          taskId == other.taskId &&
          userId == other.userId &&
          body == other.body &&
          createdAt == other.createdAt;

  @override
  int get hashCode =>
      id.hashCode ^ taskId.hashCode ^ userId.hashCode ^ body.hashCode ^ createdAt.hashCode;
}

