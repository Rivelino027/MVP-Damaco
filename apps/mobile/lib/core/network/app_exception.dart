import 'dart:io';
import 'package:dio/dio.dart';

class AppException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  const AppException({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  factory AppException.fromDioException(DioException error) =>
      AppException.fromDio(error);

  factory AppException.fromDio(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const AppException(
          message: 'Koneksi ke server terputus (waktu habis). Silakan coba lagi.',
          statusCode: 408,
        );

      case DioExceptionType.connectionError:
        return const AppException(
          message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
          statusCode: null,
        );

      case DioExceptionType.badResponse:
        final status = error.response?.statusCode;
        final data = error.response?.data;
        final extractedMsg = _extractBackendMessage(data);

        if (extractedMsg != null && extractedMsg.isNotEmpty) {
          return AppException(
            message: extractedMsg,
            statusCode: status,
            originalError: error,
          );
        }

        switch (status) {
          case 400:
            return const AppException(
              message: 'Permintaan tidak valid atau format salah.',
              statusCode: 400,
            );
          case 401:
            return const AppException(
              message: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
              statusCode: 401,
            );
          case 403:
            return const AppException(
              message: 'Anda tidak memiliki hak akses untuk tindakan ini.',
              statusCode: 403,
            );
          case 404:
            return const AppException(
              message: 'Data atau rute tidak ditemukan.',
              statusCode: 404,
            );
          case 409:
            return const AppException(
              message: 'Terjadi konflik data pada server.',
              statusCode: 409,
            );
          case 422:
            return const AppException(
              message: 'Data tidak dapat diproses oleh server.',
              statusCode: 422,
            );
          case 500:
          case 502:
          case 503:
            return const AppException(
              message: 'Terjadi kesalahan pada sistem server. Coba beberapa saat lagi.',
              statusCode: 500,
            );
          default:
            return AppException(
              message: 'Terjadi kesalahan ($status). Silakan coba lagi.',
              statusCode: status,
            );
        }

      case DioExceptionType.cancel:
        return const AppException(
          message: 'Permintaan telah dibatalkan.',
        );

      case DioExceptionType.badCertificate:
        return const AppException(
          message: 'Sertifikat keamanan server tidak valid.',
        );

      case DioExceptionType.unknown:
        if (error.error is SocketException) {
          return const AppException(
            message: 'Tidak ada koneksi internet. Periksa jaringan Anda.',
          );
        }
        return AppException(
          message: 'Terjadi kesalahan yang tidak terduga.',
          originalError: error,
        );
    }
  }

  static String? _extractBackendMessage(dynamic data) {
    if (data == null) return null;
    if (data is Map<String, dynamic>) {
      final msg = data['message'];
      if (msg is String) return msg;
      if (msg is List && msg.isNotEmpty) {
        return msg.first.toString();
      }
      final error = data['error'];
      if (error is String) return error;
    }
    if (data is String && data.isNotEmpty) {
      return data;
    }
    return null;
  }

  @override
  String toString() => message;
}
