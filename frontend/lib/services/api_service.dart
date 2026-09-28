import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  // IP IPv4 Komputer/Laptop Anda saat ini di jaringan Wi-Fi
  static const String _serverIp = '192.168.22.138';

  // Durasi timeout HTTP request
  static const Duration _timeoutDuration = Duration(seconds: 10);

  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    } else if (Platform.isAndroid) {
      // Direct localhost works on emulator with adb reverse or 10.0.2.2
      return 'http://10.0.2.2:5000/api';
    } else {
      return 'http://$_serverIp:5000/api';
    }
  }

  static String? _cachedBaseUrl;

  static List<String> get _candidateBaseUrls {
    if (_cachedBaseUrl != null) {
      return [_cachedBaseUrl!];
    }
    if (kIsWeb) return ['http://localhost:5000/api'];
    return [
      baseUrl,
      'http://localhost:5000/api',
      'http://127.0.0.1:5000/api',
      'http://$_serverIp:5000/api',
    ];
  }

  static String? token;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static Future<dynamic> get(String endpoint) async {
    Object? lastError;
    final urls = List<String>.from(_candidateBaseUrls);
    for (final base in urls) {
      http.Response? response;
      try {
        response = await http
            .get(
              Uri.parse('$base$endpoint'),
              headers: _headers,
            )
            .timeout(_timeoutDuration);
        _cachedBaseUrl = base;
      } catch (e) {
        lastError = e;
        _cachedBaseUrl = null;
        continue;
      }
      return _handleResponse(response);
    }
    throw Exception(lastError?.toString().replaceAll('Exception: ', '') ?? 'Gagal terhubung ke server backend DAMACO. Pastikan server backend (port 5000) berjalan.');
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> data) async {
    Object? lastError;
    final urls = List<String>.from(_candidateBaseUrls);
    for (final base in urls) {
      http.Response? response;
      try {
        response = await http
            .post(
              Uri.parse('$base$endpoint'),
              headers: _headers,
              body: jsonEncode(data),
            )
            .timeout(_timeoutDuration);
        _cachedBaseUrl = base;
      } catch (e) {
        lastError = e;
        _cachedBaseUrl = null;
        continue;
      }
      return _handleResponse(response);
    }
    throw Exception(lastError?.toString().replaceAll('Exception: ', '') ?? 'Gagal terhubung ke server backend DAMACO. Data TIDAK tersimpan ke database.');
  }

  static Future<dynamic> put(String endpoint, Map<String, dynamic> data) async {
    Object? lastError;
    final urls = List<String>.from(_candidateBaseUrls);
    for (final base in urls) {
      http.Response? response;
      try {
        response = await http
            .put(
              Uri.parse('$base$endpoint'),
              headers: _headers,
              body: jsonEncode(data),
            )
            .timeout(_timeoutDuration);
        _cachedBaseUrl = base;
      } catch (e) {
        lastError = e;
        _cachedBaseUrl = null;
        continue;
      }
      return _handleResponse(response);
    }
    throw Exception(lastError?.toString().replaceAll('Exception: ', '') ?? 'Gagal memperbarui data di server backend DAMACO.');
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> data) async {
    Object? lastError;
    final urls = List<String>.from(_candidateBaseUrls);
    for (final base in urls) {
      http.Response? response;
      try {
        response = await http
            .patch(
              Uri.parse('$base$endpoint'),
              headers: _headers,
              body: jsonEncode(data),
            )
            .timeout(_timeoutDuration);
        _cachedBaseUrl = base;
      } catch (e) {
        lastError = e;
        _cachedBaseUrl = null;
        continue;
      }
      return _handleResponse(response);
    }
    throw Exception(lastError?.toString().replaceAll('Exception: ', '') ?? 'Gagal mengubah status data di server backend DAMACO.');
  }

  static Future<dynamic> delete(String endpoint) async {
    Object? lastError;
    final urls = List<String>.from(_candidateBaseUrls);
    for (final base in urls) {
      http.Response? response;
      try {
        response = await http
            .delete(
              Uri.parse('$base$endpoint'),
              headers: _headers,
            )
            .timeout(_timeoutDuration);
        _cachedBaseUrl = base;
      } catch (e) {
        lastError = e;
        _cachedBaseUrl = null;
        continue;
      }
      return _handleResponse(response);
    }
    throw Exception(lastError?.toString().replaceAll('Exception: ', '') ?? 'Gagal menghapus data dari server backend DAMACO.');
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } else {
      try {
        final errorJson = jsonDecode(response.body);
        final msg = errorJson['message'] ?? errorJson['error'] ?? 'Terjadi kesalahan pada server';
        throw Exception(msg.toString());
      } catch (e) {
        if (e is Exception && !e.toString().contains('FormatException')) {
          rethrow;
        }
        throw Exception('Server mengembalikan status ${response.statusCode}: Gagal memproses data.');
      }
    }
  }
}
