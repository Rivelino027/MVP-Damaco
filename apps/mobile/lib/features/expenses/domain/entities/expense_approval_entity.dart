class ExpenseApprovalEntity {
  final String id;
  final String documentType;
  final String documentId;
  final int stepOrder;
  final String role; // 'admin', 'finance', 'super_admin'
  final String status; // 'menunggu', 'disetujui', 'ditolak'
  final String? approverId;
  final String? approverName;
  final DateTime? actedAt;
  final String? reason;
  final DateTime createdAt;

  const ExpenseApprovalEntity({
    required this.id,
    required this.documentType,
    required this.documentId,
    required this.stepOrder,
    required this.role,
    required this.status,
    this.approverId,
    this.approverName,
    this.actedAt,
    this.reason,
    required this.createdAt,
  });

  factory ExpenseApprovalEntity.fromJson(Map<String, dynamic> json) {
    String? approverName;
    if (json['approver'] is Map<String, dynamic>) {
      approverName = json['approver']['name']?.toString();
    } else {
      approverName = json['approverName']?.toString();
    }

    return ExpenseApprovalEntity(
      id: json['id']?.toString() ?? '',
      documentType: json['documentType']?.toString() ?? 'expense',
      documentId: json['documentId']?.toString() ?? '',
      stepOrder: (json['stepOrder'] as num?)?.toInt() ?? 1,
      role: json['role']?.toString() ?? 'admin',
      status: json['status']?.toString() ?? 'menunggu',
      approverId: json['approverId']?.toString(),
      approverName: approverName,
      actedAt: json['actedAt'] != null
          ? DateTime.tryParse(json['actedAt'].toString())
          : null,
      reason: json['reason']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'documentType': documentType,
        'documentId': documentId,
        'stepOrder': stepOrder,
        'role': role,
        'status': status,
        if (approverId != null) 'approverId': approverId,
        if (approverName != null) 'approverName': approverName,
        if (actedAt != null) 'actedAt': actedAt!.toIso8601String(),
        if (reason != null) 'reason': reason,
        'createdAt': createdAt.toIso8601String(),
      };

  String get stepTitle {
    if (role.toLowerCase() == 'admin' || stepOrder == 1) {
      return 'Persetujuan Admin';
    }
    if (role.toLowerCase() == 'finance' || stepOrder == 2) {
      return 'Verifikasi Finance';
    }
    return 'Persetujuan Super Admin';
  }
}

