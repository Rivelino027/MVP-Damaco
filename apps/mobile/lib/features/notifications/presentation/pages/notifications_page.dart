import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/app_button.dart';
import '../../domain/entities/notification_entity.dart';
import '../providers/notifications_provider.dart';
import '../widgets/notification_item_tile.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsListProvider);
    final unreadCount = ref.watch(unreadNotificationsCountProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded, size: 28),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Notifikasi',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        centerTitle: false,
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: () async {
                await ref
                    .read(notificationsListProvider.notifier)
                    .markAllAsRead();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Semua notifikasi telah ditandai dibaca'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                }
              },
              icon: const Icon(
                Icons.done_all_rounded,
                size: 18,
                color: AppColors.primary,
              ),
              label: Text(
                'Tandai dibaca',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => _buildLoadingState(),
        error: (error, _) => _buildErrorState(context, ref, error),
        data: (notifications) {
          if (notifications.isEmpty) {
            return _buildEmptyState(context, ref);
          }
          return _buildContentState(context, ref, notifications, unreadCount);
        },
      ),
    );
  }

  /// 1. State Loading (Skeleton Shimmer)
  Widget _buildLoadingState() {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: 5,
      itemBuilder: (_, __) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: Shimmer.fromColors(
          baseColor: Colors.grey.shade200,
          highlightColor: Colors.grey.shade100,
          child: Container(
            height: 88,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: AppSpacing.roundedCard,
            ),
          ),
        ),
      ),
    );
  }

  /// 2. State Error
  Widget _buildErrorState(BuildContext context, WidgetRef ref, Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFFFCE4E7),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: AppColors.danger,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Gagal Memuat Notifikasi',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Terjadi kendala saat mengambil data notifikasi dari server. Silakan coba kembali.',
              textAlign: TextAlign.center,
              style: AppTextStyles.body2,
            ),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: 160,
              child: AppButton(
                text: 'Coba Lagi',
                variant: AppButtonVariant.primary,
                icon: Icons.refresh_rounded,
                onPressed: () {
                  ref.read(notificationsListProvider.notifier).refresh();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 3. State Kosong (Empty)
  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        await ref.read(notificationsListProvider.notifier).refresh();
      },
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.notifications_off_outlined,
                size: 56,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Belum Ada Notifikasi',
            textAlign: TextAlign.center,
            style: AppTextStyles.h3,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Semua pemberitahuan penugasan task, persetujuan timesheet, dan status pengeluaran Anda akan ditampilkan di sini.',
            textAlign: TextAlign.center,
            style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  /// 4. State Konten (Daftar Notifikasi)
  Widget _buildContentState(
    BuildContext context,
    WidgetRef ref,
    List<NotificationEntity> notifications,
    int unreadCount,
  ) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        await ref.read(notificationsListProvider.notifier).refresh();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          if (unreadCount > 0) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md, left: 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$unreadCount Belum Dibaca',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          ...notifications.map((item) => NotificationItemTile(item: item)),
        ],
      ),
    );
  }
}
