import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../notifications/presentation/providers/notifications_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    // 4 States: Loading, Error, Unauthenticated/Empty, Content
    if (authState.status == AuthStatus.loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (authState.status == AuthStatus.unauthenticated) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline_rounded, size: 56, color: AppColors.textMuted),
                const SizedBox(height: AppSpacing.md),
                Text('Sesi Anda telah berakhir', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Silakan masuk kembali untuk mengakses informasi profil Anda.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.body2,
                ),
                const SizedBox(height: AppSpacing.xl),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => context.go(AppRoutes.login),
                  child: const Text('Masuk ke Akun', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (user == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: ErrorState(
          title: 'Gagal Memuat Profil',
          message: 'Data pengguna tidak ditemukan. Silakan muat ulang.',
          onRetry: () => ref.read(authProvider.notifier).checkAuth(),
        ),
      );
    }

    final notifSettings = ref.watch(notificationSettingsProvider);
    final notifController = ref.read(notificationSettingsProvider.notifier);

    final departmentLabel = user.departmentName ?? 'Departemen IT';
    final costCenterCode = user.costCenterCode ?? 'CC-IT-02';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // 1. Header Gradasi Gelap dengan Glow & Avatar Tumpang Tindih (Overlapping)
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Container Latar Gradasi Gelap Ungu
                Container(
                  height: 175,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(28),
                      bottomRight: Radius.circular(28),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF150324),
                        Color(0xFF2B0B4D),
                      ],
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Glow Pink/Merah halus di kanan atas sesuai desain
                      Positioned(
                        top: -20,
                        right: -10,
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                const Color(0xFFFF3366).withAlpha(120),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                      SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xl,
                            vertical: AppSpacing.md,
                          ),
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: Text(
                              'Profil',
                              style: AppTextStyles.h1.copyWith(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Avatar Inisial Bulat (Overlapping di batas bawah header)
                Positioned(
                  bottom: -36,
                  left: 24,
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2B0B4D),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3.5),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(35),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        user.initials,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 44),

            // 2. Info Nama, Role, dan Departemen
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        user.name,
                        style: AppTextStyles.h2.copyWith(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFE8F6),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _formatRoleName(user.role),
                          style: AppTextStyles.caption.copyWith(
                            color: const Color(0xFF431675),
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$departmentLabel • $costCenterCode',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // 3. Card Toggle Notifikasi
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.md,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppSpacing.roundedCard,
                      border: Border.all(color: AppColors.border),
                      boxShadow: AppSpacing.softShadow,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFE8F6),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_none_rounded,
                                size: 20,
                                color: Color(0xFF431675),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Text(
                              'Notifikasi',
                              style: AppTextStyles.subtitle2.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        Transform.scale(
                          scale: 0.85,
                          child: Switch.adaptive(
                            value: notifSettings.pushEnabled,
                            activeThumbColor: Colors.white,
                            activeTrackColor: const Color(0xFF2B0B4D),
                            inactiveTrackColor: Colors.grey.shade300,
                            onChanged: (val) {
                              notifController.togglePush(val);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // 4. Dua Kartu: Cost Center & Departemen
                  Row(
                    children: [
                      // Kartu Kiri: Cost Center (Gradient Gelap Ungu + Glow)
                      Expanded(
                        child: Container(
                          height: 98,
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            borderRadius: AppSpacing.roundedCard,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF150324),
                                Color(0xFF2B0B4D),
                              ],
                            ),
                            boxShadow: AppSpacing.softShadow,
                          ),
                          child: Stack(
                            children: [
                              Positioned(
                                top: -15,
                                right: -15,
                                child: Container(
                                  width: 60,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: RadialGradient(
                                      colors: [
                                        const Color(0xFFFF3366).withAlpha(100),
                                        Colors.transparent,
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withAlpha(30),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.local_offer_outlined,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'COST CENTER',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.6,
                                          color: Colors.white.withAlpha(180),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        costCenterCode,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),

                      // Kartu Kanan: Departemen (Putih Elegan)
                      Expanded(
                        child: Container(
                          height: 98,
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: AppSpacing.roundedCard,
                            border: Border.all(color: AppColors.border),
                            boxShadow: AppSpacing.softShadow,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFE8F6),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.corporate_fare_rounded,
                                  color: Color(0xFF431675),
                                  size: 16,
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'DEPARTEMEN',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.6,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    departmentLabel,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // 5. Menu List Container (Edit Profil, Ubah Kata Sandi, Tentang Aplikasi)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppSpacing.roundedCard,
                      border: Border.all(color: AppColors.border),
                      boxShadow: AppSpacing.softShadow,
                    ),
                    child: Column(
                      children: [
                        _buildMenuItem(
                          icon: Icons.edit_outlined,
                          title: 'Edit Profil',
                          onTap: () => context.push(AppRoutes.editProfile),
                        ),
                        const Divider(height: 1, indent: 56, endIndent: 16),
                        _buildMenuItem(
                          icon: Icons.vpn_key_outlined,
                          title: 'Ubah Kata Sandi',
                          onTap: () => context.push(AppRoutes.changePassword),
                        ),
                        const Divider(height: 1, indent: 56, endIndent: 16),
                        _buildMenuItem(
                          icon: Icons.info_outline_rounded,
                          title: 'Tentang Aplikasi',
                          onTap: () => context.push(AppRoutes.aboutApp),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // 6. Tombol Keluar (Latar Tint Merah + Border Tipis + Teks & Ikon Merah)
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _confirmLogout(context, ref),
                      borderRadius: AppSpacing.roundedCard,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCE4E7),
                          borderRadius: AppSpacing.roundedCard,
                          border: Border.all(color: const Color(0xFFF5B6BC)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(
                              Icons.logout_rounded,
                              size: 18,
                              color: Color(0xFFB0000F),
                            ),
                            SizedBox(width: AppSpacing.sm),
                            Text(
                              'Keluar',
                              style: TextStyle(
                                color: Color(0xFFB0000F),
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 120),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color: const Color(0xFFEFE8F6),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: const Color(0xFF431675)),
      ),
      title: Text(
        title,
        style: AppTextStyles.subtitle2.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textMuted,
        size: 22,
      ),
      onTap: onTap,
    );
  }

  String _formatRoleName(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'finance':
        return 'Finance';
      case 'super_admin':
        return 'Super Admin';
      case 'pengguna':
      default:
        return 'Pengguna';
    }
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedCard),
        title: Text('Konfirmasi Keluar', style: AppTextStyles.h3),
        content: Text(
          'Apakah Anda yakin ingin keluar dari akun ini?',
          style: AppTextStyles.body2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Batal', style: AppTextStyles.button.copyWith(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB0000F),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Ya, Keluar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (shouldLogout == true && context.mounted) {
      await ref.read(authProvider.notifier).logout();
      if (context.mounted) {
        context.go(AppRoutes.login);
      }
    }
  }
}
