import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:damacoflow/features/auth/data/repositories/auth_repository_mock.dart';
import 'package:damacoflow/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SecureStorageService storage;
  late AuthRepositoryMock repository;
  late AuthNotifier notifier;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    storage = SecureStorageService();
    repository = AuthRepositoryMock();
    notifier = AuthNotifier(repository: repository, storage: storage);
  });

  group('AuthNotifier - Login Tests', () {
    test('Login success as Pengguna', () async {
      final success = await notifier.login(
        email: 'lilit@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'pengguna',
      );

      expect(success, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.role, 'pengguna');
      expect(notifier.state.userName, 'Lilit');
      expect(notifier.state.mustChangePassword, isFalse);

      // Verify token in storage
      final token = await storage.getAccessToken();
      expect(token, isNotNull);
      expect(token, startsWith('mock_access_token_'));
    });

    test('Login success as Admin', () async {
      final success = await notifier.login(
        email: 'ransink@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'admin',
      );

      expect(success, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.role, 'admin');
      expect(notifier.state.userName, 'Ransink');
    });

    test('Login success as Finance', () async {
      final success = await notifier.login(
        email: 'mamas@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'finance',
      );

      expect(success, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.role, 'finance');
      expect(notifier.state.userName, 'Mamas');
    });

    test('Role mismatch rejected with Indonesian error message', () async {
      // Akun Lilit adalah 'pengguna', tetapi tab yang dipilih adalah 'admin'
      final success = await notifier.login(
        email: 'lilit@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'admin',
      );

      expect(success, isFalse);
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.errorMessage, 'Akun ini bukan akun Admin');
    });

    test('Super Admin account is rejected from mobile', () async {
      final success = await notifier.login(
        email: 'superadmin@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'admin',
      );

      expect(success, isFalse);
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(
        notifier.state.errorMessage,
        'Akun Super Admin tidak dapat masuk ke aplikasi mobile',
      );
    });

    test('Inactive account is rejected', () async {
      final success = await notifier.login(
        email: 'nonaktif@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'pengguna',
      );

      expect(success, isFalse);
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(
        notifier.state.errorMessage,
        'Akun tidak aktif, hubungi administrator',
      );
    });

    test('Wrong password rejected', () async {
      final success = await notifier.login(
        email: 'lilit@damacoflow.id',
        password: 'wrongPassword',
        selectedTabRole: 'pengguna',
      );

      expect(success, isFalse);
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.errorMessage, 'Email atau kata sandi salah');
    });

    test('Forced password change account sets mustChangePassword status', () async {
      final success = await notifier.login(
        email: 'baru@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'pengguna',
      );

      expect(success, isTrue);
      expect(notifier.state.status, AuthStatus.mustChangePassword);
      expect(notifier.state.mustChangePassword, isTrue);
    });
  });

  group('AuthNotifier - Logout Tests', () {
    test('Logout clears state and tokens in storage', () async {
      // Login first
      await notifier.login(
        email: 'lilit@damacoflow.id',
        password: 'password123',
        selectedTabRole: 'pengguna',
      );
      expect(await storage.getAccessToken(), isNotNull);

      // Logout
      await notifier.logout();
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.user, isNull);
      expect(await storage.getAccessToken(), isNull);
      expect(await storage.getRefreshToken(), isNull);
    });
  });
}

