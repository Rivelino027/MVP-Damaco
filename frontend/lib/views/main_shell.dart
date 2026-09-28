import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import 'dashboard/dashboard_tab.dart';
import 'projects/project_list_tab.dart';
import 'tasks/tasks_tab.dart';
import 'timesheets/timesheets_tab.dart';
import 'milestones/milestones_tab.dart';
import 'budget/budget_tab.dart';
import 'expenses/expenses_tab.dart';
import 'invoices/invoices_tab.dart';
import 'reports/reports_tab.dart';
import 'reports/cash_flow_tab.dart';
import 'budget/purchase_orders_tab.dart';
import 'management/team_tab.dart';
import 'management/vendors_tab.dart';
import 'login_screen.dart';
import 'widgets/damaco_logo.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _activeMenuIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;
    final role = user?.normalizedRole ?? 'MEMBER';
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    // Filter available navigation items based on Role
    final navItems = _getNavItemsForRole(role);
    final safeIndex = _activeMenuIndex < navItems.length ? _activeMenuIndex : 0;
    final currentWidget = navItems[safeIndex].widget;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Row(
        children: [
          // Desktop Left Sidebar
          if (isDesktop)
            Container(
              width: 240,
              decoration: const BoxDecoration(
                color: AppColors.card,
                border: Border(right: BorderSide(color: AppColors.border, width: 1)),
              ),
              child: _buildSidebar(role, navItems, safeIndex),
            ),

          // Main View Content & Topbar
          Expanded(
            child: Column(
              children: [
                // Topbar
                Container(
                  height: 64,
                  padding: EdgeInsets.symmetric(horizontal: isDesktop ? 16 : 8),
                  decoration: const BoxDecoration(
                    color: AppColors.card,
                    border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
                  ),
                  child: Row(
                    children: [
                      if (!isDesktop) ...[
                        Builder(
                          builder: (ctx) => IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            icon: const Icon(Icons.menu, color: AppColors.textPrimary),
                            onPressed: () => Scaffold.of(ctx).openDrawer(),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const DamacoLogo(showText: true, size: 22),
                        const Spacer(),
                      ],

                      if (isDesktop) ...[
                        Expanded(
                          child: Container(
                            height: 38,
                            constraints: const BoxConstraints(maxWidth: 420),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    decoration: const InputDecoration(
                                      hintText: 'Search projects, tasks, invoices...',
                                      hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                    style: const TextStyle(fontSize: 13),
                                    onSubmitted: (query) {
                                      if (query.trim().isNotEmpty) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text('Pencarian "$query" diterapkan pada modul aktif.')),
                                        );
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Spacer(),
                      ],

                      // Topbar Actions
                      IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                        icon: Stack(
                          children: [
                            const Icon(Icons.notifications_none_outlined, color: AppColors.textSecondary, size: 22),
                            Positioned(
                              right: 0,
                              top: 0,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                              ),
                            ),
                          ],
                        ),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Notifikasi: Proyek PRJ-2026-BN01 memerlukan peninjauan budget!'),
                              duration: Duration(seconds: 3),
                            ),
                          );
                        },
                        tooltip: 'Notifications',
                      ),
                      SizedBox(width: isDesktop ? 8 : 4),

                      // Role Indicator Chip
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _roleColor(role).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _roleColor(role).withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            role.replaceAll('_', ' '),
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _roleColor(role)),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ),
                      SizedBox(width: isDesktop ? 8 : 4),

                      // User Profile Avatar with PopupMenu on Mobile / Full details on Desktop
                      if (isDesktop) ...[
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primary,
                          child: Text((user?.name ?? 'U')[0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12)),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.name ?? 'Pengguna', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            Text(user?.email ?? 'user@projectflow.id', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                          ],
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.logout, size: 18, color: AppColors.textMuted),
                          onPressed: () {
                            context.read<AuthProvider>().logout();
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                              (route) => false,
                            );
                          },
                          tooltip: 'Logout',
                        ),
                      ] else ...[
                        PopupMenuButton<String>(
                          offset: const Offset(0, 40),
                          onSelected: (val) {
                            if (val == 'logout') {
                              context.read<AuthProvider>().logout();
                              Navigator.of(context).pushAndRemoveUntil(
                                MaterialPageRoute(builder: (_) => const LoginScreen()),
                                (route) => false,
                              );
                            }
                          },
                          itemBuilder: (context) => [
                            PopupMenuItem<String>(
                              enabled: false,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(user?.name ?? 'Pengguna', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                  Text(user?.email ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                  const Divider(),
                                ],
                              ),
                            ),
                            const PopupMenuItem<String>(
                              value: 'logout',
                              child: Row(
                                children: [
                                  Icon(Icons.logout, size: 18, color: AppColors.danger),
                                  SizedBox(width: 8),
                                  Text('Logout', style: TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                          child: CircleAvatar(
                            radius: 15,
                            backgroundColor: AppColors.primary,
                            child: Text((user?.name ?? 'U')[0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 11)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Active View Body
                Expanded(
                  child: currentWidget,
                ),
              ],
            ),
          ),
        ],
      ),
      drawer: isDesktop
          ? null
          : Drawer(
              child: Container(
                color: AppColors.card,
                child: _buildSidebar(role, navItems, safeIndex),
              ),
            ),
    );
  }

  Widget _buildSidebar(String role, List<_NavItem> items, int selectedIndex) {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 14),
      children: [
        const DamacoLogo(showText: true, size: 28),
        const SizedBox(height: 24),

        for (int i = 0; i < items.length; i++) ...[
          if (i == 0 || items[i].section != items[i - 1].section) ...[
            if (i > 0) const SizedBox(height: 14),
            _sectionHeader(items[i].section),
          ],
          _navTile(i, items[i].label, items[i].icon, selectedIndex == i),
        ],
      ],
    );
  }

  Widget _sectionHeader(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 10, bottom: 6),
      child: Text(
        label,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted, letterSpacing: 0.8),
      ),
    );
  }

  Widget _navTile(int index, String label, IconData icon, bool isSelected) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primaryLight : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
        leading: Icon(icon, size: 18, color: isSelected ? AppColors.primary : AppColors.textSecondary),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? AppColors.primary : AppColors.textPrimary,
          ),
        ),
        onTap: () {
          setState(() => _activeMenuIndex = index);
          if (Navigator.canPop(context)) Navigator.pop(context);
        },
      ),
    );
  }

  List<_NavItem> _getNavItemsForRole(String role) {
    if (role == 'CLIENT') {
      return [
        _NavItem('OVERVIEW', 'Dashboard', Icons.dashboard_outlined, const DashboardTab()),
        _NavItem('WORK', 'Projects', Icons.folder_open_outlined, const ProjectListTab()),
        _NavItem('WORK', 'Milestones', Icons.flag_outlined, const MilestonesTab()),
        _NavItem('FINANCE', 'Invoices', Icons.payments_outlined, const InvoicesTab()),
        _NavItem('REPORTS', 'Cash Flow', Icons.account_balance_wallet_outlined, const CashFlowTab()),
      ];
    } else if (role == 'MEMBER') {
      return [
        _NavItem('OVERVIEW', 'Dashboard', Icons.dashboard_outlined, const DashboardTab()),
        _NavItem('WORK', 'My Projects', Icons.folder_open_outlined, const ProjectListTab()),
        _NavItem('WORK', 'My Tasks', Icons.check_circle_outline, const TasksTab()),
        _NavItem('WORK', 'Timesheets', Icons.access_time_outlined, const TimesheetsTab()),
        _NavItem('FINANCE', 'Expenses', Icons.receipt_long_outlined, const ExpensesTab()),
      ];
    } else if (role == 'FINANCE') {
      return [
        _NavItem('OVERVIEW', 'Dashboard', Icons.dashboard_outlined, const DashboardTab()),
        _NavItem('WORK', 'Projects', Icons.folder_open_outlined, const ProjectListTab()),
        _NavItem('FINANCE', 'Budget (RAB)', Icons.account_balance_outlined, const BudgetTab()),
        _NavItem('FINANCE', 'Purchase Orders', Icons.shopping_bag_outlined, const PurchaseOrdersTab()),
        _NavItem('FINANCE', 'Expenses', Icons.receipt_long_outlined, const ExpensesTab()),
        _NavItem('FINANCE', 'Invoices & Payments', Icons.payments_outlined, const InvoicesTab()),
        _NavItem('REPORTS', 'Cash Flow', Icons.account_balance_wallet_outlined, const CashFlowTab()),
        _NavItem('MANAGEMENT', 'Vendors', Icons.storefront_outlined, const VendorsTab()),
      ];
    } else if (role == 'PROJECT_MANAGER') {
      return [
        _NavItem('OVERVIEW', 'Dashboard', Icons.dashboard_outlined, const DashboardTab()),
        _NavItem('WORK', 'Projects', Icons.folder_open_outlined, const ProjectListTab()),
        _NavItem('WORK', 'Tasks', Icons.check_circle_outline, const TasksTab()),
        _NavItem('WORK', 'Timesheets', Icons.access_time_outlined, const TimesheetsTab()),
        _NavItem('WORK', 'Milestones', Icons.flag_outlined, const MilestonesTab()),
        _NavItem('FINANCE', 'Budget (RAB)', Icons.account_balance_outlined, const BudgetTab()),
        _NavItem('FINANCE', 'Purchase Orders', Icons.shopping_bag_outlined, const PurchaseOrdersTab()),
        _NavItem('FINANCE', 'Expenses', Icons.receipt_long_outlined, const ExpensesTab()),
        _NavItem('MANAGEMENT', 'Team & Clients', Icons.people_outline, const TeamTab()),
        _NavItem('MANAGEMENT', 'Vendors', Icons.storefront_outlined, const VendorsTab()),
      ];
    } else {
      // OWNER (Full Access)
      return [
        _NavItem('OVERVIEW', 'Dashboard', Icons.dashboard_outlined, const DashboardTab()),
        _NavItem('WORK', 'Projects', Icons.folder_open_outlined, const ProjectListTab()),
        _NavItem('WORK', 'Tasks', Icons.check_circle_outline, const TasksTab()),
        _NavItem('WORK', 'Timesheets', Icons.access_time_outlined, const TimesheetsTab()),
        _NavItem('WORK', 'Milestones', Icons.flag_outlined, const MilestonesTab()),
        _NavItem('FINANCE', 'Budget (RAB)', Icons.account_balance_outlined, const BudgetTab()),
        _NavItem('FINANCE', 'Purchase Orders', Icons.shopping_bag_outlined, const PurchaseOrdersTab()),
        _NavItem('FINANCE', 'Expenses', Icons.receipt_long_outlined, const ExpensesTab()),
        _NavItem('FINANCE', 'Invoices & Payments', Icons.payments_outlined, const InvoicesTab()),
        _NavItem('REPORTS', 'Cash Flow', Icons.account_balance_wallet_outlined, const CashFlowTab()),
        _NavItem('REPORTS', 'Profitability & Reports', Icons.insights, const ReportsTab()),
        _NavItem('MANAGEMENT', 'Team & Clients', Icons.people_outline, const TeamTab()),
        _NavItem('MANAGEMENT', 'Vendors', Icons.storefront_outlined, const VendorsTab()),
      ];
    }
  }

  static Color _roleColor(String role) {
    switch (role) {
      case 'OWNER':
        return Colors.purple;
      case 'PROJECT_MANAGER':
      case 'PM':
        return AppColors.primary;
      case 'FINANCE':
        return AppColors.warning;
      case 'CLIENT':
        return Colors.teal;
      default:
        return AppColors.info;
    }
  }
}

class _NavItem {
  final String section;
  final String label;
  final IconData icon;
  final Widget widget;

  _NavItem(this.section, this.label, this.icon, this.widget);
}
