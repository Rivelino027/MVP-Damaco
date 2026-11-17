import '../../../tasks/domain/entities/task_entity.dart';

class DashboardExpenseItem {
  final String id;
  final String title;
  final String categoryName;
  final DateTime date;
  final double amount;
  final String status;

  const DashboardExpenseItem({
    required this.id,
    required this.title,
    required this.categoryName,
    required this.date,
    required this.amount,
    required this.status,
  });

  factory DashboardExpenseItem.fromJson(Map<String, dynamic> json) {
    double parsedAmount = 0.0;
    if (json['amount'] is num) {
      parsedAmount = (json['amount'] as num).toDouble();
    } else if (json['amount'] != null) {
      parsedAmount = double.tryParse(json['amount'].toString()) ?? 0.0;
    }

    String category = 'Lain-lain';
    if (json['category'] is Map<String, dynamic>) {
      category = json['category']['name']?.toString() ?? 'Lain-lain';
    } else if (json['categoryName'] != null) {
      category = json['categoryName'].toString();
    }

    // Title fallback to vendor or note if title is null
    String title = json['title']?.toString() ?? '';
    if (title.isEmpty) {
      title = json['vendor']?.toString() ?? '';
    }
    if (title.isEmpty) {
      title = json['note']?.toString() ?? 'Pengeluaran';
    }

    DateTime parsedDate;
    if (json['spentDate'] != null) {
      parsedDate = DateTime.tryParse(json['spentDate'].toString()) ?? DateTime.now();
    } else if (json['date'] != null) {
      parsedDate = DateTime.tryParse(json['date'].toString()) ?? DateTime.now();
    } else if (json['createdAt'] != null) {
      parsedDate = DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    return DashboardExpenseItem(
      id: json['id']?.toString() ?? '',
      title: title,
      categoryName: category,
      date: parsedDate,
      amount: parsedAmount,
      status: json['status']?.toString() ?? 'menunggu_admin',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'categoryName': categoryName,
      'date': date.toIso8601String(),
      'amount': amount,
      'status': status,
    };
  }
}

class DashboardSummaryEntity {
  final int activeTasksCount;
  final int dueTasksCount;
  final int pendingApprovalsCount;
  final double weeklyFilledHours;
  final double weeklyTargetHours;
  final bool hasUnreadNotifications;
  final List<TaskEntity> recentTasks;
  final List<DashboardExpenseItem> recentExpenses;

  const DashboardSummaryEntity({
    required this.activeTasksCount,
    required this.dueTasksCount,
    required this.pendingApprovalsCount,
    required this.weeklyFilledHours,
    this.weeklyTargetHours = 40.0,
    this.hasUnreadNotifications = false,
    this.recentTasks = const [],
    this.recentExpenses = const [],
  });

  double get weeklyProgressFraction {
    if (weeklyTargetHours <= 0) return 0.0;
    final frac = weeklyFilledHours / weeklyTargetHours;
    return frac > 1.0 ? 1.0 : (frac < 0 ? 0.0 : frac);
  }

  double get remainingWeeklyHours {
    final rem = weeklyTargetHours - weeklyFilledHours;
    return rem < 0 ? 0 : rem;
  }
}

