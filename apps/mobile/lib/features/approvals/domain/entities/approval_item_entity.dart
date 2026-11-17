import '../../../../core/utils/decimal_converter.dart';

enum ApprovalDocumentType {
  expense,
  timesheet,
  budgetRequest;

  static ApprovalDocumentType fromString(String val) {
    switch (val.toLowerCase()) {
      case 'timesheet':
        return ApprovalDocumentType.timesheet;
      case 'budget_request':
      case 'budgetrequest':
      case 'anggaran':
        return ApprovalDocumentType.budgetRequest;
      case 'expense':
      case 'pengeluaran':
      default:
        return ApprovalDocumentType.expense;
    }
  }

  String get displayName {
    switch (this) {
      case ApprovalDocumentType.expense:
        return 'Pengeluaran';
      case ApprovalDocumentType.timesheet:
        return 'Timesheet';
      case ApprovalDocumentType.budgetRequest:
        return 'Anggaran';
    }
  }
}

class ApprovalHistoryStep {
  final String role;
  final String status; // 'menunggu', 'disetujui', 'ditolak'
  final String? approverName;
  final DateTime? actedAt;
  final String? reason;

  const ApprovalHistoryStep({
    required this.role,
    required this.status,
    this.approverName,
    this.actedAt,
    this.reason,
  });

  factory ApprovalHistoryStep.fromJson(Map<String, dynamic> json) {
    return ApprovalHistoryStep(
      role: json['role']?.toString() ?? '',
      status: json['status']?.toString() ?? 'menunggu',
      approverName: json['approverName'] ?? json['approver']?['name'],
      actedAt: json['actedAt'] != null
          ? DateTime.tryParse(json['actedAt'].toString())
          : null,
      reason: json['reason']?.toString(),
    );
  }
}

class ApprovalItemEntity {
  final String id;
  final String documentId;
  final ApprovalDocumentType documentType;
  final String title;
  final String applicantName;
  final String applicantDepartment;
  final String costCenterCode;
  final double amount;
  final double hours; // Khusus timesheet
  final String status;
  final bool isLargeAmount;
  final List<String> flags; // 'terindikasi_dipecah', 'vendor_baru'
  final DateTime submittedAt;
  final String? receiptUrl;
  final String? note;
  final String? vendor;
  final List<ApprovalHistoryStep> history;

  const ApprovalItemEntity({
    required this.id,
    required this.documentId,
    required this.documentType,
    required this.title,
    required this.applicantName,
    required this.applicantDepartment,
    required this.costCenterCode,
    this.amount = 0.0,
    this.hours = 0.0,
    required this.status,
    this.isLargeAmount = false,
    this.flags = const [],
    required this.submittedAt,
    this.receiptUrl,
    this.note,
    this.vendor,
    this.history = const [],
  });

  factory ApprovalItemEntity.fromJson(Map<String, dynamic> json) {
    double parsedAmount = 0.0;
    if (json['amount'] != null) {
      parsedAmount = double.tryParse(
              DecimalConverter.toDecimalString(json['amount'])) ??
          0.0;
    }

    double parsedHours = 0.0;
    if (json['hours'] != null) {
      parsedHours = double.tryParse(json['hours'].toString()) ?? 0.0;
    }

    final rawFlags = json['flags'];
    final flags = <String>[];
    if (rawFlags is List) {
      for (final f in rawFlags) {
        flags.add(f.toString());
      }
    }

    final rawHistory = json['history'] ?? json['approvals'];
    final history = <ApprovalHistoryStep>[];
    if (rawHistory is List) {
      for (final h in rawHistory) {
        if (h is Map<String, dynamic>) {
          history.add(ApprovalHistoryStep.fromJson(h));
        }
      }
    }

    return ApprovalItemEntity(
      id: json['id']?.toString() ?? '',
      documentId: json['documentId']?.toString() ?? json['id']?.toString() ?? '',
      documentType:
          ApprovalDocumentType.fromString(json['documentType']?.toString() ?? 'expense'),
      title: json['title']?.toString() ?? 'Pengajuan',
      applicantName: json['applicantName']?.toString() ?? 'Karyawan',
      applicantDepartment:
          json['applicantDepartment']?.toString() ?? 'Departemen IT',
      costCenterCode: json['costCenterCode']?.toString() ?? 'CC-IT-02',
      amount: parsedAmount,
      hours: parsedHours,
      status: json['status']?.toString() ?? 'menunggu_admin',
      isLargeAmount: json['isLargeAmount'] == true,
      flags: flags,
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      receiptUrl: json['receiptUrl']?.toString(),
      note: json['note']?.toString(),
      vendor: json['vendor']?.toString(),
      history: history,
    );
  }

  ApprovalItemEntity copyWith({
    String? status,
    List<ApprovalHistoryStep>? history,
  }) {
    return ApprovalItemEntity(
      id: id,
      documentId: documentId,
      documentType: documentType,
      title: title,
      applicantName: applicantName,
      applicantDepartment: applicantDepartment,
      costCenterCode: costCenterCode,
      amount: amount,
      hours: hours,
      status: status ?? this.status,
      isLargeAmount: isLargeAmount,
      flags: flags,
      submittedAt: submittedAt,
      receiptUrl: receiptUrl,
      note: note,
      vendor: vendor,
      history: history ?? this.history,
    );
  }
}

