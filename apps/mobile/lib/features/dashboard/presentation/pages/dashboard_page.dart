import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../notifications/presentation/widgets/notification_bell_button.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/dashboard_kpi_card.dart';
import '../widgets/expense_compact_card.dart';
import '../widgets/task_horizontal_card.dart';
import '../widgets/weekly_target_card.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardNotifierProvider);
    final user = ref.watch(currentUserProvider);

    // Dapatkan nama depan pengguna untuk sapaan
    final fullName = user?.name ?? 'Pengguna';
    final firstName = fullName.trim().split(' ').first;
    final greeting = DateFormatter.getGreeting();
    final todayDate = DateFormatter.formatFullDayAndDate(DateTime.now());

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: dashboardAsync.when(
          loading: () => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.screenPaddingHorizontal, 16, AppSpacing.screenPaddingHorizontal, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context, greeting, firstName, todayDate, false),
                const SizedBox(height: 20),
                const SkeletonList(itemCount: 4, itemHeight: 90),
              ],
            ),
          ),
          error: (err, stack) => Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.screenPaddingHorizontal),
              child: ErrorState(
                message: err.toString(),
                onRetry: () {
                  ref.read(dashboardNotifierProvider.notifier).refresh();
                },
              ),
            ),
          ),
          data: (summary) {
            return RefreshIndicator(
              color: AppColors.primary,
              backgroundColor: Colors.white,
              onRefresh: () async {
                await ref.read(dashboardNotifierProvider.notifier).refresh();
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenPaddingHorizontal,
                  16,
                  AppSpacing.screenPaddingHorizontal,
                  100, // Memberikan ruang ekstra untuk floating bottom nav
                ),
                children: [
                  // 1. Header Sapaan & Lonceng Notifikasi
                  _buildHeader(
                    context,
                    greeting,
                    firstName,
                    todayDate,
                    summary.hasUnreadNotifications,
                  ),
                  const SizedBox(height: 18),

                  // 2. Kartu Target Mingguan (Gradient Gelap Ungu + Progress Ring)
                  WeeklyTargetCard(
                    filledHours: summary.weeklyFilledHours,
                    targetHours: summary.weeklyTargetHours,
                    onFillTimesheet: () {
                      context.go(AppRoutes.timesheet);
                    },
                  ),
                  const SizedBox(height: 18),

                  // 3. Tiga Kartu KPI Ringkasan
                  DashboardKpiRow(
                    activeTasksCount: summary.activeTasksCount,
                    dueTasksCount: summary.dueTasksCount,
                    pendingApprovalsCount: summary.pendingApprovalsCount,
                  ),
                  const SizedBox(height: 24),

                  // 4. Bagian "Task Saya" (Scroll Horizontal)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Task Saya',
                        style: AppTextStyles.h3.copyWith(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          context.go(AppRoutes.tasks);
                        },
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Lihat semua',
                          style: AppTextStyles.caption.copyWith(
                            color: const Color(0xFF6B26B2),
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (summary.recentTasks.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: AppSpacing.roundedCard,
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: const EmptyState(
                        title: 'Belum Ada Task',
                        message: 'Tidak ada task yang sedang aktif.',
                      ),
                    )
                  else
                    SizedBox(
                      height: 125,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: summary.recentTasks.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final task = summary.recentTasks[index];
                          return TaskHorizontalCard(
                            task: task,
                            onTap: () {
                              context.push('/tasks/${task.id}');
                            },
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 24),

                  // 5. Bagian "Pengeluaran Saya" (Daftar Ringkas Vertikal)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pengeluaran Saya',
                        style: AppTextStyles.h3.copyWith(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          context.go(AppRoutes.expenses);
                        },
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Lihat semua',
                          style: AppTextStyles.caption.copyWith(
                            color: const Color(0xFF6B26B2),
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (summary.recentExpenses.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        color: AppColors.cardBackground,
                        borderRadius: AppSpacing.roundedCard,
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: const EmptyState(
                        title: 'Belum Ada Pengeluaran',
                        message: 'Pengajuan pengeluaran Anda akan tampil di sini.',
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: summary.recentExpenses.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final expense = summary.recentExpenses[index];
                        return ExpenseCompactCard(
                          expense: expense,
                          onTap: () {
                            context.go(AppRoutes.expenses);
                          },
                        );
                      },
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    String greeting,
    String firstName,
    String dateStr,
    bool hasUnreadNotifications,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              dateStr,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$greeting, $firstName',
              style: AppTextStyles.h2.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
                fontSize: 21,
              ),
            ),
          ],
        ),

        // Lonceng Notifikasi Reaktif dengan Titik Merah
        const NotificationBellButton(
          color: AppColors.primary,
          iconSize: 26,
        ),
      ],
    );
  }
}
