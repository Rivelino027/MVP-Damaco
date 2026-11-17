import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../notifications/presentation/widgets/notification_bell_button.dart';
import '../providers/expenses_provider.dart';
import '../widgets/expense_card.dart';
import '../widgets/expense_filter_chips.dart';
import 'expense_detail_page.dart';
import 'expense_form_page.dart';

class ExpensesPage extends ConsumerWidget {
  const ExpensesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(expenseListProvider);
    final activeFilter = ref.watch(expenseFilterProvider);
    final countsAsync = ref.watch(expenseCountsProvider);
    final notifier = ref.read(expenseListProvider.notifier);

    final counts = countsAsync.value ?? {
      'Semua': 0,
      'Draft': 0,
      'Diproses': 0,
      'Siap Dibayar': 0,
      'Dibayar': 0,
      'Ditolak': 0,
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // 1. Header (Judul & Lonceng Notifikasi)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pengeluaran',
                        style: AppTextStyles.h1.copyWith(fontSize: 24),
                      ),
                      const NotificationBellButton(
                        color: AppColors.primary,
                        iconSize: 26,
                      ),
                    ],
                  ),
                ),

                // 2. Chip Filter Horizontal dengan Badge Jumlah
                ExpenseFilterChips(
                  activeFilter: activeFilter,
                  counts: counts,
                  onSelected: (filter) {
                    ref.read(expenseFilterProvider.notifier).state = filter;
                  },
                ),
                const SizedBox(height: AppSpacing.md),

                // 3. Konten Utama Daftar Pengeluaran (4 States)
                Expanded(
                  child: expensesAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                      child: SkeletonList(itemCount: 5),
                    ),
                    error: (err, _) => ErrorState(
                      message: err is AppException ? err.message : err.toString(),
                      onRetry: () => notifier.refresh(),
                    ),
                    data: (expenses) {
                      if (expenses.isEmpty) {
                        return RefreshIndicator(
                          onRefresh: () => notifier.refresh(),
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 60,
                                horizontal: AppSpacing.lg,
                              ),
                              child: EmptyState(
                                icon: Icons.receipt_long_rounded,
                                title: 'Belum ada pengeluaran',
                                description:
                                    'Tidak ada data pengeluaran untuk filter "$activeFilter".',
                              ),
                            ),
                          ),
                        );
                      }

                      return RefreshIndicator(
                        onRefresh: () => notifier.refresh(),
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.only(
                            left: AppSpacing.lg,
                            right: AppSpacing.lg,
                            bottom: 120, // Ruang untuk FAB & Floating Bottom Nav
                          ),
                          itemCount: expenses.length,
                          itemBuilder: (context, index) {
                            final expense = expenses[index];
                            return ExpenseCard(
                              expense: expense,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ExpenseDetailPage(
                                      expenseId: expense.id,
                                    ),
                                  ),
                                ).then((_) => notifier.refresh());
                              },
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),

            // 4. Floating Action Button "+ Ajukan" Melayang di Atas Floating Nav
            Positioned(
              bottom: 84, // Berada tepat di atas floating bottom nav
              right: AppSpacing.lg,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ExpenseFormPage()),
                  ).then((_) => notifier.refresh());
                },
                icon: const Icon(Icons.add, size: 20),
                label: const Text(
                  'Ajukan',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  elevation: 6,
                  shadowColor: AppColors.primary.withAlpha(120),
                  shape: const RoundedRectangleBorder(
                    borderRadius: AppSpacing.roundedPill,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
