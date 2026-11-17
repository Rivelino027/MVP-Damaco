import '../entities/approval_item_entity.dart';

enum ApprovalActionType {
  approve,
  reject,
  recordPayment;

  String get label {
    switch (this) {
      case ApprovalActionType.approve:
        return 'Setujui';
      case ApprovalActionType.reject:
        return 'Tolak';
      case ApprovalActionType.recordPayment:
        return 'Tandai Dibayar';
    }
  }
}

/// Evaluator logika hak akses aksi persetujuan dan pembayaran sesuai
/// rantai persetujuan di `docs/01-aturan-bisnis.md`:
///
/// Pengeluaran: Pengaju -> Admin (menunggu_admin) -> Finance (menunggu_finance) -> Siap Dibayar -> Dibayar
/// Timesheet  : Pengaju -> Admin (menunggu_admin) -> Disetujui
/// Anggaran   : Admin mengajukan -> Finance (menunggu_finance) -> Super Admin
class ApprovalActionEvaluator {
  const ApprovalActionEvaluator._();

  /// Menentukan apakah suatu peran boleh menyetujui dokumen tertentu
  static bool canApprove({
    required String role,
    required ApprovalDocumentType documentType,
    required String status,
  }) {
    final cleanRole = role.toLowerCase();
    final cleanStatus = status.toLowerCase();

    switch (documentType) {
      case ApprovalDocumentType.expense:
        // Admin hanya menyetujui langkah 1 (menunggu_admin)
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        // Finance hanya memverifikasi langkah 2 (menunggu_finance)
        if (cleanRole == 'finance' && cleanStatus == 'menunggu_finance') {
          return true;
        }
        return false;

      case ApprovalDocumentType.timesheet:
        // Timesheet disetujui hanya oleh Admin
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        return false;

      case ApprovalDocumentType.budgetRequest:
        // Admin menyetujui jika status menunggu_admin
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        // Finance mengecek kelayakan jika status menunggu_finance
        if (cleanRole == 'finance' && cleanStatus == 'menunggu_finance') {
          return true;
        }
        return false;
    }
  }

  /// Menentukan apakah suatu peran boleh menolak dokumen tertentu
  static bool canReject({
    required String role,
    required ApprovalDocumentType documentType,
    required String status,
  }) {
    final cleanRole = role.toLowerCase();
    final cleanStatus = status.toLowerCase();

    switch (documentType) {
      case ApprovalDocumentType.expense:
        // Admin boleh menolak saat status menunggu_admin
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        // Finance boleh menolak saat status menunggu_finance
        if (cleanRole == 'finance' && cleanStatus == 'menunggu_finance') {
          return true;
        }
        return false;

      case ApprovalDocumentType.timesheet:
        // Admin boleh menolak timesheet saat status menunggu_admin
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        return false;

      case ApprovalDocumentType.budgetRequest:
        if (cleanRole == 'admin' && cleanStatus == 'menunggu_admin') {
          return true;
        }
        if (cleanRole == 'finance' && cleanStatus == 'menunggu_finance') {
          return true;
        }
        return false;
    }
  }

  /// Menentukan apakah Finance boleh menandai pengeluaran sebagai dibayar
  static bool canRecordPayment({
    required String role,
    required ApprovalDocumentType documentType,
    required String status,
  }) {
    final cleanRole = role.toLowerCase();
    final cleanStatus = status.toLowerCase();

    // Hanya Finance yang boleh mencatat pembayaran pengeluaran siap_dibayar
    if (cleanRole == 'finance' &&
        documentType == ApprovalDocumentType.expense &&
        (cleanStatus == 'siap_dibayar' || cleanStatus == 'disetujui')) {
      return true;
    }

    return false;
  }

  /// Mengembalikan daftar aksi yang tersedia untuk role dan status dokumen
  static List<ApprovalActionType> getAvailableActions({
    required String role,
    required ApprovalDocumentType documentType,
    required String status,
  }) {
    final actions = <ApprovalActionType>[];

    if (canApprove(role: role, documentType: documentType, status: status)) {
      actions.add(ApprovalActionType.approve);
    }

    if (canReject(role: role, documentType: documentType, status: status)) {
      actions.add(ApprovalActionType.reject);
    }

    if (canRecordPayment(role: role, documentType: documentType, status: status)) {
      actions.add(ApprovalActionType.recordPayment);
    }

    return actions;
  }
}
