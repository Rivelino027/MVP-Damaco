import 'dart:async';
import '../../domain/entities/notification_entity.dart';
import '../../domain/repositories/notifications_repository.dart';

class NotificationsRepositoryMock implements NotificationsRepository {
  // In-memory list notifikasi realistis sesuai data task, timesheet, dan expense
  final List<NotificationEntity> _notifications = [
    NotificationEntity(
      id: 'notif-001',
      userId: 'usr-001',
      type: 'task',
      title: 'Task Baru Ditugaskan',
      body: 'Anda ditugaskan pada "Konfigurasi VLAN Lantai 2" oleh Admin IT.',
      refType: 'task',
      refId: 'tsk-001',
      readAt: null, // Belum dibaca
      createdAt: DateTime.now().subtract(const Duration(minutes: 10)),
    ),
    NotificationEntity(
      id: 'notif-002',
      userId: 'usr-001',
      type: 'expense',
      title: 'Pengeluaran Disetujui Finance',
      body: 'Pengeluaran "Lisensi software desain" telah disetujui dan siap dibayar.',
      refType: 'expense',
      refId: 'exp-005',
      readAt: null, // Belum dibaca
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    NotificationEntity(
      id: 'notif-003',
      userId: 'usr-001',
      type: 'timesheet',
      title: 'Timesheet Disetujui',
      body: 'Timesheet periode 05 - 11 Okt 2026 telah disetujui oleh Admin.',
      refType: 'timesheet',
      refId: null,
      readAt: DateTime.now().subtract(const Duration(days: 1, hours: 2)), // Sudah dibaca
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    NotificationEntity(
      id: 'notif-004',
      userId: 'usr-001',
      type: 'expense',
      title: 'Pengeluaran Ditolak',
      body: 'Pengeluaran "Konsumsi rapat vendor" ditolak Admin. Alasan: Nota tidak terbaca.',
      refType: 'expense',
      refId: 'exp-004',
      readAt: DateTime.now().subtract(const Duration(days: 2)), // Sudah dibaca
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    NotificationEntity(
      id: 'notif-005',
      userId: 'usr-001',
      type: 'task',
      title: 'Review Task Selesai',
      body: 'Task "Dokumentasi topologi jaringan" telah direview oleh Supervisor.',
      refType: 'task',
      refId: 'tsk-002',
      readAt: DateTime.now().subtract(const Duration(days: 3)), // Sudah dibaca
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
  ];

  final Set<String> _deviceTokens = {};

  @override
  Future<List<NotificationEntity>> getNotifications() async {
    await Future.delayed(const Duration(milliseconds: 300));
    final sorted = List<NotificationEntity>.from(_notifications);
    sorted.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return sorted;
  }

  @override
  Future<int> getUnreadCount() async {
    return _notifications.where((n) => n.isUnread).length;
  }

  @override
  Future<NotificationEntity> markAsRead(String id) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      final existing = _notifications[index];
      if (existing.isUnread) {
        final updated = existing.copyWith(readAt: DateTime.now());
        _notifications[index] = updated;
        return updated;
      }
      return existing;
    }
    throw Exception('Notifikasi dengan id $id tidak ditemukan');
  }

  @override
  Future<void> markAllAsRead() async {
    await Future.delayed(const Duration(milliseconds: 250));
    final now = DateTime.now();
    for (int i = 0; i < _notifications.length; i++) {
      if (_notifications[i].isUnread) {
        _notifications[i] = _notifications[i].copyWith(readAt: now);
      }
    }
  }

  @override
  Future<void> registerDeviceToken({
    required String fcmToken,
    required String platform,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));
    _deviceTokens.add(fcmToken);
  }

  @override
  Future<void> unregisterDeviceToken({
    required String fcmToken,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));
    _deviceTokens.remove(fcmToken);
  }
}

