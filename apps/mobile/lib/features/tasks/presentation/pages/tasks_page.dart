import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../notifications/presentation/widgets/notification_bell_button.dart';
import '../providers/tasks_provider.dart';
import '../widgets/task_card.dart';

class TasksPage extends ConsumerStatefulWidget {
  const TasksPage({super.key});

  @override
  ConsumerState<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends ConsumerState<TasksPage> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  static const List<String> _filters = [
    'Semua',
    'Belum Mulai',
    'Dikerjakan',
    'Review',
    'Selesai',
  ];

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      ref.read(taskSearchQueryProvider.notifier).state = query.trim();
    });
  }

  void _clearSearch() {
    _searchController.clear();
    ref.read(taskSearchQueryProvider.notifier).state = '';
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(taskListProvider);
    final activeFilter = ref.watch(taskFilterProvider);
    final groupedTasks = ref.watch(groupedTasksProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header: Judul "Task Saya" & Lonceng Notifikasi
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPaddingHorizontal,
                16,
                AppSpacing.screenPaddingHorizontal,
                12,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Task Saya',
                    style: AppTextStyles.h1.copyWith(
                      color: AppColors.primary,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const NotificationBellButton(
                    color: AppColors.primary,
                    iconSize: 26,
                  ),
                ],
              ),
            ),

            // Search Bar dengan Debounce 400ms
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenPaddingHorizontal,
              ),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.cardBorder, width: 0.9),
                  boxShadow: AppSpacing.cardShadow,
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Cari task atau proyek',
                    hintStyle: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary.withAlpha(180),
                      fontSize: 14,
                    ),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      color: AppColors.textSecondary,
                      size: 20,
                    ),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            color: AppColors.textSecondary,
                            onPressed: _clearSearch,
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 13,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Horizontal Filter Chips
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenPaddingHorizontal,
                ),
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  final isSelected = filter == activeFilter;

                  return InkWell(
                    onTap: () {
                      ref.read(taskFilterProvider.notifier).state = filter;
                    },
                    borderRadius: AppSpacing.roundedPill,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF5D536B)
                            : Colors.white,
                        borderRadius: AppSpacing.roundedPill,
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFF5D536B)
                              : AppColors.cardBorder,
                          width: 0.9,
                        ),
                        boxShadow: isSelected ? null : AppSpacing.cardShadow,
                      ),
                      child: Text(
                        filter,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: isSelected
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 14),

            // Konten Task List (4 State)
            Expanded(
              child: tasksAsync.when(
                loading: () => const SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    AppSpacing.screenPaddingHorizontal,
                    8,
                    AppSpacing.screenPaddingHorizontal,
                    100,
                  ),
                  child: SkeletonList(itemCount: 4, itemHeight: 110),
                ),
                error: (err, stack) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.screenPaddingHorizontal),
                    child: ErrorState(
                      message: err.toString(),
                      onRetry: () {
                        ref.read(taskListProvider.notifier).refresh();
                      },
                    ),
                  ),
                ),
                data: (tasks) {
                  if (tasks.isEmpty) {
                    return RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () async {
                        await ref.read(taskListProvider.notifier).refresh();
                      },
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.screenPaddingHorizontal,
                          vertical: 40,
                        ),
                        children: [
                          EmptyState(
                            title: 'Tidak Ada Task',
                            message: _searchController.text.isNotEmpty
                                ? 'Tidak ada task yang cocok dengan pencarian "${_searchController.text}".'
                                : 'Tidak ada task dengan status "$activeFilter".',
                          ),
                        ],
                      ),
                    );
                  }

                  // Render daftar terkelompok berdasarkan status
                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {
                      await ref.read(taskListProvider.notifier).refresh();
                    },
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screenPaddingHorizontal,
                        4,
                        AppSpacing.screenPaddingHorizontal,
                        100,
                      ),
                      itemCount: groupedTasks.keys.length,
                      itemBuilder: (context, sectionIndex) {
                        final sectionTitle =
                            groupedTasks.keys.elementAt(sectionIndex);
                        final sectionTasks = groupedTasks[sectionTitle]!;

                        if (sectionTasks.isEmpty) {
                          return const SizedBox.shrink();
                        }

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(
                                top: 12,
                                bottom: 10,
                                left: 2,
                              ),
                              child: Text(
                                sectionTitle,
                                style: AppTextStyles.h3.copyWith(
                                  color: AppColors.textPrimary,
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            ...sectionTasks.map((task) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: TaskCard(
                                  task: task,
                                  onTap: () {
                                    context.push('/tasks/${task.id}');
                                  },
                                ),
                              );
                            }),
                          ],
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
