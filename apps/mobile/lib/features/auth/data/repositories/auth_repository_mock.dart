import 'dart:async';
import '../../../../core/network/app_exception.dart';
import '../../domain/entities/login_response.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryMock implements AuthRepository {
  // Simulasi database akun mock
  final Map<String, Map<String, dynamic>> _mockUsers = {
    'lilit@damacoflow.id': {
      'id': 'usr-001',
      'email': 'lilit@damacoflow.id',
      'password': 'password123',
      'name': 'Lilit',
      'role': 'pengguna',
      'jobTitle': 'Network Engineer',
      'departmentId': 'dept-it-01',
      'departmentName': 'Departemen IT',
      'costCenterCode': 'CC-IT-02',
      'costCenterName': 'Infrastruktur & Jaringan',
      'phoneNumber': '0812-3456-7801',
      'mustChangePassword': false,
      'isActive': true,
    },
    'rina.kusuma@budgetflow.id': {
      'id': 'usr-001',
      'email': 'rina.kusuma@budgetflow.id',
      'password': 'password123',
      'name': 'Rina Kusuma',
      'role': 'pengguna',
      'jobTitle': 'Network Engineer',
      'departmentId': 'dept-it-01',
      'departmentName': 'Departemen IT',
      'costCenterCode': 'CC-IT-02',
      'costCenterName': 'Infrastruktur & Jaringan',
      'phoneNumber': '0812-3456-7801',
      'mustChangePassword': false,
      'isActive': true,
    },
    'ransink@damacoflow.id': {
      'id': 'usr-002',
      'email': 'ransink@damacoflow.id',
      'password': 'password123',
      'name': 'Ransink',
      'role': 'admin',
      'jobTitle': 'IT Manager',
      'departmentId': 'dept-it-01',
      'departmentName': 'Departemen IT',
      'costCenterCode': 'CC-IT-02',
      'costCenterName': 'Infrastruktur & Jaringan',
      'phoneNumber': '0812-3456-7802',
      'mustChangePassword': false,
      'isActive': true,
    },
    'mamas@damacoflow.id': {
      'id': 'usr-003',
      'email': 'mamas@damacoflow.id',
      'password': 'password123',
      'name': 'Mamas',
      'role': 'finance',
      'jobTitle': 'Finance Specialist',
      'departmentId': 'dept-fin-01',
      'departmentName': 'Departemen Keuangan',
      'costCenterCode': 'CC-FIN-01',
      'costCenterName': 'Operasional Keuangan',
      'phoneNumber': '0812-3456-7803',
      'mustChangePassword': false,
      'isActive': true,
    },
    'baru@damacoflow.id': {
      'id': 'usr-004',
      'email': 'baru@damacoflow.id',
      'password': 'password123',
      'name': 'Pengguna Baru',
      'role': 'pengguna',
      'jobTitle': 'Junior Staff',
      'departmentId': 'dept-it-01',
      'mustChangePassword': true, // Akun dengan paksa ganti sandi
      'isActive': true,
    },
    'superadmin@damacoflow.id': {
      'id': 'usr-005',
      'email': 'superadmin@damacoflow.id',
      'password': 'password123',
      'name': 'Super Admin',
      'role': 'super_admin',
      'jobTitle': 'System Administrator',
      'departmentId': null,
      'mustChangePassword': false,
      'isActive': true,
    },
    'nonaktif@damacoflow.id': {
      'id': 'usr-006',
      'email': 'nonaktif@damacoflow.id',
      'password': 'password123',
      'name': 'Akun Nonaktif',
      'role': 'pengguna',
      'jobTitle': 'Former Employee',
      'departmentId': 'dept-it-01',
      'mustChangePassword': false,
      'isActive': false, // Akun nonaktif
    },
  };

  @override
  Future<LoginResponse> login({
    required String email,
    required String password,
    required String deviceInfo,
  }) async {
    // Simulasi latency jaringan
    await Future.delayed(const Duration(milliseconds: 600));

    final normalizedEmail = email.trim().toLowerCase();
    final userRecord = _mockUsers[normalizedEmail];

    if (userRecord == null || userRecord['password'] != password) {
      throw const AppException(
        message: 'Email atau kata sandi salah',
        statusCode: 401,
      );
    }

    if (userRecord['isActive'] != true) {
      throw const AppException(
        message: 'Akun tidak aktif, hubungi administrator',
        statusCode: 403,
      );
    }

    final user = UserEntity(
      id: userRecord['id'] as String,
      email: userRecord['email'] as String,
      name: userRecord['name'] as String,
      role: userRecord['role'] as String,
      jobTitle: userRecord['jobTitle'] as String?,
      departmentId: userRecord['departmentId'] as String?,
      departmentName: userRecord['departmentName'] as String?,
      costCenterCode: userRecord['costCenterCode'] as String?,
      costCenterName: userRecord['costCenterName'] as String?,
      phoneNumber: userRecord['phoneNumber'] as String?,
      avatarUrl: userRecord['avatarUrl'] as String?,
      mustChangePassword: userRecord['mustChangePassword'] as bool,
      lastLoginAt: DateTime.now(),
    );

    return LoginResponse(
      accessToken: 'mock_access_token_${user.id}_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: 'mock_refresh_token_${user.id}',
      mustChangePassword: user.mustChangePassword,
      user: user,
    );
  }

  @override
  Future<LoginResponse> refreshToken({
    required String refreshToken,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));

    if (!refreshToken.startsWith('mock_refresh_token_')) {
      throw const AppException(
        message: 'Sesi telah berakhir. Silakan masuk kembali.',
        statusCode: 401,
      );
    }

    // Default return user 1 (Lilit) untuk rotasi mock token
    const user = UserEntity(
      id: 'usr-001',
      email: 'lilit@damacoflow.id',
      name: 'Lilit',
      role: 'pengguna',
      jobTitle: 'Network Engineer',
      mustChangePassword: false,
    );

    return LoginResponse(
      accessToken: 'mock_new_access_token_${DateTime.now().millisecondsSinceEpoch}',
      refreshToken: 'mock_new_refresh_token_${DateTime.now().millisecondsSinceEpoch}',
      mustChangePassword: false,
      user: user,
    );
  }

  @override
  Future<void> logout({
    required String refreshToken,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    await Future.delayed(const Duration(milliseconds: 500));
    if (oldPassword != 'password123') {
      throw const AppException(
        message: 'Kata sandi lama tidak sesuai',
        statusCode: 400,
      );
    }
  }

  @override
  Future<void> requestPasswordReset({
    required String email,
  }) async {
    await Future.delayed(const Duration(milliseconds: 600));
    final normalized = email.trim().toLowerCase();
    if (!_mockUsers.containsKey(normalized)) {
      // Backend best practice: tetap berikan respons positif demi keamanan
      return;
    }
  }

  @override
  Future<UserEntity> updateProfile({
    required String name,
    required String email,
    String? phoneNumber,
    String? avatarUrl,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));

    // Update user record pada mock database
    final normalized = email.trim().toLowerCase();
    Map<String, dynamic>? record = _mockUsers[normalized];

    // Jika user ganti email, cari berdasarkan ID 'usr-001'
    if (record == null) {
      for (final entry in _mockUsers.entries) {
        if (entry.value['id'] == 'usr-001') {
          record = entry.value;
          break;
        }
      }
    }

    if (record != null) {
      record['name'] = name;
      record['email'] = email;
      if (phoneNumber != null) record['phoneNumber'] = phoneNumber;
      if (avatarUrl != null) record['avatarUrl'] = avatarUrl;
    }

    return UserEntity(
      id: record?['id'] as String? ?? 'usr-001',
      email: email,
      name: name,
      role: record?['role'] as String? ?? 'pengguna',
      jobTitle: record?['jobTitle'] as String? ?? 'Network Engineer',
      departmentId: record?['departmentId'] as String? ?? 'dept-it-01',
      departmentName: record?['departmentName'] as String? ?? 'Departemen IT',
      costCenterCode: record?['costCenterCode'] as String? ?? 'CC-IT-02',
      costCenterName: record?['costCenterName'] as String? ?? 'Infrastruktur & Jaringan',
      phoneNumber: phoneNumber ?? record?['phoneNumber'] as String?,
      avatarUrl: avatarUrl ?? record?['avatarUrl'] as String?,
      mustChangePassword: false,
      lastLoginAt: DateTime.now(),
    );
  }
}

