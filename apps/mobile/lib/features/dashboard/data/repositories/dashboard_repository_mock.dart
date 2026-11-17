import '../../../tasks/domain/entities/task_entity.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../../domain/repositories/dashboard_repository.dart';

class DashboardRepositoryMock implements DashboardRepository {
  @override
  Future<DashboardSummaryEntity> getDashboardSummary() async {
    await Future.delayed(const Duration(milliseconds: 300));

    final now = DateTime.now();

    final recentTasks = [
      TaskEntity(
        id: 'task-1',
        projectId: 'proj-1',
        phaseId: 'phase-1',
        title: 'Konfigurasi VLAN Lantai 2',
        description: 'Melakukan konfigurasi VLAN switch lantai 2',
        status: 'review',
        priority: 'tinggi',
        dueDate: DateTime(now.year, now.month, now.day), // Hari ini
        project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      ),
      TaskEntity(
        id: 'task-4',
        projectId: 'proj-1',
        phaseId: 'phase-1',
        title: 'Dokumentasi Topologi Jaringan',
        description: 'Membuat diagram topologi jaringan fisik dan logis',
        status: 'dikerjakan',
        priority: 'sedang',
        dueDate: DateTime(now.year, now.month, now.day + 1), // Besok
        project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      ),
      TaskEntity(
        id: 'task-2',
        projectId: 'proj-1',
        phaseId: 'phase-1',
        title: 'Backup Server Utama',
        description: 'Full backup server database',
        status: 'belum_mulai',
        priority: 'sedang',
        dueDate: DateTime(now.year, now.month, now.day + 10),
        project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      ),
    ];

    final recentExpenses = [
      DashboardExpenseItem(
        id: 'exp-1',
        title: 'Lisensi Figma',
        categoryName: 'Perangkat Lunak',
        date: DateTime(2026, 9, 10),
        amount: 1250000.0,
        status: 'menunggu_admin',
      ),
      DashboardExpenseItem(
        id: 'exp-2',
        title: 'Transport Tim',
        categoryName: 'Transportasi',
        date: DateTime(2026, 9, 8),
        amount: 850000.0,
        status: 'disetujui',
      ),
    ];

    return DashboardSummaryEntity(
      activeTasksCount: 5,
      dueTasksCount: 3,
      pendingApprovalsCount: 1,
      weeklyFilledHours: 28.0,
      weeklyTargetHours: 40.0,
      hasUnreadNotifications: true,
      recentTasks: recentTasks,
      recentExpenses: recentExpenses,
    );
  }
}

