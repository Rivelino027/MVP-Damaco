class ExpenseAttachmentEntity {
  final String id;
  final String fileName;
  final int fileSize;
  final String mimeType;
  final String? url;
  final DateTime? createdAt;

  const ExpenseAttachmentEntity({
    required this.id,
    required this.fileName,
    required this.fileSize,
    required this.mimeType,
    this.url,
    this.createdAt,
  });

  factory ExpenseAttachmentEntity.fromJson(Map<String, dynamic> json) {
    return ExpenseAttachmentEntity(
      id: json['id']?.toString() ?? '',
      fileName: json['fileName']?.toString() ?? 'nota.jpg',
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
      mimeType: json['mimeType']?.toString() ?? 'image/jpeg',
      url: json['url']?.toString() ?? json['filePath']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fileName': fileName,
        'fileSize': fileSize,
        'mimeType': mimeType,
        if (url != null) 'url': url,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      };

  bool get isImage =>
      mimeType.startsWith('image/') ||
      fileName.toLowerCase().endsWith('.jpg') ||
      fileName.toLowerCase().endsWith('.jpeg') ||
      fileName.toLowerCase().endsWith('.png');

  bool get isPdf =>
      mimeType == 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

