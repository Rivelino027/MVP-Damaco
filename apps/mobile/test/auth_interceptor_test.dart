import 'package:damacoflow/core/network/auth_interceptor.dart';
import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SecureStorageService storage;
  late Dio dio;
  late AuthInterceptor interceptor;
  bool sessionExpiredCalled = false;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    storage = SecureStorageService();
    dio = Dio();
    sessionExpiredCalled = false;
    interceptor = AuthInterceptor(
      storage: storage,
      dio: dio,
      onSessionExpired: () {
        sessionExpiredCalled = true;
      },
    );
  });

  group('AuthInterceptor Tests', () {
    test('onRequest adds X-Client and Authorization header if token exists', () async {
      await storage.saveTokens(
        accessToken: 'initial_access_token_123',
        refreshToken: 'initial_refresh_token_123',
      );

      final options = RequestOptions(path: '/tasks');
      final handler = _TestRequestInterceptorHandler();

      interceptor.onRequest(options, handler);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(options.headers['X-Client'], 'mobile');
      expect(options.headers['Authorization'], 'Bearer initial_access_token_123');
    });

    test('onRequest adds X-Client but no Authorization if token is null', () async {
      final options = RequestOptions(path: '/tasks');
      final handler = _TestRequestInterceptorHandler();

      interceptor.onRequest(options, handler);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(options.headers['X-Client'], 'mobile');
      expect(options.headers['Authorization'], isNull);
    });

    test('onError on 401 without refresh token triggers sessionExpired and clearAuth', () async {
      final options = RequestOptions(path: '/tasks');
      final err = DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: 401,
        ),
      );

      final handler = _TestErrorInterceptorHandler();

      interceptor.onError(err, handler);
      await Future.delayed(const Duration(milliseconds: 100));

      expect(sessionExpiredCalled, isTrue);
      expect(await storage.getAccessToken(), isNull);
    });
  });
}

class _TestRequestInterceptorHandler extends RequestInterceptorHandler {
  @override
  void next(RequestOptions requestOptions) {}
}

class _TestErrorInterceptorHandler extends ErrorInterceptorHandler {
  @override
  void next(DioException err) {}

  @override
  void resolve(Response response) {}
}

