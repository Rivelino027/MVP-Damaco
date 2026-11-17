import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/dio_client.dart';
import '../../domain/entities/login_response.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryRemote implements AuthRepository {
  final DioClient _dioClient;

  AuthRepositoryRemote({required DioClient dioClient}) : _dioClient = dioClient;

  @override
  Future<LoginResponse> login({
    required String email,
    required String password,
    required String deviceInfo,
  }) async {
    final response = await _dioClient.post(
      ApiEndpoints.login,
      data: {
        'email': email.trim().toLowerCase(),
        'password': password,
      },
      options: Options(
        headers: {
          'X-Device-Info': deviceInfo,
        },
      ),
    );

    return LoginResponse.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<LoginResponse> refreshToken({
    required String refreshToken,
  }) async {
    final response = await _dioClient.post(
      ApiEndpoints.refresh,
      data: {'refreshToken': refreshToken},
    );

    return LoginResponse.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> logout({
    required String refreshToken,
  }) async {
    await _dioClient.post(
      ApiEndpoints.logout,
      data: {'refreshToken': refreshToken},
    );
  }

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    await _dioClient.post(
      ApiEndpoints.changePassword,
      data: {
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      },
    );
  }

  @override
  Future<void> requestPasswordReset({
    required String email,
  }) async {
    // TODO: konfirmasi endpoint password_resets pada backend
    // Backend belum mengekspos endpoint /auth/forgot-password,
    // saat ini disimulasikan atau memanggil endpoint rujukan jika backend merilisnya.
    await _dioClient.post(
      '/auth/forgot-password',
      data: {'email': email.trim().toLowerCase()},
    );
  }

  @override
  Future<UserEntity> updateProfile({
    required String name,
    required String email,
    String? phoneNumber,
    String? avatarUrl,
  }) async {
    final response = await _dioClient.patch(
      '/users/me',
      data: {
        'name': name,
        'email': email,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
      },
    );
    final data = response.data;
    if (data is Map<String, dynamic> && data['data'] is Map<String, dynamic>) {
      return UserEntity.fromJson(data['data'] as Map<String, dynamic>);
    }
    return UserEntity.fromJson(data as Map<String, dynamic>);
  }
}

