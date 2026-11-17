import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/core/storage/secure_storage_service.dart';
import 'package:damacoflow/features/notifications/data/repositories/notifications_repository_mock.dart';
import 'package:damacoflow/features/notifications/domain/entities/notification_entity.dart';
import 'package:damacoflow/features/notifications/domain/entities/notification_settings_entity.dart';
import 'package:damacoflow/features/notifications/presentation/controllers/notification_settings_controller.dart';

void main() {
  group('NotificationEntity - Model & Parsing', () {
    test('Mengonversi JSON ke NotificationEntity dengan tepat', () {
      final json = {
        'id': 'notif-101',
        'userId': 'usr-001',
        'type': 'task',
        'title': 'Task Baru Ditugaskan',
        'body': 'Segera kerjakan tugas konfigurasi.',
        'refType': 'task',
        'refId': 'tsk-001',
        'readAt': null,
        'createdAt': '2026-10-15T08:30:00.000Z',
      };

      final entity = NotificationEntity.fromJson(json);

      expect(entity.id, equals('notif-101'));
      expect(entity.userId, equals('usr-001'));
      expect(entity.type, equals('task'));
      expect(entity.title, equals('Task Baru Ditugaskan'));
      expect(entity.body, equals('Segera kerjakan tugas konfigurasi.'));
      expect(entity.refType, equals('task'));
      expect(entity.refId, equals('tsk-001'));
      expect(entity.isUnread, isTrue);
      expect(entity.isRead, isFalse);
    });

    test('Mendeteksi status isRead dan isUnread sesuai readAt', () {
      final unreadNotif = NotificationEntity(
        id: '1',
        userId: 'u1',
        type: 'task',
        title: 'T1',
        body: 'B1',
        readAt: null,
        createdAt: DateTime.now(),
      );
      expect(unreadNotif.isUnread, isTrue);
      expect(unreadNotif.isRead, isFalse);

      final readNotif = unreadNotif.copyWith(readAt: DateTime.now());
      expect(readNotif.isUnread, isFalse);
      expect(readNotif.isRead, isTrue);
    });

    test('Memberikan iconData dan iconColor yang sesuai berdasarkan refType', () {
      final taskNotif = NotificationEntity(
        id: '1',
        userId: 'u1',
        type: 'task',
        title: 'Task',
        body: 'Desc',
        refType: 'task',
        createdAt: DateTime.now(),
      );
      expect(taskNotif.iconData, isNotNull);
      expect(taskNotif.iconColor, isNotNull);

      final expenseNotif = taskNotif.copyWith(refType: 'expense');
      expect(expenseNotif.iconData, isNotNull);

      final timesheetNotif = taskNotif.copyWith(refType: 'timesheet');
      expect(timesheetNotif.iconData, isNotNull);
    });
  });

  group('NotificationsRepositoryMock - Operasi Notifikasi & Token', () {
    late NotificationsRepositoryMock repository;

    setUp(() {
      repository = NotificationsRepositoryMock();
    });

    test('Mengambil daftar notifikasi awal dengan status terurut', () async {
      final list = await repository.getNotifications();
      expect(list.isNotEmpty, isTrue);
      expect(list.length, equals(5));

      // Verifikasi urutan createdAt descending
      for (int i = 0; i < list.length - 1; i++) {
        expect(
          list[i].createdAt.isAfter(list[i + 1].createdAt) ||
              list[i].createdAt.isAtSameMomentAs(list[i + 1].createdAt),
          isTrue,
        );
      }
    });

    test('Menghitung unread count awal dengan akurat', () async {
      final unreadCount = await repository.getUnreadCount();
      // Terdapat 2 notifikasi yang belum dibaca pada mock awal
      expect(unreadCount, equals(2));
    });

    test('Menandai satu notifikasi sebagai dibaca (markAsRead)', () async {
      final updated = await repository.markAsRead('notif-001');
      expect(updated.id, equals('notif-001'));
      expect(updated.isRead, isTrue);
      expect(updated.readAt, isNotNull);

      final newCount = await repository.getUnreadCount();
      expect(newCount, equals(1));
    });

    test('Menandai semua notifikasi sebagai dibaca (markAllAsRead)', () async {
      await repository.markAllAsRead();
      final unreadCount = await repository.getUnreadCount();
      expect(unreadCount, equals(0));

      final allNotifs = await repository.getNotifications();
      expect(allNotifs.every((n) => n.isRead), isTrue);
    });

    test('Registrasi dan penghapusan token perangkat FCM', () async {
      // Registrasi token
      await expectLater(
        repository.registerDeviceToken(
          fcmToken: 'mock_fcm_token_123',
          platform: 'android',
        ),
        completes,
      );

      // Hapus token
      await expectLater(
        repository.unregisterDeviceToken(fcmToken: 'mock_fcm_token_123'),
        completes,
      );
    });
  });

  group('NotificationSettingsEntity & Controller', () {
    test('Default NotificationSettingsEntity bernilai aktif', () {
      const settings = NotificationSettingsEntity();
      expect(settings.pushEnabled, isTrue);
      expect(settings.soundEnabled, isTrue);
      expect(settings.taskAssigned, isTrue);
      expect(settings.expenseUpdates, isTrue);
      expect(settings.timesheetReminders, isTrue);
    });

    test('NotificationSettingsController mampu mengubah status toggle', () async {
      final controller = NotificationSettingsController(
        storage: SecureStorageService(),
      );

      expect(controller.state.pushEnabled, isTrue);

      await controller.togglePush(false);
      expect(controller.state.pushEnabled, isFalse);

      await controller.togglePush(true);
      expect(controller.state.pushEnabled, isTrue);
    });
  });
}

