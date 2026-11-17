import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/network/dio_client.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/repositories/notifications_repository.dart';

class NotificationsRepositoryRemote implements NotificationsRepository {
  final DioClient _dioClient;

  NotificationsRepositoryRemote({required DioClient dioClient})
      : _dioClient = dioClient;

  @override
  Future<List<NotificationEntity>> getNotifications() async {
    try {
      final response = await _dioClient.get(ApiEndpoints.notifications);
      final rawData = response.data;
      final List<dynamic> list;

      if (rawData is List) {
        list = rawData;
      } else if (rawData is Map<String, dynamic> && rawData['data'] is List) {
        list = rawData['data'] as List;
      } else {
        list = [];
      }

      return list
          .map((item) => NotificationEntity.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Backend belum mengimplementasikan endpoint /notifications (Fase 8),
      // kembalikan daftar kosong secara aman agar layar tidak error
      if (e.response?.statusCode == 404) {
        return [];
      }
      throw AppException.fromDio(e);
    }
  }

  @override
  Future<int> getUnreadCount() async {
    try {
      final notifications = await getNotifications();
      return notifications.where((n) => n.isUnread).length;
    } catch (_) {
      return 0;
    }
  }

  @override
  Future<NotificationEntity> markAsRead(String id) async {
    try {
      final response = await _dioClient.patch(
        ApiEndpoints.markNotificationAsRead(id),
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final payload = data['data'] is Map<String, dynamic>
            ? data['data'] as Map<String, dynamic>
            : data;
        return NotificationEntity.fromJson(payload);
      }
      return NotificationEntity(
        id: id,
        userId: '',
        type: 'system',
        title: '',
        body: '',
        readAt: DateTime.now(),
        createdAt: DateTime.now(),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return NotificationEntity(
          id: id,
          userId: '',
          type: 'system',
          title: '',
          body: '',
          readAt: DateTime.now(),
          createdAt: DateTime.now(),
        );
      }
      throw AppException.fromDio(e);
    }
  }

  @override
  Future<void> markAllAsRead() async {
    try {
      await _dioClient.patch(ApiEndpoints.markAllNotificationsAsRead);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return;
      }
      throw AppException.fromDio(e);
    }
  }

  @override
  Future<void> registerDeviceToken({
    required String fcmToken,
    required String platform,
  }) async {
    try {
      await _dioClient.post(
        ApiEndpoints.registerDeviceToken,
        data: {
          'fcmToken': fcmToken,
          'platform': platform.toLowerCase(),
        },
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return;
      }
      throw AppException.fromDio(e);
    }
  }

  @override
  Future<void> unregisterDeviceToken({
    required String fcmToken,
  }) async {
    try {
      await _dioClient.delete(
        ApiEndpoints.unregisterDeviceToken(fcmToken),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return;
      }
      throw AppException.fromDio(e);
    }
  }
}
