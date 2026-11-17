import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

class _NavItemConfig {
  final int branchIndex;
  final String label;
  final IconData icon;

  const _NavItemConfig({
    required this.branchIndex,
    required this.label,
    required this.icon,
  });
}

class AppBottomNav extends ConsumerWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final role = user?.role.toLowerCase() ?? 'pengguna';
    final bottomInset = MediaQuery.of(context).padding.bottom;

    // Tentukan item navigasi berdasarkan peran pengguna
    final List<_NavItemConfig> items;
    if (role == 'admin') {
      items = const [
        _NavItemConfig(
          branchIndex: 0,
          label: 'Beranda',
          icon: Icons.home_rounded,
        ),
        _NavItemConfig(
          branchIndex: 5,
          label: 'Persetujuan',
          icon: Icons.assignment_turned_in_rounded,
        ),
        _NavItemConfig(
          branchIndex: 1,
          label: 'Task',
          icon: Icons.check_box_outlined,
        ),
        _NavItemConfig(
          branchIndex: 4,
          label: 'Profil',
          icon: Icons.person_rounded,
        ),
      ];
    } else if (role == 'finance') {
      items = const [
        _NavItemConfig(
          branchIndex: 0,
          label: 'Beranda',
          icon: Icons.home_rounded,
        ),
        _NavItemConfig(
          branchIndex: 5,
          label: 'Persetujuan',
          icon: Icons.assignment_turned_in_rounded,
        ),
        _NavItemConfig(
          branchIndex: 6,
          label: 'Pembayaran',
          icon: Icons.payments_rounded,
        ),
        _NavItemConfig(
          branchIndex: 4,
          label: 'Profil',
          icon: Icons.person_rounded,
        ),
      ];
    } else {
      // Pengguna (Default: 5 Tab)
      items = const [
        _NavItemConfig(
          branchIndex: 0,
          label: 'Beranda',
          icon: Icons.home_rounded,
        ),
        _NavItemConfig(
          branchIndex: 1,
          label: 'Task',
          icon: Icons.check_box_outlined,
        ),
        _NavItemConfig(
          branchIndex: 2,
          label: 'Jam',
          icon: Icons.access_time_rounded,
        ),
        _NavItemConfig(
          branchIndex: 3,
          label: 'Biaya',
          icon: Icons.receipt_long_rounded,
        ),
        _NavItemConfig(
          branchIndex: 4,
          label: 'Profil',
          icon: Icons.person_rounded,
        ),
      ];
    }

    return Container(
      margin: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        bottom: bottomInset > 0 ? bottomInset : AppSpacing.md,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.navPillBackground,
        borderRadius: AppSpacing.roundedPill,
        boxShadow: AppSpacing.floatingNavShadow,
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items.map((item) {
          final isSelected = currentIndex == item.branchIndex;
          return Semantics(
            label: 'Tab ${item.label}',
            selected: isSelected,
            button: true,
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                onTap(item.branchIndex);
              },
              behavior: HitTestBehavior.opaque,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 48, minHeight: 44),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 44,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.navActiveBox
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        item.icon,
                        size: 20,
                        color: isSelected ? Colors.white : AppColors.navInactive,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.label,
                      style: AppTextStyles.caption.copyWith(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.navInactive,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
