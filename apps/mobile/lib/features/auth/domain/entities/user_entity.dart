class UserEntity {
  final String id;
  final String email;
  final String name;
  final String role; // 'pengguna', 'admin', 'finance', 'super_admin'
  final String? departmentId;
  final String? departmentName;
  final String? costCenterCode;
  final String? costCenterName;
  final String? phoneNumber;
  final String? jobTitle;
  final String? avatarUrl;
  final bool mustChangePassword;
  final DateTime? lastLoginAt;

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.departmentId,
    this.departmentName,
    this.costCenterCode,
    this.costCenterName,
    this.phoneNumber,
    this.jobTitle,
    this.avatarUrl,
    this.mustChangePassword = false,
    this.lastLoginAt,
  });

  /// Inisial 1-2 huruf kapital dari nama pengguna (contoh: "Rina Kusuma" -> "RK")
  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts[0].isEmpty) return 'U';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  UserEntity copyWith({
    String? id,
    String? email,
    String? name,
    String? role,
    String? departmentId,
    String? departmentName,
    String? costCenterCode,
    String? costCenterName,
    String? phoneNumber,
    String? jobTitle,
    String? avatarUrl,
    bool? mustChangePassword,
    DateTime? lastLoginAt,
  }) {
    return UserEntity(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      departmentId: departmentId ?? this.departmentId,
      departmentName: departmentName ?? this.departmentName,
      costCenterCode: costCenterCode ?? this.costCenterCode,
      costCenterName: costCenterName ?? this.costCenterName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      jobTitle: jobTitle ?? this.jobTitle,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    );
  }

  factory UserEntity.fromJson(Map<String, dynamic> json) {
    return UserEntity(
      id: json['id'] as String,
      email: json['email'] as String,
      name: (json['name'] as String?) ?? 'Pengguna',
      role: (json['role'] as String).toLowerCase(),
      departmentId: json['departmentId'] as String?,
      departmentName: json['departmentName'] as String? ??
          (json['department'] is Map ? json['department']['name'] as String? : null),
      costCenterCode: json['costCenterCode'] as String? ??
          (json['costCenter'] is Map ? json['costCenter']['code'] as String? : null),
      costCenterName: json['costCenterName'] as String? ??
          (json['costCenter'] is Map ? json['costCenter']['name'] as String? : null),
      phoneNumber: json['phoneNumber'] as String? ?? json['phone'] as String?,
      jobTitle: json['jobTitle'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      mustChangePassword: json['mustChangePassword'] == true || json['mustChangePassword'] == 1,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.tryParse(json['lastLoginAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'departmentId': departmentId,
      'departmentName': departmentName,
      'costCenterCode': costCenterCode,
      'costCenterName': costCenterName,
      'phoneNumber': phoneNumber,
      'jobTitle': jobTitle,
      'avatarUrl': avatarUrl,
      'mustChangePassword': mustChangePassword,
      'lastLoginAt': lastLoginAt?.toIso8601String(),
    };
  }
}

