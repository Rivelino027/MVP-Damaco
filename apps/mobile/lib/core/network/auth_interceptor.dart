import 'dart:async';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'api_endpoints.dart';

class AuthInterceptor extends QueuedInterceptor {
  final SecureStorageService _storage;
  final Dio _dio;
  final void Function()? onSessionExpired;

  AuthInterceptor({
    required SecureStorageService storage,
    required Dio dio,
    this.onSessionExpired,
  })  : _storage = storage,
        _dio = dio;

  Completer<String?>? _refreshCompleter;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // 1. Header X-Client wajib bagi backend
    options.headers['X-Client'] = AppConfig.clientHeaderValue;

    // 2. Pasang Authorization Bearer jika ada token
    final token = await _storage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    return handler.next(options);
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final statusCode = response?.statusCode;
    final requestOptions = err.requestOptions;

    // Hanya tangani 401 dan bukan endpoint autentikasi itu sendiri
    final isAuthEndpoint = requestOptions.path.contains('/auth/login') ||
        requestOptions.path.contains('/auth/refresh');

    final isAlreadyRetried = requestOptions.extra['isRetry'] == true;

    if (statusCode == 401 && !isAuthEndpoint && !isAlreadyRetried) {
      try {
        final newAccessToken = await _performRefreshToken();

        if (newAccessToken != null && newAccessToken.isNotEmpty) {
          // Buat ulang request dengan token baru
          final retryOptions = requestOptions.copyWith(
            headers: {
              ...requestOptions.headers,
              'Authorization': 'Bearer $newAccessToken',
            },
            extra: {
              ...requestOptions.extra,
              'isRetry': true,
            },
          );

          final retryResponse = await _dio.fetch(retryOptions);
          return handler.resolve(retryResponse);
        }
      } catch (e) {
        // Refresh gagal: sesi berakhir
        await _storage.clearAuth();
        onSessionExpired?.call();
        return handler.next(err);
      }
    }

    return handler.next(err);
  }

  Future<String?> _performRefreshToken() async {
    // Jika refresh sedang berjalan dari request lain, tunggu hasilnya
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String?>();
    // Menghindari unhandled asynchronous error pada Zone jika tidak ada request paralel lain yang menunggu
    _refreshCompleter!.future.catchError((_) => null);

    try {
      final currentRefreshToken = await _storage.getRefreshToken();
      if (currentRefreshToken == null || currentRefreshToken.isEmpty) {
        throw Exception('Refresh token tidak ditemukan');
      }

      // Gunakan Dio terpisah agar tidak memicu interceptor ini kembali
      final tokenDio = Dio(
        BaseOptions(
          baseUrl: AppConfig.baseUrl,
          connectTimeout: AppConfig.connectTimeout,
          receiveTimeout: AppConfig.receiveTimeout,
          headers: {
            'X-Client': AppConfig.clientHeaderValue,
            'Content-Type': 'application/json',
          },
        ),
      );

      final response = await tokenDio.post(
        ApiEndpoints.refresh,
        data: {'refreshToken': currentRefreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String?;
        final newRefreshToken = data['refreshToken'] as String?;

        if (newAccessToken != null && newRefreshToken != null) {
          await _storage.saveTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          );
          _refreshCompleter?.complete(newAccessToken);
          return newAccessToken;
        }
      }

      throw Exception('Gagal memperbarui token');
    } catch (e) {
      _refreshCompleter?.completeError(e);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }
}

