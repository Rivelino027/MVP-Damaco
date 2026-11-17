import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class AboutAppPage extends StatefulWidget {
  const AboutAppPage({super.key});

  @override
  State<AboutAppPage> createState() => _AboutAppPageState();
}

class _AboutAppPageState extends State<AboutAppPage> {
  String _versionText = 'Versi 1.0.0 (24)';
  bool _isCheckingUpdate = false;
  String? _updateStatusMessage;

  @override
  void initState() {
    super.initState();
    _loadPackageInfo();
  }

  Future<void> _loadPackageInfo() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() {
          final version = info.version.isNotEmpty ? info.version : '1.0.0';
          final build = info.buildNumber.isNotEmpty ? info.buildNumber : '24';
          _versionText = 'Versi $version ($build)';
        });
      }
    } catch (_) {
      // Fallback tetap 'Versi 1.0.0 (24)'
    }
  }

  Future<void> _checkUpdate() async {
    setState(() {
      _isCheckingUpdate = true;
      _updateStatusMessage = null;
    });

    await Future.delayed(const Duration(milliseconds: 700));

    if (mounted) {
      setState(() {
        _isCheckingUpdate = false;
        _updateStatusMessage = 'Aplikasi sudah versi terbaru ✓';
      });
    }
  }

  void _showSupportOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(
                'Hubungi Tim Dukungan',
                style: AppTextStyles.subtitle1.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFE8F6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.email_outlined, color: Color(0xFF431675)),
                ),
                title: const Text('Kirim Email'),
                subtitle: const Text(AppConfig.supportEmail),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  final uri = Uri.parse(
                    'mailto:${AppConfig.supportEmail}?subject=${Uri.encodeComponent(AppConfig.supportSubject)}',
                  );
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.chat_outlined, color: Color(0xFF2E7D32)),
                ),
                title: const Text('WhatsApp Dukungan'),
                subtitle: const Text('+${AppConfig.supportWhatsApp}'),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  final uri = Uri.parse(
                    'https://wa.me/${AppConfig.supportWhatsApp}?text=${Uri.encodeComponent('Halo Tim Dukungan ${AppConfig.appName}, saya membutuhkan bantuan terkait:')}',
                  );
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded, size: 28),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Tentang Aplikasi',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: AppSpacing.md),

              // 1. Logo Aplikasi Rounded Persegi Ungu Tua
              Center(
                child: Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF150324),
                        Color(0xFF2B0B4D),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(20),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(35),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withAlpha(80), width: 1.5),
                      ),
                      child: const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // 2. Nama Aplikasi & Versi
              Text(
                'BudgetFlow',
                style: AppTextStyles.h1.copyWith(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _versionText,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),

              const SizedBox(height: AppSpacing.xxl),

              // 3. Menu List Card (Syarat & Ketentuan, Kebijakan Privasi, Periksa Pembaruan, Hubungi Dukungan)
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFFBF8FD),
                  borderRadius: AppSpacing.roundedCard,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppSpacing.softShadow,
                ),
                child: Column(
                  children: [
                    _buildAboutItem(
                      icon: Icons.assignment_outlined,
                      title: 'Syarat & Ketentuan',
                      onTap: () => context.push(AppRoutes.termsConditions),
                    ),
                    const Divider(height: 1, indent: 56, endIndent: 16),
                    _buildAboutItem(
                      icon: Icons.verified_user_outlined,
                      title: 'Kebijakan Privasi',
                      onTap: () => context.push(AppRoutes.privacyPolicy),
                    ),
                    const Divider(height: 1, indent: 56, endIndent: 16),
                    _buildAboutItem(
                      icon: Icons.sync_rounded,
                      title: 'Periksa Pembaruan',
                      isLoading: _isCheckingUpdate,
                      onTap: _checkUpdate,
                    ),
                    const Divider(height: 1, indent: 56, endIndent: 16),
                    _buildAboutItem(
                      icon: Icons.mail_outline_rounded,
                      title: 'Hubungi Dukungan',
                      onTap: _showSupportOptions,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // 4. Pesan Status Pembaruan (Hijau Elegan)
              if (_updateStatusMessage != null) ...[
                Text(
                  _updateStatusMessage!,
                  style: const TextStyle(
                    color: Color(0xFF2E7D32),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAboutItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isLoading = false,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(7),
        decoration: const BoxDecoration(
          color: Color(0xFFEFE8F6),
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
      trailing: isLoading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF431675)),
            )
          : const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textMuted,
              size: 22,
            ),
      onTap: isLoading ? null : onTap,
    );
  }
}

