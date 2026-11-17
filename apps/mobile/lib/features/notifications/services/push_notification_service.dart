import 'dart:convert';
import 'dart:io' show Platform;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../domain/repositories/notifications_repository.dart';
import 'notification_navigator.dart';

/// Top-level background message handler wajib di-annotasi entry-point untuk FCM
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
  } catch (_) {
    // Graceful handling jika konfigurasi firebase belum lengkap
  }
}

class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _highImportanceChannel =
      AndroidNotificationChannel(
    'damacoflow_high_importance',
    'DamacoFlow Notifikasi',
    description: 'Saluran notifikasi pembaruan task, timesheet, dan pengeluaran DamacoFlow',
    importance: Importance.high,
  );

  bool _isInitialized = false;
  bool _isFirebaseAvailable = false;

  bool get isFirebaseAvailable => _isFirebaseAvailable;

  /// Inisialisasi Firebase & local notifications secara aman.
  /// Tidak akan menyebabkan crash meskipun file google-services.json belum dipasang.
  Future<void> initialize({NotificationsRepository? repository}) async {
    if (_isInitialized) return;

    try {
      // 1. Inisialisasi Firebase Core jika didukung platform
      if (!kIsWeb && (Platform.isAndroid || Platform.isIOS || Platform.isMacOS)) {
        if (Firebase.apps.isEmpty) {
          await Firebase.initializeApp();
        }
        _isFirebaseAvailable = true;
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Firebase init dilewati/belum terkonfigurasi: $e');
      _isFirebaseAvailable = false;
    }

    // 2. Inisialisasi Flutter Local Notifications
    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          final payload = response.payload;
          if (payload != null && payload.isNotEmpty) {
            try {
              final map = jsonDecode(payload) as Map<String, dynamic>;
              final refType = map['refType']?.toString();
              final refId = map['refId']?.toString();
              NotificationNavigator.navigateFromGlobal(
                refType: refType,
                refId: refId,
              );
            } catch (_) {
              NotificationNavigator.navigateFromGlobal();
            }
          }
        },
      );

      // Buat notification channel di Android
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_highImportanceChannel);
    } catch (e) {
      debugPrint('[PushNotificationService] Local notifications init error: $e');
    }

    // 3. Konfigurasi FCM Handlers jika Firebase tersedia
    if (_isFirebaseAvailable) {
      try {
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

        // Minta izin notifikasi
        await requestNotificationPermissions();

        // Handle pesan Foreground
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          _showForegroundNotification(message);
        });

        // Handle tap notifikasi saat di Background
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          _handleMessageNavigation(message);
        });

        // Handle tap notifikasi saat aplikasi Terminated (Mati)
        final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
        if (initialMessage != null) {
          // Delay singkat agar router terpasang sempurna
          Future.delayed(const Duration(milliseconds: 500), () {
            _handleMessageNavigation(initialMessage);
          });
        }

        // Pantau perubahan token FCM jika repository diberikan
        if (repository != null) {
          FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
            registerCurrentToken(repository, customToken: newToken);
          });
        }
      } catch (e) {
        debugPrint('[PushNotificationService] FCM setup error: $e');
      }
    }

    _isInitialized = true;
  }

  /// Meminta izin notifikasi ke OS (iOS & Android 13+)
  Future<bool> requestNotificationPermissions() async {
    try {
      if (!_isFirebaseAvailable) return false;

      // Izin Android 13+ (POST_NOTIFICATIONS)
      if (!kIsWeb && Platform.isAndroid) {
        final androidPlugin = _localNotifications
            .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin>();
        final granted = await androidPlugin?.requestNotificationsPermission();
        if (granted != null) return granted;
      }

      // Izin iOS
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      return settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
    } catch (e) {
      debugPrint('[PushNotificationService] Request permission error: $e');
      return false;
    }
  }

  /// Menampilkan popup notifikasi lokal saat aplikasi berada di Foreground
  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    final data = message.data;

    final title = notification?.title ?? data['title'] ?? 'Pemberitahuan Baru';
    final body = notification?.body ?? data['body'] ?? '';

    final payload = jsonEncode(data);

    final androidDetails = AndroidNotificationDetails(
      _highImportanceChannel.id,
      _highImportanceChannel.name,
      channelDescription: _highImportanceChannel.description,
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      message.hashCode,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Mengekstrak referensi dokumen dan membuka deep-link yang sesuai
  void _handleMessageNavigation(RemoteMessage message) {
    final data = message.data;
    final refType = data['refType']?.toString();
    final refId = data['refId']?.toString();
    NotificationNavigator.navigateFromGlobal(refType: refType, refId: refId);
  }

  /// Mendaftarkan token perangkat pengguna saat ini ke backend
  Future<void> registerCurrentToken(
    NotificationsRepository repository, {
    String? customToken,
  }) async {
    try {
      if (!_isFirebaseAvailable) return;

      final token = customToken ?? await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) return;

      final platform = kIsWeb
          ? 'web'
          : Platform.isIOS
              ? 'ios'
              : 'android';

      await repository.registerDeviceToken(
        fcmToken: token,
        platform: platform,
      );
      debugPrint('[PushNotificationService] FCM token registered: ${token.substring(0, 10)}...');
    } catch (e) {
      debugPrint('[PushNotificationService] Register token error: $e');
    }
  }

  /// Menghapus pendaftaran token dari backend saat pengguna Logout
  Future<void> deleteCurrentToken(NotificationsRepository repository) async {
    try {
      if (!_isFirebaseAvailable) return;

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await repository.unregisterDeviceToken(fcmToken: token);
      }
      await FirebaseMessaging.instance.deleteToken();
      debugPrint('[PushNotificationService] FCM token deleted on logout');
    } catch (e) {
      debugPrint('[PushNotificationService] Delete token error: $e');
    }
  }
}

