import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/app_exception.dart';
import '../../../tasks/domain/entities/task_entity.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../../domain/repositories/dashboard_repository.dart';

class DashboardRepositoryRemote implements DashboardRepository {
  final Dio _dio;

  DashboardRepositoryRemote(this._dio);

  @override
  Future<DashboardSummaryEntity> getDashboardSummary() async {
    try {
      // 1. Ambil tasks milik user
      final tasksResponse = await _dio.get(
        ApiEndpoints.myTasks,
        queryParameters: {'limit': 10},
      );

      final List<dynamic> taskItems;
      final rawTaskData = tasksResponse.data;
      if (rawTaskData is Map<String, dynamic> && rawTaskData['data'] is List) {
        taskItems = rawTaskData['data'] as List<dynamic>;
      } else if (rawTaskData is List) {
        taskItems = rawTaskData;
      } else {
        taskItems = [];
      }

      final tasks = taskItems
          .map((item) => TaskEntity.fromJson(item as Map<String, dynamic>))
          .toList();

      final activeTasks = tasks.where((t) => t.status != 'selesai').toList();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final dueTasks = tasks.where((t) {
        if (t.dueDate == null || t.status == 'selesai') return false;
        final due = DateTime(t.dueDate!.year, t.dueDate!.month, t.dueDate!.day);
        return due.compareTo(today) <= 0;
      }).toList();

      // 2. Ambil timesheet minggu ini
      double filledHours = 0.0;
      try {
        final timesheetResponse = await _dio.get(
          ApiEndpoints.myTimesheets,
          queryParameters: {'limit': 1},
        );
        final rawTimesheet = timesheetResponse.data;
        if (rawTimesheet is Map<String, dynamic> &&
            rawTimesheet['data'] is List &&
            (rawTimesheet['data'] as List).isNotEmpty) {
          final firstTs = rawTimesheet['data'][0] as Map<String, dynamic>;
          if (firstTs['entries'] is List) {
            for (final entry in firstTs['entries']) {
              final h = entry['hours'];
              if (h is num) filledHours += h.toDouble();
            }
          }
        }
      } catch (_) {
        // Fallback jika belum ada timesheet
      }

      // 3. Ambil pengeluaran
      final List<DashboardExpenseItem> expenseItems = [];
      int pendingCount = 0;
      try {
        final expensesResponse = await _dio.get(
          ApiEndpoints.expenses,
          queryParameters: {'limit': 5},
        );
        final rawExp = expensesResponse.data;
        final List<dynamic> expList;
        if (rawExp is Map<String, dynamic> && rawExp['data'] is List) {
          expList = rawExp['data'] as List<dynamic>;
        } else if (rawExp is List) {
          expList = rawExp;
        } else {
          expList = [];
        }

        for (final item in expList) {
          if (item is Map<String, dynamic>) {
            final exp = DashboardExpenseItem.fromJson(item);
            expenseItems.add(exp);
            if (exp.status.contains('menunggu')) {
              pendingCount++;
            }
          }
        }
      } catch (_) {
        // Fallback jika gagal memuat pengeluaran
      }

      return DashboardSummaryEntity(
        activeTasksCount: activeTasks.length,
        dueTasksCount: dueTasks.length,
        pendingApprovalsCount: pendingCount,
        weeklyFilledHours: filledHours,
        weeklyTargetHours: 40.0,
        hasUnreadNotifications: true,
        recentTasks: activeTasks.take(4).toList(),
        recentExpenses: expenseItems.take(2).toList(),
      );
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }
}

