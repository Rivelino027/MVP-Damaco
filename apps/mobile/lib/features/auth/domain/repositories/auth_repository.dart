import '../entities/login_response.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<LoginResponse> login({
    required String email,
    required String password,
    required String deviceInfo,
  });

  Future<LoginResponse> refreshToken({
    required String refreshToken,
  });

  Future<void> logout({
    required String refreshToken,
  });

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  });

  /// Request reset password via email
  /// // TODO: konfirmasi endpoint password_resets pada backend
  Future<void> requestPasswordReset({
    required String email,
  });

  /// Update data profil pengguna
  Future<UserEntity> updateProfile({
    required String name,
    required String email,
    String? phoneNumber,
    String? avatarUrl,
  });
}

