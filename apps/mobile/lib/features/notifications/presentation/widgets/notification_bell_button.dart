import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/notifications_provider.dart';

class NotificationBellButton extends ConsumerWidget {
  final Color? color;
  final double iconSize;

  const NotificationBellButton({
    super.key,
    this.color,
    this.iconSize = 26,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final hasUnread = unreadCount > 0;
    final iconColor = color ?? AppColors.textPrimary;

    return Semantics(
      label: hasUnread
          ? 'Notifikasi, $unreadCount belum dibaca'
          : 'Notifikasi, tidak ada pesan baru',
      button: true,
      child: IconButton(
        onPressed: () => context.push(AppRoutes.notifications),
        icon: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(
              Icons.notifications_none_rounded,
              size: iconSize,
              color: iconColor,
            ),
            if (hasUnread)
              Positioned(
                top: 1,
                right: 1,
                child: Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: AppColors.glowRed,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

