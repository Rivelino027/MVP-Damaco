import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../../core/utils/device_info_helper.dart';
import '../../data/repositories/auth_repository_mock.dart';
import '../../data/repositories/auth_repository_remote.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../../notifications/domain/repositories/notifications_repository.dart';
import '../../../notifications/presentation/providers/notifications_provider.dart';
import '../../../notifications/services/push_notification_service.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  mustChangePassword,
}

class AuthState {
  final AuthStatus status;
  final UserEntity? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
  });

  bool get isAuthenticated =>
      status == AuthStatus.authenticated || status == AuthStatus.mustChangePassword;

  bool get mustChangePassword => user?.mustChangePassword ?? false;
  String? get role => user?.role;
  String? get userId => user?.id;
  String? get userName => user?.name;
  String? get userEmail => user?.email;

  AuthState copyWith({
    AuthStatus? status,
    UserEntity? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  if (AppConfig.useMockData) {
    return AuthRepositoryMock();
  }
  final dioClient = ref.watch(dioClientProvider);
  return AuthRepositoryRemote(dioClient: dioClient);
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  final notificationsRepo = ref.watch(notificationsRepositoryProvider);
  return AuthNotifier(
    repository: repository,
    storage: storage,
    notificationsRepository: notificationsRepo,
  );
});

final currentUserProvider = Provider<UserEntity?>((ref) {
  return ref.watch(authProvider).user;
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  final SecureStorageService _storage;
  final NotificationsRepository? _notificationsRepository;

  AuthNotifier({
    required AuthRepository repository,
    required SecureStorageService storage,
    NotificationsRepository? notificationsRepository,
  })  : _repository = repository,
        _storage = storage,
        _notificationsRepository = notificationsRepository,
        super(const AuthState()) {
    checkAuth();
  }

  /// Cek token dan profil pengguna yang tersimpan di Secure Storage
  Future<void> checkAuth() async {
    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty || token.startsWith('mock_')) {
      if (token != null && token.startsWith('mock_')) {
        await _storage.clearAuth();
      }
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }

    final userId = await _storage.getUserId();
    final role = await _storage.getUserRole();
    final name = await _storage.getUserName();
    final email = await _storage.getUserEmail();
    final mustChangePassword = await _storage.getMustChangePassword();

    // Aturan keras: super_admin tidak diperkenankan di mobile
    if (role == 'super_admin') {
      await _storage.clearAuth();
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Akun Super Admin tidak dapat masuk ke aplikasi mobile',
      );
      return;
    }

    if (userId != null && role != null && email != null) {
      final user = UserEntity(
        id: userId,
        email: email,
        name: name ?? 'Pengguna',
        role: role,
        departmentName: 'Departemen IT',
        costCenterCode: 'CC-IT-02',
        costCenterName: 'Infrastruktur & Jaringan',
        phoneNumber: '0812-3456-7801',
        mustChangePassword: mustChangePassword,
      );

      state = state.copyWith(
        status: mustChangePassword
            ? AuthStatus.mustChangePassword
            : AuthStatus.authenticated,
        user: user,
      );
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  /// Login akun dengan email & password
  Future<bool> login({
    required String email,
    required String password,
    String? selectedTabRole,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

    try {
      final deviceInfo = DeviceInfoHelper.getDeviceInfo();
      final response = await _repository.login(
        email: email,
        password: password,
        deviceInfo: deviceInfo,
      );

      final user = response.user;
      final serverRole = user.role.toLowerCase();

      // 1. Validasi akun super_admin
      if (serverRole == 'super_admin') {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'Akun Super Admin tidak dapat masuk ke aplikasi mobile',
        );
        return false;
      }

      // 2. Validasi kesesuaian role jika selectedTabRole disertakan
      if (selectedTabRole != null &&
          serverRole != selectedTabRole.toLowerCase()) {
        final roleLabel = _formatRoleName(selectedTabRole);
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'Akun ini bukan akun $roleLabel',
        );
        return false;
      }

      // 3. Simpan sesi di FlutterSecureStorage
      await _storage.saveUserSession(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        userId: user.id,
        role: serverRole,
        name: user.name,
        email: user.email,
        mustChangePassword: response.mustChangePassword,
      );

      state = state.copyWith(
        status: response.mustChangePassword
            ? AuthStatus.mustChangePassword
            : AuthStatus.authenticated,
        user: user,
      );

      // 4. Registrasi token perangkat FCM ke backend
      final notifRepo = _notificationsRepository;
      if (notifRepo != null) {
        PushNotificationService.instance.registerCurrentToken(notifRepo);
      }

      return true;
    } on AppException catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Terjadi kesalahan sistem saat masuk. Coba lagi.',
      );
      return false;
    }
  }

  /// Logout akun: cabut refresh token di server lalu bersihkan storage lokal
  Future<void> logout() async {
    try {
      // 1. Hapus token FCM dari backend
      final notifRepo = _notificationsRepository;
      if (notifRepo != null) {
        await PushNotificationService.instance.deleteCurrentToken(notifRepo);
      }

      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _repository.logout(refreshToken: refreshToken);
      }
    } catch (_) {
      // Tetap lanjutkan pembersihan lokal jika koneksi bermasalah saat logout
    } finally {
      await _storage.clearAuth();
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  /// Ganti kata sandi
  Future<bool> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      await _repository.changePassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
      );

      await _storage.setMustChangePassword(false);

      if (state.user != null) {
        final updatedUser = UserEntity(
          id: state.user!.id,
          email: state.user!.email,
          name: state.user!.name,
          role: state.user!.role,
          jobTitle: state.user!.jobTitle,
          departmentId: state.user!.departmentId,
          avatarUrl: state.user!.avatarUrl,
          mustChangePassword: false,
          lastLoginAt: state.user!.lastLoginAt,
        );

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: updatedUser,
        );
      } else {
        state = state.copyWith(status: AuthStatus.authenticated);
      }

      return true;
    } on AppException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Gagal memperbarui kata sandi.');
      return false;
    }
  }

  /// Request reset password via email
  Future<bool> requestPasswordReset(String email) async {
    try {
      await _repository.requestPasswordReset(email: email);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Gagal mengirim permintaan reset kata sandi.');
      return false;
    }
  }

  /// Update data profil pengguna
  Future<bool> updateProfile({
    required String name,
    required String email,
    String? phoneNumber,
    String? avatarUrl,
  }) async {
    try {
      final updatedUser = await _repository.updateProfile(
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        avatarUrl: avatarUrl,
      );

      final token = await _storage.getAccessToken();
      final refreshToken = await _storage.getRefreshToken();
      if (token != null && refreshToken != null) {
        await _storage.saveUserSession(
          accessToken: token,
          refreshToken: refreshToken,
          userId: updatedUser.id,
          role: updatedUser.role,
          name: updatedUser.name,
          email: updatedUser.email,
          mustChangePassword: updatedUser.mustChangePassword,
        );
      }

      state = state.copyWith(user: updatedUser);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Gagal memperbarui profil pengguna.');
      return false;
    }
  }

  String _formatRoleName(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'finance':
        return 'Finance';
      case 'pengguna':
      default:
        return 'Pengguna';
    }
  }
}
