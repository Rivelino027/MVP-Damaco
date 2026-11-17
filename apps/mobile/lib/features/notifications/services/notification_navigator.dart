import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/router/app_routes.dart';

class NotificationNavigator {
  NotificationNavigator._();

  /// Memetakan referensi notifikasi (refType & refId) ke path rute aplikasi.
  /// Sumber kebenaran untuk navigasi deep-link notifikasi in-app maupun push.
  static String resolveRoute({String? refType, String? refId}) {
    if (refType == null || refType.trim().isEmpty) {
      return AppRoutes.notifications;
    }

    final normalized = refType.trim().toLowerCase();
    switch (normalized) {
      case 'task':
        if (refId != null && refId.trim().isNotEmpty) {
          return AppRoutes.taskDetailPath(refId.trim());
        }
        return AppRoutes.tasks;

      case 'timesheet':
        return AppRoutes.timesheet;

      case 'expense':
        if (refId != null && refId.trim().isNotEmpty) {
          return AppRoutes.expenseDetailPath(refId.trim());
        }
        return AppRoutes.expenses;

      default:
        return AppRoutes.notifications;
    }
  }

  /// Menavigasikan pengguna berdasarkan konteks UI lokal (misal: tap item di NotificationsPage)
  static void navigate(BuildContext context, {String? refType, String? refId}) {
    final route = resolveRoute(refType: refType, refId: refId);
    context.push(route);
  }

  /// Menavigasikan pengguna saat aplikasi menerima background/terminated push notification
  static void navigateFromGlobal({String? refType, String? refId}) {
    final route = resolveRoute(refType: refType, refId: refId);
    final context = rootNavigatorKey.currentContext;
    if (context != null) {
      GoRouter.of(context).push(route);
    }
  }
}

