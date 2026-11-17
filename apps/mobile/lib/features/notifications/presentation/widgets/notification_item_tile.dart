import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/notification_entity.dart';
import '../../services/notification_navigator.dart';
import '../providers/notifications_provider.dart';

class NotificationItemTile extends ConsumerWidget {
  final NotificationEntity item;

  const NotificationItemTile({
    super.key,
    required this.item,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUnread = item.isUnread;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          // 1. Tandai sudah dibaca di server & provider lokal
          if (isUnread) {
            ref.read(notificationsListProvider.notifier).markAsRead(item.id);
          }
          // 2. Navigasikan ke entitas terkait (task, timesheet, expense)
          NotificationNavigator.navigate(
            context,
            refType: item.refType,
            refId: item.refId,
          );
        },
        borderRadius: AppSpacing.roundedCard,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isUnread ? const Color(0xFFFBF8FD) : Colors.white,
            borderRadius: AppSpacing.roundedCard,
            border: Border.all(
              color: isUnread
                  ? AppColors.primary.withAlpha(45)
                  : AppColors.border,
              width: isUnread ? 1.2 : 1.0,
            ),
            boxShadow: AppSpacing.softShadow,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Kategori Notifikasi
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: item.iconColor.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  item.iconData,
                  color: item.iconColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Konten Notifikasi
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: AppTextStyles.subtitle2.copyWith(
                              fontWeight: isUnread
                                  ? FontWeight.w700
                                  : FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          item.displayTime,
                          style: AppTextStyles.caption.copyWith(
                            fontSize: 11,
                            color: isUnread
                                ? AppColors.primary
                                : AppColors.textSecondary,
                            fontWeight: isUnread
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.body,
                      style: AppTextStyles.body2.copyWith(
                        color: isUnread
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),

              // Indikator Titik Ungu untuk Belum Dibaca
              if (isUnread) ...[
                const SizedBox(width: AppSpacing.sm),
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 6),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

