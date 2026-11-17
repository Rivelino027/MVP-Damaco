import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:damacoflow/features/auth/data/repositories/auth_repository_mock.dart';
import 'package:damacoflow/features/auth/presentation/pages/login_page.dart';
import 'package:damacoflow/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Widget createLoginTestWidget({
    required SecureStorageService storage,
    required AuthRepositoryMock repository,
  }) {
    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: '/change-password',
          builder: (context, state) =>
              const Scaffold(body: Text('Change Password Screen')),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) =>
              const Scaffold(body: Text('Dashboard Screen')),
        ),
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) =>
              const Scaffold(body: Text('Forgot Password Screen')),
        ),
      ],
    );

    return ProviderScope(
      overrides: [
        secureStorageServiceProvider.overrideWithValue(storage),
        authRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp.router(
        routerConfig: router,
      ),
    );
  }

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('LoginPage Widget Tests', () {
    testWidgets('Renders all initial UI components on LoginPage', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final storage = SecureStorageService();
      final repository = AuthRepositoryMock();

      await tester.pumpWidget(createLoginTestWidget(
        storage: storage,
        repository: repository,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Masuk ke DamacoFlow'), findsOneWidget);
      expect(find.byKey(const Key('login_email_field')), findsOneWidget);
      expect(find.byKey(const Key('login_password_field')), findsOneWidget);
      expect(find.byKey(const Key('login_submit_button')), findsOneWidget);
      expect(find.byKey(const Key('login_forgot_password_button')), findsOneWidget);
    });

    testWidgets('Form validation shows errors when submitting empty fields', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final storage = SecureStorageService();
      final repository = AuthRepositoryMock();

      await tester.pumpWidget(createLoginTestWidget(
        storage: storage,
        repository: repository,
      ));
      await tester.pumpAndSettle();

      // Tap Masuk without filling anything
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Email wajib diisi'), findsOneWidget);
      expect(find.text('Kata sandi wajib diisi'), findsOneWidget);
    });

    testWidgets('Successful login with valid credentials navigates to dashboard', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final storage = SecureStorageService();
      final repository = AuthRepositoryMock();

      await tester.pumpWidget(createLoginTestWidget(
        storage: storage,
        repository: repository,
      ));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('login_email_field')),
          matching: find.byType(TextFormField),
        ),
        'lilit@damacoflow.id',
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('login_password_field')),
          matching: find.byType(TextFormField),
        ),
        'password123',
      );

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      expect(find.text('Dashboard Screen'), findsOneWidget);
    });

    testWidgets('Shows error banner when entering wrong password', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final storage = SecureStorageService();
      final repository = AuthRepositoryMock();

      await tester.pumpWidget(createLoginTestWidget(
        storage: storage,
        repository: repository,
      ));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('login_email_field')),
          matching: find.byType(TextFormField),
        ),
        'lilit@damacoflow.id',
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const Key('login_password_field')),
          matching: find.byType(TextFormField),
        ),
        'wrongpassword',
      );

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login_error_banner')), findsOneWidget);
    });
  });
}
