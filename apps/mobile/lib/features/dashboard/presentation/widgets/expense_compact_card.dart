import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../domain/entities/dashboard_summary_entity.dart';

class ExpenseCompactCard extends StatelessWidget {
  final DashboardExpenseItem expense;
  final VoidCallback onTap;

  const ExpenseCompactCard({
    super.key,
    required this.expense,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final formattedAmount = CurrencyFormatter.formatRupiah(expense.amount);
    final formattedDate = DateFormatter.formatDayAndShortDate(expense.date);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppSpacing.roundedCard,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: AppSpacing.roundedCard,
            border: Border.all(color: AppColors.cardBorder, width: 0.9),
            boxShadow: AppSpacing.cardShadow,
          ),
          child: Row(
            children: [
              // Icon Kategori / Nota di Kiri
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFFDE8EC),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.receipt_long_rounded,
                  size: 20,
                  color: Color(0xFFE8141C),
                ),
              ),
              const SizedBox(width: 12),

              // Info Pengeluaran di Tengah
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      expense.title,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        fontSize: 13.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${expense.categoryName} • $formattedDate',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 11.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (expense.status.contains('menunggu')) ...[
                      const SizedBox(height: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: AppColors.warningTint,
                          borderRadius: AppSpacing.roundedPill,
                        ),
                        child: Text(
                          '• ${expense.status == 'menunggu_admin' ? 'Menunggu Admin' : 'Menunggu Finance'}',
                          style: AppTextStyles.chip.copyWith(
                            color: AppColors.warningText,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Nominal Uang di Kanan
              Text(
                formattedAmount,
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

