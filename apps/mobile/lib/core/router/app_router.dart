import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/approvals/presentation/pages/approvals_page.dart';
import '../../features/approvals/presentation/pages/payments_page.dart';
import '../../features/auth/presentation/pages/change_password_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/expenses/presentation/pages/expense_detail_page.dart';
import '../../features/expenses/presentation/pages/expense_form_page.dart';
import '../../features/expenses/presentation/pages/expenses_page.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/onboarding/presentation/pages/splash_page.dart';
import '../../features/profile/presentation/pages/about_app_page.dart';
import '../../features/profile/presentation/pages/edit_profile_page.dart';
import '../../features/profile/presentation/pages/privacy_policy_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/terms_conditions_page.dart';
import '../../features/tasks/presentation/pages/task_detail_page.dart';
import '../../features/tasks/presentation/pages/tasks_page.dart';
import '../../features/timesheet/presentation/pages/timesheet_page.dart';
import '../widgets/app_shell.dart';
import 'app_routes.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'rootNav');

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    refreshListenable: _AuthStateListenable(ref),
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final currentLoc = state.matchedLocation;

      // Saat inisialisasi awal, biarkan SplashPage berjalan
      if (authState.status == AuthStatus.initial) {
        return null;
      }

      final isAuthenticated = authState.isAuthenticated;
      final mustChange = authState.mustChangePassword;

      final isPublicRoute = currentLoc == AppRoutes.splash ||
          currentLoc == AppRoutes.onboarding ||
          currentLoc == AppRoutes.login ||
          currentLoc == AppRoutes.forgotPassword;

      // Jika belum login dan mencoba masuk ke rute terproteksi
      if (!isAuthenticated && !isPublicRoute) {
        return AppRoutes.login;
      }

      // Jika sudah login tapi wajib ubah password
      if (isAuthenticated && mustChange && currentLoc != AppRoutes.changePassword) {
        return AppRoutes.changePassword;
      }

      // Jika sudah login penuh dan berada di layar login/onboarding
      if (isAuthenticated &&
          !mustChange &&
          (currentLoc == AppRoutes.login ||
              currentLoc == AppRoutes.onboarding ||
              currentLoc == AppRoutes.forgotPassword)) {
        return AppRoutes.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.changePassword,
        builder: (context, state) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: AppRoutes.taskDetail,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return TaskDetailPage(taskId: id);
        },
      ),
      GoRoute(
        path: AppRoutes.expenseForm,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const ExpenseFormPage(),
      ),
      GoRoute(
        path: AppRoutes.expenseDetail,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ExpenseDetailPage(expenseId: id);
        },
      ),
      GoRoute(
        path: AppRoutes.editProfile,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const EditProfilePage(),
      ),
      GoRoute(
        path: AppRoutes.aboutApp,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const AboutAppPage(),
      ),
      GoRoute(
        path: AppRoutes.termsConditions,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const TermsConditionsPage(),
      ),
      GoRoute(
        path: AppRoutes.privacyPolicy,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const PrivacyPolicyPage(),
      ),

      // Stateful Shell Route untuk 5 Main Tabs dengan Floating Bottom Nav
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Beranda
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.dashboard,
                builder: (context, state) => const DashboardPage(),
              ),
            ],
          ),
          // Branch 1: Task
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.tasks,
                builder: (context, state) => const TasksPage(),
              ),
            ],
          ),
          // Branch 2: Jam (Timesheet)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.timesheet,
                builder: (context, state) => const TimesheetPage(),
              ),
            ],
          ),
          // Branch 3: Biaya (Pengeluaran)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.expenses,
                builder: (context, state) => const ExpensesPage(),
              ),
            ],
          ),
          // Branch 4: Profil
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
          // Branch 5: Persetujuan (Admin & Finance)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.approvals,
                builder: (context, state) => const ApprovalsPage(),
              ),
            ],
          ),
          // Branch 6: Pembayaran (Finance)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.payments,
                builder: (context, state) => const PaymentsPage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(Ref ref) {
    ref.listen<AuthState>(authProvider, (_, __) {
      notifyListeners();
    });
  }
}
