import 'dart:math';
import '../../../../core/utils/decimal_converter.dart';
import 'expense_approval_entity.dart';
import 'expense_attachment_entity.dart';
import 'expense_category_entity.dart';
import 'expense_payment_entity.dart';

class ExpenseEntity {
  final String id;
  final String requesterId;
  final String? requesterName;
  final String projectId;
  final String? projectName;
  final String? taskId;
  final String? taskTitle;
  final String costCenterId;
  final String? costCenterCode;
  final String? costCenterName;
  final String categoryId;
  final ExpenseCategoryEntity? category;
  final double amount;
  final DateTime expenseDate;
  final String? vendor;
  final String? title;
  final String? note;
  final String status; // draft, menunggu_admin, menunggu_finance, disetujui, ditolak, siap_dibayar, dibayar
  final bool isLargeAmount;
  final double? limitAtSubmission;
  final DateTime? submittedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final ExpensePaymentEntity? payment;
  final List<ExpenseApprovalEntity> approvals;
  final List<ExpenseAttachmentEntity> attachments;

  const ExpenseEntity({
    required this.id,
    required this.requesterId,
    this.requesterName,
    required this.projectId,
    this.projectName,
    this.taskId,
    this.taskTitle,
    required this.costCenterId,
    this.costCenterCode,
    this.costCenterName,
    required this.categoryId,
    this.category,
    required this.amount,
    required this.expenseDate,
    this.vendor,
    this.title,
    this.note,
    required this.status,
    this.isLargeAmount = false,
    this.limitAtSubmission,
    this.submittedAt,
    this.createdAt,
    this.updatedAt,
    this.payment,
    this.approvals = const [],
    this.attachments = const [],
  });

  factory ExpenseEntity.fromJson(Map<String, dynamic> json) {
    double parsedAmount = 0.0;
    if (json['amount'] != null) {
      final str = DecimalConverter.toDecimalString(json['amount']);
      parsedAmount = double.tryParse(str) ?? 0.0;
    }

    double? parsedLimit;
    if (json['limitAtSubmission'] != null) {
      final str = DecimalConverter.toDecimalString(json['limitAtSubmission']);
      parsedLimit = double.tryParse(str);
    }

    DateTime parsedExpenseDate;
    if (json['expenseDate'] != null) {
      parsedExpenseDate =
          DateTime.tryParse(json['expenseDate'].toString()) ?? DateTime.now();
    } else {
      parsedExpenseDate = DateTime.now();
    }

    // Requester
    String? requesterName;
    if (json['requester'] is Map<String, dynamic>) {
      requesterName = json['requester']['name']?.toString();
    } else {
      requesterName = json['requesterName']?.toString();
    }

    // Project
    String? projectName;
    if (json['project'] is Map<String, dynamic>) {
      projectName = json['project']['name']?.toString();
    } else {
      projectName = json['projectName']?.toString();
    }

    // Task
    String? taskTitle;
    if (json['task'] is Map<String, dynamic>) {
      taskTitle = json['task']['title']?.toString();
    } else {
      taskTitle = json['taskTitle']?.toString();
    }

    // Cost Center
    String? costCenterCode;
    String? costCenterName;
    if (json['costCenter'] is Map<String, dynamic>) {
      costCenterCode = json['costCenter']['code']?.toString();
      costCenterName = json['costCenter']['name']?.toString();
    } else {
      costCenterCode = json['costCenterCode']?.toString();
      costCenterName = json['costCenterName']?.toString();
    }

    // Category
    ExpenseCategoryEntity? category;
    if (json['category'] is Map<String, dynamic>) {
      category = ExpenseCategoryEntity.fromJson(
          json['category'] as Map<String, dynamic>);
    }

    // Payment
    ExpensePaymentEntity? payment;
    if (json['payment'] is Map<String, dynamic>) {
      payment = ExpensePaymentEntity.fromJson(
          json['payment'] as Map<String, dynamic>);
    }

    // Approvals
    final approvals = <ExpenseApprovalEntity>[];
    final dynamic rawApprovals =
        json['approvalHistory'] ?? json['approvals'];
    if (rawApprovals is List) {
      for (final item in rawApprovals) {
        if (item is Map<String, dynamic>) {
          approvals.add(ExpenseApprovalEntity.fromJson(item));
        }
      }
    }

    // Attachments
    final attachments = <ExpenseAttachmentEntity>[];
    if (json['attachments'] is List) {
      for (final item in json['attachments']) {
        if (item is Map<String, dynamic>) {
          attachments.add(ExpenseAttachmentEntity.fromJson(item));
        }
      }
    }

    return ExpenseEntity(
      id: json['id']?.toString() ?? '',
      requesterId: json['requesterId']?.toString() ?? '',
      requesterName: requesterName,
      projectId: json['projectId']?.toString() ?? '',
      projectName: projectName,
      taskId: json['taskId']?.toString(),
      taskTitle: taskTitle,
      costCenterId: json['costCenterId']?.toString() ?? '',
      costCenterCode: costCenterCode,
      costCenterName: costCenterName,
      categoryId: json['categoryId']?.toString() ?? '',
      category: category,
      amount: parsedAmount,
      expenseDate: parsedExpenseDate,
      vendor: json['vendor']?.toString(),
      title: json['title']?.toString(),
      note: json['note']?.toString(),
      status: json['status']?.toString() ?? 'draft',
      isLargeAmount: json['isLargeAmount'] == true ||
          json['isLargeAmount'] == 1 ||
          parsedAmount >= 5000000.0,
      limitAtSubmission: parsedLimit,
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
      payment: payment,
      approvals: approvals,
      attachments: attachments,
    );
  }

  Map<String, dynamic> toJson() {
    final dateStr =
        "${expenseDate.year.toString().padLeft(4, '0')}-${expenseDate.month.toString().padLeft(2, '0')}-${expenseDate.day.toString().padLeft(2, '0')}";

    return {
      'id': id,
      'requesterId': requesterId,
      'projectId': projectId,
      if (taskId != null) 'taskId': taskId,
      'costCenterId': costCenterId,
      'categoryId': categoryId,
      'amount': amount,
      'expenseDate': dateStr,
      if (vendor != null) 'vendor': vendor,
      if (title != null) 'title': title,
      if (note != null) 'note': note,
      'status': status,
      'isLargeAmount': isLargeAmount,
    };
  }

  /// Catatan ketidakcocokan #1 di docs/AGENT_RULES.md:
  /// Jika title ada (atau vendor diisi judul seperti di desain), prioritaskan title -> vendor -> category name -> note.
  String get displayTitle {
    if (title != null && title!.trim().isNotEmpty) {
      return title!.trim();
    }
    if (vendor != null && vendor!.trim().isNotEmpty) {
      return vendor!.trim();
    }
    if (category != null && category!.name.trim().isNotEmpty) {
      return category!.name.trim();
    }
    if (note != null && note!.trim().isNotEmpty) {
      return note!.trim();
    }
    return 'Pengeluaran #$displayCode';
  }

  /// Catatan ketidakcocokan #4 di docs/AGENT_RULES.md:
  /// Format kode dokumen resmi EXP-XXXXXX
  String get displayCode {
    // // TODO: format kode resmi dari backend jika kolom kode unik dibuat
    if (id.isEmpty) return 'EXP-NEW';
    final clean = id.replaceAll('-', '');
    final code = clean.substring(0, min(clean.length, 6)).toUpperCase();
    return 'EXP-$code';
  }

  /// Label status dalam Bahasa Indonesia sesuai desain screenshot
  String get displayStatusLabel {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Draft';
      case 'menunggu_admin':
        return 'Menunggu Admin';
      case 'menunggu_finance':
        return 'Menunggu Finance';
      case 'disetujui':
        return 'Disetujui';
      case 'siap_dibayar':
        return 'Siap Dibayar';
      case 'dibayar':
        return 'Dibayar';
      case 'ditolak':
        return 'Ditolak';
      default:
        return status;
    }
  }

  /// Pemetaan status ke chip filter (Semua, Draft, Diproses, Siap Dibayar, Dibayar, Ditolak)
  /// Aturan Prompt:
  /// Diproses = menunggu_admin + menunggu_finance
  /// Siap Dibayar = siap_dibayar (+ disetujui)
  bool matchesFilter(String filter) {
    switch (filter) {
      case 'Semua':
        return true;
      case 'Draft':
        return status == 'draft';
      case 'Diproses':
        return status == 'menunggu_admin' || status == 'menunggu_finance';
      case 'Siap Dibayar':
        return status == 'siap_dibayar' || status == 'disetujui';
      case 'Dibayar':
        return status == 'dibayar';
      case 'Ditolak':
        return status == 'ditolak';
      default:
        return true;
    }
  }

  /// Catatan ketidakcocokan #6 di docs/AGENT_RULES.md:
  /// Alasan penolakan diambil dari baris approvals terakhir yang memiliki status ditolak.
  String? get rejectReason {
    if (status != 'ditolak') return null;
    for (final a in approvals.reversed) {
      if (a.status == 'ditolak' && a.reason != null && a.reason!.isNotEmpty) {
        return a.reason;
      }
    }
    if (note != null && note!.contains('Ditolak:')) {
      return note!;
    }
    return 'Pengeluaran ditolak tanpa alasan tertulis.';
  }

  bool get isEditable => status == 'draft' || status == 'ditolak';
  bool get isDeletable => status == 'draft' || status == 'ditolak';
  bool get canSubmit => status == 'draft' || status == 'ditolak';

  ExpenseEntity copyWith({
    String? id,
    String? requesterId,
    String? requesterName,
    String? projectId,
    String? projectName,
    String? taskId,
    String? taskTitle,
    String? costCenterId,
    String? costCenterCode,
    String? costCenterName,
    String? categoryId,
    ExpenseCategoryEntity? category,
    double? amount,
    DateTime? expenseDate,
    String? vendor,
    String? title,
    String? note,
    String? status,
    bool? isLargeAmount,
    double? limitAtSubmission,
    DateTime? submittedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    ExpensePaymentEntity? payment,
    List<ExpenseApprovalEntity>? approvals,
    List<ExpenseAttachmentEntity>? attachments,
  }) {
    return ExpenseEntity(
      id: id ?? this.id,
      requesterId: requesterId ?? this.requesterId,
      requesterName: requesterName ?? this.requesterName,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      taskId: taskId ?? this.taskId,
      taskTitle: taskTitle ?? this.taskTitle,
      costCenterId: costCenterId ?? this.costCenterId,
      costCenterCode: costCenterCode ?? this.costCenterCode,
      costCenterName: costCenterName ?? this.costCenterName,
      categoryId: categoryId ?? this.categoryId,
      category: category ?? this.category,
      amount: amount ?? this.amount,
      expenseDate: expenseDate ?? this.expenseDate,
      vendor: vendor ?? this.vendor,
      title: title ?? this.title,
      note: note ?? this.note,
      status: status ?? this.status,
      isLargeAmount: isLargeAmount ?? this.isLargeAmount,
      limitAtSubmission: limitAtSubmission ?? this.limitAtSubmission,
      submittedAt: submittedAt ?? this.submittedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      payment: payment ?? this.payment,
      approvals: approvals ?? this.approvals,
      attachments: attachments ?? this.attachments,
    );
  }
}

