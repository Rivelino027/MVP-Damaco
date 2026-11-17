import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/repositories/notifications_repository_mock.dart';
import '../../data/repositories/notifications_repository_remote.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/entities/notification_settings_entity.dart';
import '../../domain/repositories/notifications_repository.dart';
import '../controllers/notification_settings_controller.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  if (AppConfig.useMockData) {
    return NotificationsRepositoryMock();
  }
  final dioClient = ref.watch(dioClientProvider);
  return NotificationsRepositoryRemote(dioClient: dioClient);
});

final notificationSettingsProvider =
    StateNotifierProvider<NotificationSettingsController, NotificationSettingsEntity>(
  (ref) {
    final storage = ref.watch(secureStorageServiceProvider);
    return NotificationSettingsController(storage: storage);
  },
);

class NotificationsListNotifier
    extends AutoDisposeAsyncNotifier<List<NotificationEntity>> {
  @override
  Future<List<NotificationEntity>> build() async {
    final repo = ref.watch(notificationsRepositoryProvider);
    return repo.getNotifications();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(notificationsRepositoryProvider);
      return repo.getNotifications();
    });
  }

  Future<void> markAsRead(String id) async {
    final repo = ref.read(notificationsRepositoryProvider);
    try {
      final updated = await repo.markAsRead(id);
      state = state.whenData((list) {
        return list.map((item) => item.id == id ? updated : item).toList();
      });
    } catch (_) {
      // Abaikan jika gagal agar tidak memblokir navigasi
    }
  }

  Future<void> markAllAsRead() async {
    final repo = ref.read(notificationsRepositoryProvider);
    try {
      await repo.markAllAsRead();
      final now = DateTime.now();
      state = state.whenData((list) {
        return list.map((item) => item.copyWith(readAt: now)).toList();
      });
    } catch (_) {
      // Abaikan jika gagal
    }
  }
}

final notificationsListProvider = AutoDisposeAsyncNotifierProvider<
    NotificationsListNotifier, List<NotificationEntity>>(
  NotificationsListNotifier.new,
);

/// Provider reaktif untuk menghitung jumlah notifikasi yang belum dibaca.
/// Digunakan oleh titik merah pada lonceng di semua layar (Beranda, Task, Jam, Biaya).
final unreadNotificationsCountProvider = Provider<int>((ref) {
  final asyncNotifications = ref.watch(notificationsListProvider);
  return asyncNotifications.maybeWhen(
    data: (list) => list.where((n) => n.isUnread).length,
    orElse: () => 0,
  );
});

