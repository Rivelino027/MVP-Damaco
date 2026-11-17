class AppRoutes {
  AppRoutes._();

  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';
  static const String changePassword = '/change-password';

  // Main Tabs (ShellRoute)
  static const String dashboard = '/';
  static const String tasks = '/tasks';
  static const String timesheet = '/timesheet';
  static const String expenses = '/expenses';
  static const String profile = '/profile';

  // Sub Screens
  static const String notifications = '/notifications';
  static const String approvals = '/approvals';
  static const String payments = '/payments';
  static const String taskDetail = '/tasks/:id';
  static String taskDetailPath(String id) => '/tasks/$id';
  static const String expenseForm = '/expenses/new';
  static const String expenseDetail = '/expenses/:id';
  static String expenseDetailPath(String id) => '/expenses/$id';

  // Profile Sub Screens
  static const String editProfile = '/profile/edit';
  static const String aboutApp = '/profile/about';
  static const String termsConditions = '/profile/terms';
  static const String privacyPolicy = '/profile/privacy';
}

