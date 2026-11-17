import '../entities/notification_entity.dart';

abstract class NotificationsRepository {
  /// Mengambil daftar semua notifikasi pengguna
  Future<List<NotificationEntity>> getNotifications();

  /// Mengambil total notifikasi yang belum dibaca
  Future<int> getUnreadCount();

  /// Menandai satu notifikasi sebagai sudah dibaca
  Future<NotificationEntity> markAsRead(String id);

  /// Menandai seluruh notifikasi pengguna sebagai sudah dibaca
  Future<void> markAllAsRead();

  /// Mendaftarkan token FCM perangkat ke backend
  Future<void> registerDeviceToken({
    required String fcmToken,
    required String platform,
  });

  /// Menghapus pendaftaran token perangkat dari backend saat logout
  Future<void> unregisterDeviceToken({
    required String fcmToken,
  });
}

