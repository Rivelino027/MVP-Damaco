import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'environment.dart';

class AppConfig {
  AppConfig._();

  /// Nama aplikasi terpusat (default: DamacoFlow)
  static const String appName = 'DamacoFlow';

  /// Lingkungan aplikasi saat ini
  static const AppEnvironment environment = AppEnvironment.dev;

  /// Flag penggunaan data tiruan (mock) untuk pengujian mandiri
  static const bool useMockData = false;

  /// Batas default pengeluaran Nominal Besar (Rp 5.000.000)
  static const double defaultApprovalLimit = 5000000.0;

  /// Durasi timeout jaringan
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  /// Base URL REST API
  /// Pada Android Emulator, 'localhost' dipetakan ke 10.0.2.2.
  static String get baseUrl {
    const customUrl = String.fromEnvironment('API_BASE_URL');
    if (customUrl.isNotEmpty) return customUrl;

    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3002';
    }
    return 'http://localhost:3002';
  }

  /// Header klien wajib untuk backend
  static const String clientHeaderValue = 'mobile';

  /// Kontak Dukungan
  static const String supportEmail = 'support@damacoflow.id';
  static const String supportWhatsApp = '6281234567890';
  static const String supportSubject = 'Bantuan Aplikasi DamacoFlow';
}

