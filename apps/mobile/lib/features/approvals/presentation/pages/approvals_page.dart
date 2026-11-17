import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../domain/entities/approval_item_entity.dart';
import '../providers/approvals_provider.dart';
import '../widgets/approval_detail_sheet.dart';

class ApprovalsPage extends ConsumerWidget {
  const ApprovalsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(approvalsProvider);
    final user = ref.watch(currentUserProvider);
    final activeFilter = ref.watch(selectedApprovalFilterProvider);
    final role = user?.role ?? 'admin';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: [
            Text(
              'Persetujuan',
              style: AppTextStyles.h1.copyWith(fontSize: 20),
            ),
            const SizedBox(width: 8),
            if (state.items.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${state.items.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Filter Chips Horizontal
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip(
                    context: context,
                    ref: ref,
                    label: 'Semua',
                    type: null,
                    isSelected: activeFilter == null,
                  ),
                  const SizedBox(width: 8),
                  _buildFilterChip(
                    context: context,
                    ref: ref,
                    label: 'Pengeluaran',
                    type: ApprovalDocumentType.expense,
                    isSelected: activeFilter == ApprovalDocumentType.expense,
                  ),
                  const SizedBox(width: 8),
                  if (role.toLowerCase() == 'admin') ...[
                    _buildFilterChip(
                      context: context,
                      ref: ref,
                      label: 'Timesheet',
                      type: ApprovalDocumentType.timesheet,
                      isSelected:
                          activeFilter == ApprovalDocumentType.timesheet,
                    ),
                    const SizedBox(width: 8),
                  ],
                  _buildFilterChip(
                    context: context,
                    ref: ref,
                    label: 'Anggaran',
                    type: ApprovalDocumentType.budgetRequest,
                    isSelected:
                        activeFilter == ApprovalDocumentType.budgetRequest,
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // Main 4 States Content
          Expanded(
            child: _buildBody(context, ref, state),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    ApprovalsState state,
  ) {
    if (state.status == ApprovalsStatus.loading) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: SkeletonList(itemCount: 4, itemHeight: 100),
      );
    }

    if (state.status == ApprovalsStatus.error) {
      return Center(
        child: ErrorState(
          title: 'Gagal Memuat Antrean',
          message: state.errorMessage ?? 'Terjadi kesalahan sistem.',
          onRetry: () =>
              ref.read(approvalsProvider.notifier).loadApprovals(),
        ),
      );
    }

    if (state.items.isEmpty) {
      return const Center(
        child: EmptyState(
          icon: Icons.assignment_turned_in_outlined,
          title: 'Tidak Ada Antrean',
          message: 'Semua pengajuan telah diproses atau belum ada dokumen baru.',
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(approvalsProvider.notifier).loadApprovals(),
      child: ListView.separated(
        padding: const EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: 100,
        ),
        itemCount: state.items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = state.items[index];
          return _buildApprovalCard(context, item);
        },
      ),
    );
  }

  Widget _buildFilterChip({
    required BuildContext context,
    required WidgetRef ref,
    required String label,
    required ApprovalDocumentType? type,
    required bool isSelected,
  }) {
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : AppColors.textPrimary,
      ),
      backgroundColor: const Color(0xFFF0EDF3),
      selectedColor: AppColors.primary,
      checkmarkColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      onSelected: (_) {
        ref.read(selectedApprovalFilterProvider.notifier).state = type;
        ref.read(approvalsProvider.notifier).loadApprovals();
      },
    );
  }

  Widget _buildApprovalCard(BuildContext context, ApprovalItemEntity item) {
    return InkWell(
      onTap: () => ApprovalDetailSheet.show(context, item),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Baris Atas: Badge Jenis Dokumen + Flags
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0EDF3),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.documentType.displayName,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                if (item.isLargeAmount)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3DC),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Nominal Besar',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ),
                const Spacer(),
                Text(
                  DateFormatter.formatShortDate(item.submittedAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textPlaceholder,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Judul Dokumen
            Text(
              item.title,
              style: AppTextStyles.h2.copyWith(fontSize: 15),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),

            // Pemohon & Departemen
            Text(
              '${item.applicantName} • ${item.applicantDepartment}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),

            // Nilai Nominal atau Jam
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  item.documentType == ApprovalDocumentType.timesheet
                      ? '${item.hours.toStringAsFixed(item.hours.truncateToDouble() == item.hours ? 0 : 1)} Jam'
                      : CurrencyFormatter.formatRupiah(item.amount),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
                const Row(
                  children: [
                    Text(
                      'Tinjau',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
