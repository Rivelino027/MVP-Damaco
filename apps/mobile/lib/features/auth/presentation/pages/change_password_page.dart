import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/auth_provider.dart';
import '../widgets/change_password_form.dart';

class ChangePasswordPage extends ConsumerWidget {
  const ChangePasswordPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final isForced = authState.mustChangePassword;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: Text(
          isForced ? 'Ubah Kata Sandi Wajib' : 'Ubah Kata Sandi',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        automaticallyImplyLeading: !isForced,
        leading: !isForced
            ? IconButton(
                icon: const Icon(Icons.chevron_left_rounded, size: 28),
                color: AppColors.textPrimary,
                onPressed: () => context.pop(),
              )
            : null,
        actions: [
          if (isForced)
            IconButton(
              icon: const Icon(Icons.logout_rounded),
              tooltip: 'Keluar',
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go(AppRoutes.login);
                }
              },
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isForced) ...[
                Text(
                  'Perbarui Kata Sandi Anda',
                  style: AppTextStyles.h2,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Demi keamanan akun, Anda diwajibkan untuk membuat kata sandi baru sebelum dapat menggunakan sistem.',
                  style: AppTextStyles.body2,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
              ChangePasswordForm(
                isForced: isForced,
                onSuccess: () {
                  if (isForced) {
                    context.go(AppRoutes.dashboard);
                  } else {
                    context.pop();
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
