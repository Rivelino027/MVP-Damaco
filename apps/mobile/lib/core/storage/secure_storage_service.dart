import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

class StorageKeys {
  StorageKeys._();
  static const String accessToken = 'bf_access_token';
  static const String refreshToken = 'bf_refresh_token';
  static const String userId = 'bf_user_id';
  static const String userRole = 'bf_user_role';
  static const String userName = 'bf_user_name';
  static const String userEmail = 'bf_user_email';
  static const String mustChangePassword = 'bf_must_change_pwd';
  static const String onboardingSeen = 'bf_onboarding_seen';
}

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  // Token Management
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: StorageKeys.accessToken, value: accessToken);
    await _storage.write(key: StorageKeys.refreshToken, value: refreshToken);
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: StorageKeys.accessToken);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: StorageKeys.refreshToken);
  }

  // User Profile & Session
  Future<void> saveUserSession({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String role,
    required String name,
    required String email,
    required bool mustChangePassword,
  }) async {
    await saveTokens(accessToken: accessToken, refreshToken: refreshToken);
    await _storage.write(key: StorageKeys.userId, value: userId);
    await _storage.write(key: StorageKeys.userRole, value: role);
    await _storage.write(key: StorageKeys.userName, value: name);
    await _storage.write(key: StorageKeys.userEmail, value: email);
    await _storage.write(
      key: StorageKeys.mustChangePassword,
      value: mustChangePassword ? '1' : '0',
    );
  }

  Future<String?> getUserId() async => _storage.read(key: StorageKeys.userId);
  Future<String?> getUserRole() async => _storage.read(key: StorageKeys.userRole);
  Future<String?> getUserName() async => _storage.read(key: StorageKeys.userName);
  Future<String?> getUserEmail() async => _storage.read(key: StorageKeys.userEmail);

  Future<bool> getMustChangePassword() async {
    final value = await _storage.read(key: StorageKeys.mustChangePassword);
    return value == '1';
  }

  Future<void> setMustChangePassword(bool value) async {
    await _storage.write(
      key: StorageKeys.mustChangePassword,
      value: value ? '1' : '0',
    );
  }

  Future<bool> getOnboardingSeen() async {
    final value = await _storage.read(key: StorageKeys.onboardingSeen);
    return value == '1';
  }

  Future<void> setOnboardingSeen(bool seen) async {
    await _storage.write(
      key: StorageKeys.onboardingSeen,
      value: seen ? '1' : '0',
    );
  }

  Future<bool> hasValidToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearAuth() async {
    await _storage.delete(key: StorageKeys.accessToken);
    await _storage.delete(key: StorageKeys.refreshToken);
    await _storage.delete(key: StorageKeys.userId);
    await _storage.delete(key: StorageKeys.userRole);
    await _storage.delete(key: StorageKeys.userName);
    await _storage.delete(key: StorageKeys.userEmail);
    await _storage.delete(key: StorageKeys.mustChangePassword);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}

