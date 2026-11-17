import '../entities/approval_item_entity.dart';

abstract class ApprovalsRepository {
  /// Mengambil daftar dokumen yang menunggu persetujuan sesuai role
  Future<List<ApprovalItemEntity>> getPendingApprovals({
    required String role,
    ApprovalDocumentType? documentType,
  });

  /// Menyetujui dokumen
  Future<ApprovalItemEntity> approveDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
  });

  /// Menolak dokumen dengan alasan wajib
  Future<ApprovalItemEntity> rejectDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
    required String reason,
  });

  /// Mengambil daftar pengeluaran yang siap dibayar (khusus Finance)
  Future<List<ApprovalItemEntity>> getReadyForPaymentExpenses();

  /// Mencatat pembayaran untuk pengeluaran (khusus Finance)
  Future<bool> recordPayment({
    required String expenseId,
    required String method, // 'transfer' | 'tunai'
    String? referenceNo,
    required DateTime paidAt,
  });
}

