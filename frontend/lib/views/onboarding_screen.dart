import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import 'widgets/onboarding_characters.dart';
import 'widgets/damaco_logo.dart';
import 'login_screen.dart';
import 'main_shell.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingItem> _items = [
    OnboardingItem(
      badge: 'MANAJEMEN PROYEK',
      title: 'Kelola Proyek & Sprint',
      subtitle: 'Pantau progress proyek, sprint, dan alokasi tim Anda secara real-time dengan visualisasi modern dan intuitif.',
      accentColor: AppColors.primary,
      icon: Icons.assignment_turned_in_rounded,
      mockupWidget: const ProjectManagerCharacter(),
    ),
    OnboardingItem(
      badge: 'KONTROL ANGGARAN',
      title: 'Kontrol Anggaran & Biaya',
      subtitle: 'Kelola rencana biaya, catat pengeluaran harian, dan pantau burn rate proyek untuk mencegah pembengkakan dana.',
      accentColor: AppColors.info,
      icon: Icons.account_balance_wallet_rounded,
      mockupWidget: const FinanceSpecialistCharacter(),
    ),
    OnboardingItem(
      badge: 'LAPORAN & INVOICE',
      title: 'Laporan & Tagihan Otomatis',
      subtitle: 'Hasilkan laporan keuangan komprehensif dan kelola status invoice klien dalam satu platform terpadu.',
      accentColor: AppColors.success,
      icon: Icons.analytics_rounded,
      mockupWidget: const ReportAnalystCharacter(),
    ),
  ];

  void _finishOnboarding() {
    final auth = context.read<AuthProvider>();
    final Widget targetScreen = auth.isAuthenticated ? const MainShell() : const LoginScreen();

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => targetScreen),
      (route) => false,
    );
  }

  void _nextPage() {
    if (_currentPage < _items.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _finishOnboarding();
    }
  }

  void _previousPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentItem = _items[_currentPage];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Navigation Bar (Skip button)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // App Brand Minimal Logo
                  const DamacoLogo(showText: true, size: 26),

                  // Skip Button
                  TextButton(
                    onPressed: _finishOnboarding,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Lewati', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_ios_rounded, size: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Page View Slider
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _items.length,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemBuilder: (context, index) {
                  final item = _items[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Visual Card Component
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 420, maxHeight: 290),
                          child: item.mockupWidget,
                        ),
                        const SizedBox(height: 36),

                        // Badge Tag
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: item.accentColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: item.accentColor.withValues(alpha: 0.2)),
                          ),
                          child: Text(
                            item.badge,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: item.accentColor,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Title
                        Text(
                          item.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Subtitle
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 380),
                          child: Text(
                            item.subtitle,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.5,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Bottom Navigation & Controls
            Container(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Back button
                  _currentPage > 0
                      ? IconButton(
                          onPressed: _previousPage,
                          icon: const Icon(Icons.arrow_back_rounded),
                          color: AppColors.textSecondary,
                          tooltip: 'Kembali',
                        )
                      : const SizedBox(width: 48),

                  // Dynamic Page Dots Indicator
                  Row(
                    children: List.generate(_items.length, (index) {
                      final isActive = index == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: isActive ? 24 : 8,
                        decoration: BoxDecoration(
                          color: isActive ? currentItem.accentColor : AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),

                  // Next / Get Started Action Button
                  ElevatedButton(
                    onPressed: _nextPage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: currentItem.accentColor,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 4,
                      shadowColor: currentItem.accentColor.withValues(alpha: 0.3),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _currentPage == _items.length - 1 ? 'Mulai Sekarang' : 'Lanjut',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(width: 6),
                        Icon(
                          _currentPage == _items.length - 1 ? Icons.check_circle_rounded : Icons.arrow_forward_rounded,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OnboardingItem {
  final String badge;
  final String title;
  final String subtitle;
  final Color accentColor;
  final IconData icon;
  final Widget mockupWidget;

  OnboardingItem({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.icon,
    required this.mockupWidget,
  });
}
