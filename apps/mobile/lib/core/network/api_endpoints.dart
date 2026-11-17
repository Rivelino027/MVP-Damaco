class ApiEndpoints {
  ApiEndpoints._();

  // -------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';

  // -------------------------------------------------------------
  // TASKS
  // -------------------------------------------------------------
  static const String tasks = '/tasks';
  static const String myTasks = '/tasks/my-tasks';
  static String taskDetail(String id) => '/tasks/$id';
  static String updateTaskStatus(String id) => '/tasks/$id/status';
  static String taskComments(String id) => '/tasks/$id/comments';
  static String taskChecklists(String id) => '/tasks/$id/checklists';
  static String toggleChecklist(String taskId, String checklistId) =>
      '/tasks/$taskId/checklists/$checklistId';
  static String taskAttachments(String id) => '/tasks/$id/attachments';

  // -------------------------------------------------------------
  // TIMESHEETS
  // -------------------------------------------------------------
  static const String timesheets = '/timesheets';
  static const String myTimesheets = '/timesheets/my';
  static const String teamTimesheets = '/timesheets/team'; // Admin only
  static String timesheetDetail(String id) => '/timesheets/$id';
  static String updateTimesheet(String id) => '/timesheets/$id';
  static String submitTimesheet(String id) => '/timesheets/$id/submit';
  static String approveTimesheet(String id) => '/timesheets/$id/approve';
  static String rejectTimesheet(String id) => '/timesheets/$id/reject';

  // -------------------------------------------------------------
  // EXPENSES (PENGELUARAN)
  // -------------------------------------------------------------
  static const String expenses = '/expenses';
  static String expenseDetail(String id) => '/expenses/$id';
  static String submitExpense(String id) => '/expenses/$id/submit';
  static String approveAdminExpense(String id) => '/expenses/$id/approve';
  static String verifyFinanceExpense(String id) => '/expenses/$id/verify';
  static String rejectExpense(String id) => '/expenses/$id/reject';
  static String recordPaymentExpense(String id) => '/expenses/$id/payment';
  static String expenseAttachments(String id) => '/expenses/$id/attachments';

  // Batas Nominal Besar
  static const String currentLimit = '/expenses/limit/current';
  static const String limitHistory = '/expenses/limit/history';
  static const String proposeLimit = '/expenses/limit/propose';
  static String confirmLimit(String id) => '/expenses/limit/$id/confirm';

  // -------------------------------------------------------------
  // DASHBOARD
  // -------------------------------------------------------------
  static const String dashboardAdmin = '/dashboard/admin';
  static const String dashboardFinance = '/dashboard/finance';
  // Catatan: Dashboard Pengguna mengambil data langsung dari myTasks, myTimesheets, dan expenses

  // -------------------------------------------------------------
  // MASTER DATA / PROJECTS
  // -------------------------------------------------------------
  static const String projects = '/projects';
  static String projectDetail(String id) => '/projects/$id';
  static String projectPhases(String id) => '/projects/$id/phases';

  // Master Categories & Cost Centers (Super Admin / Read-only)
  static const String expenseCategories = '/super-admin/expense-categories';
  static const String costCenters = '/super-admin/cost-centers';

  // -------------------------------------------------------------
  // NOTIFICATIONS & DEVICE TOKENS
  // -------------------------------------------------------------
  static const String notifications = '/notifications';
  static String markNotificationAsRead(String id) => '/notifications/$id/read';
  static const String markAllNotificationsAsRead = '/notifications/read-all';
  static const String registerDeviceToken = '/device-tokens';
  static String unregisterDeviceToken(String token) => '/device-tokens/$token';
}

