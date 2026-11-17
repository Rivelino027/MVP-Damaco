import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../domain/entities/expense_entity.dart';

class ExpenseCard extends StatelessWidget {
  final ExpenseEntity expense;
  final VoidCallback onTap;

  const ExpenseCard({
    super.key,
    required this.expense,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm + 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppSpacing.roundedCard,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            child: Row(
              children: [
                // 1. Thumbnail Nota
                _buildReceiptThumbnail(),
                const SizedBox(width: AppSpacing.md),

                // 2. Info Utama (Judul, Kategori, Status Chip, Badge Nominal Besar)
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        expense.displayTitle,
                        style: AppTextStyles.subtitle1.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        expense.category?.name ?? 'Pengeluaran',
                        style: AppTextStyles.caption.copyWith(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),

                      // Status Chip & Nominal Besar
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _buildStatusBadge(),
                          if (expense.isLargeAmount) _buildLargeAmountBadge(),
                        ],
                      ),
                    ],
                  ),
                ),

                // 3. Garis Pembatas Vertikal Dotted / Halus
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  height: 48,
                  width: 1,
                  color: AppColors.border,
                ),

                // 4. Nominal di Kanan
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      CurrencyFormatter.format(expense.amount).replaceAll(' ', ''),
                      style: AppTextStyles.subtitle1.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReceiptThumbnail() {
    return Container(
      width: 48,
      height: 52,
      decoration: BoxDecoration(
        color: const Color(0xFFFAF7EE), // Kertas nota gading / ivory
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE8E2D5)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 28,
            height: 3,
            decoration: BoxDecoration(
              color: const Color(0xFFB5ADA0),
              borderRadius: BorderRadius.circular(1.5),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: 22,
            height: 2,
            decoration: BoxDecoration(
              color: const Color(0xFFCEC7BC),
              borderRadius: BorderRadius.circular(1),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: 26,
            height: 2,
            decoration: BoxDecoration(
              color: const Color(0xFFCEC7BC),
              borderRadius: BorderRadius.circular(1),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: 18,
            height: 2,
            decoration: BoxDecoration(
              color: const Color(0xFFCEC7BC),
              borderRadius: BorderRadius.circular(1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color bg;
    Color fg;
    String label = expense.displayStatusLabel;

    switch (expense.status.toLowerCase()) {
      case 'draft':
        bg = const Color(0xFFF0EDF2);
        fg = const Color(0xFF6B5E60);
        break;
      case 'menunggu_admin':
        bg = const Color(0xFFFDF0DC);
        fg = const Color(0xFF9A5A0A);
        break;
      case 'menunggu_finance':
        bg = const Color(0xFFEDE4F8);
        fg = const Color(0xFF5E2796);
        break;
      case 'disetujui':
      case 'siap_dibayar':
        bg = const Color(0xFFE8F0FE);
        fg = const Color(0xFF1967D2);
        break;
      case 'dibayar':
        bg = const Color(0xFFE6F4EA);
        fg = const Color(0xFF137333);
        break;
      case 'ditolak':
        bg = const Color(0xFFFCE4E7);
        fg = const Color(0xFFB0000F);
        break;
      default:
        bg = const Color(0xFFF0EDF2);
        fg = const Color(0xFF6B5E60);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }

  Widget _buildLargeAmountBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFFDF0DC),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFFDE0B2)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.assignment_outlined,
            size: 11,
            color: Color(0xFF9A5A0A),
          ),
          SizedBox(width: 3),
          Text(
            'Nominal Besar',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF9A5A0A),
            ),
          ),
        ],
      ),
    );
  }
}

