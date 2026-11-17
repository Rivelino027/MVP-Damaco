import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/expense_entity.dart';

class ExpenseSuccessPage extends StatelessWidget {
  final ExpenseEntity expense;

  const ExpenseSuccessPage({
    super.key,
    required this.expense,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // 1. Lingkaran Sukses dengan Centang Hijau
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(
                  color: Color(0xFFD6DFDC), // Lingkaran abu-kehijauan lembut
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    size: 52,
                    color: Color(0xFF2E7D32), // Hijau centang sukses
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // 2. Judul Sukses
              Text(
                'Pengeluaran Diajukan 🎉',
                style: AppTextStyles.h2.copyWith(fontSize: 22),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),

              // 3. Subteks Kode & Status
              Text(
                '${expense.displayCode} menunggu persetujuan Admin.',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              // 4. Tombol "Lihat Pengeluaran"
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // Navigasi ke detail pengeluaran
                    context.pushReplacement(AppRoutes.expenseDetailPath(expense.id));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Lihat Pengeluaran',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // 5. Tombol "Ajukan Lagi"
              TextButton(
                onPressed: () {
                  context.pushReplacement(AppRoutes.expenseForm);
                },
                child: Text(
                  'Ajukan Lagi',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}

