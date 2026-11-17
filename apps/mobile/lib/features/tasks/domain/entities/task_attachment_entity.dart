class TaskAttachmentEntity {
  final String id;
  final String fileName;
  final String fileUrl;
  final String mimeType;
  final int size;
  final String uploadedBy;
  final DateTime createdAt;

  const TaskAttachmentEntity({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    required this.mimeType,
    required this.size,
    required this.uploadedBy,
    required this.createdAt,
  });

  factory TaskAttachmentEntity.fromJson(Map<String, dynamic> json) {
    return TaskAttachmentEntity(
      id: json['id']?.toString() ?? '',
      fileName: json['fileName']?.toString() ?? 'Lampiran',
      fileUrl: json['fileUrl']?.toString() ?? '',
      mimeType: json['mimeType']?.toString() ?? 'application/octet-stream',
      size: (json['size'] is num) ? (json['size'] as num).toInt() : int.tryParse(json['size']?.toString() ?? '0') ?? 0,
      uploadedBy: json['uploadedBy']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fileName': fileName,
      'fileUrl': fileUrl,
      'mimeType': mimeType,
      'size': size,
      'uploadedBy': uploadedBy,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) {
      return '${(size / 1024).toStringAsFixed(1)} KB';
    }
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

