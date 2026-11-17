import '../../../../core/network/dio_client.dart';
import '../../domain/entities/approval_item_entity.dart';
import '../../domain/repositories/approvals_repository.dart';

class ApprovalsRepositoryRemote implements ApprovalsRepository {
  final DioClient _dioClient;

  ApprovalsRepositoryRemote({required DioClient dioClient})
      : _dioClient = dioClient;

  @override
  Future<List<ApprovalItemEntity>> getPendingApprovals({
    required String role,
    ApprovalDocumentType? documentType,
  }) async {
    final cleanRole = role.toLowerCase();
    final items = <ApprovalItemEntity>[];

    try {
      // 1. Ambil Pengeluaran yang menunggu role ini
      if (documentType == null ||
          documentType == ApprovalDocumentType.expense) {
        final expenseStatus = cleanRole == 'admin'
            ? 'menunggu_admin'
            : 'menunggu_finance';

        final res = await _dioClient.get(
          '/expenses',
          queryParameters: {'status': expenseStatus},
        );

        final rawList = res.data['data'] ?? res.data;
        if (rawList is List) {
          for (final item in rawList) {
            if (item is Map<String, dynamic>) {
              items.add(ApprovalItemEntity.fromJson({
                ...item,
                'documentType': 'expense',
              }));
            }
          }
        }
      }

      // 2. Ambil Timesheet (khusus Admin)
      if (cleanRole == 'admin' &&
          (documentType == null ||
              documentType == ApprovalDocumentType.timesheet)) {
        final res = await _dioClient.get(
          '/timesheets/team',
          queryParameters: {'status': 'menunggu_admin'},
        );

        final rawList = res.data['data'] ?? res.data;
        if (rawList is List) {
          for (final item in rawList) {
            if (item is Map<String, dynamic>) {
              items.add(ApprovalItemEntity.fromJson({
                ...item,
                'documentType': 'timesheet',
              }));
            }
          }
        }
      }

      // Sort: jika Finance, dahulukan isLargeAmount
      if (cleanRole == 'finance') {
        items.sort((a, b) {
          if (a.isLargeAmount && !b.isLargeAmount) return -1;
          if (!a.isLargeAmount && b.isLargeAmount) return 1;
          return b.submittedAt.compareTo(a.submittedAt);
        });
      } else {
        items.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
      }

      return items;
    } catch (_) {
      // Re-throw handled by provider
      rethrow;
    }
  }

  @override
  Future<ApprovalItemEntity> approveDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
  }) async {
    final cleanRole = role.toLowerCase();

    if (documentType == ApprovalDocumentType.expense) {
      final endpoint = cleanRole == 'admin'
          ? '/expenses/$documentId/approve'
          : '/expenses/$documentId/verify';
      final res = await _dioClient.post(endpoint);
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'expense',
      });
    } else if (documentType == ApprovalDocumentType.timesheet) {
      final res = await _dioClient.post('/timesheets/$documentId/approve');
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'timesheet',
      });
    } else {
      // Budget request approval endpoint
      final res = await _dioClient.post('/budget-requests/$documentId/approve');
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'budget_request',
      });
    }
  }

  @override
  Future<ApprovalItemEntity> rejectDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
    required String reason,
  }) async {
    if (documentType == ApprovalDocumentType.expense) {
      final res = await _dioClient.post(
        '/expenses/$documentId/reject',
        data: {'reason': reason},
      );
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'expense',
      });
    } else if (documentType == ApprovalDocumentType.timesheet) {
      final res = await _dioClient.post(
        '/timesheets/$documentId/reject',
        data: {'reason': reason},
      );
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'timesheet',
      });
    } else {
      final res = await _dioClient.post(
        '/budget-requests/$documentId/reject',
        data: {'reason': reason},
      );
      return ApprovalItemEntity.fromJson({
        ...res.data,
        'documentType': 'budget_request',
      });
    }
  }

  @override
  Future<List<ApprovalItemEntity>> getReadyForPaymentExpenses() async {
    final res = await _dioClient.get(
      '/expenses',
      queryParameters: {'status': 'siap_dibayar'},
    );

    final items = <ApprovalItemEntity>[];
    final rawList = res.data['data'] ?? res.data;
    if (rawList is List) {
      for (final item in rawList) {
        if (item is Map<String, dynamic>) {
          items.add(ApprovalItemEntity.fromJson({
            ...item,
            'documentType': 'expense',
          }));
        }
      }
    }
    return items;
  }

  @override
  Future<bool> recordPayment({
    required String expenseId,
    required String method,
    String? referenceNo,
    required DateTime paidAt,
  }) async {
    final res = await _dioClient.post(
      '/expenses/$expenseId/payment',
      data: {
        'method': method,
        'referenceNo': referenceNo,
        'paidAt': paidAt.toIso8601String(),
      },
    );
    return res.statusCode == 200 || res.statusCode == 201;
  }
}

