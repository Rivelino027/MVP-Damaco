import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/features/approvals/data/repositories/approvals_repository_mock.dart';
import 'package:damacoflow/features/approvals/domain/entities/approval_item_entity.dart';
import 'package:damacoflow/features/approvals/domain/logic/approval_action_evaluator.dart';

void main() {
  group('ApprovalActionEvaluator - Matrix Hak Akses Tindakan Persetujuan', () {
    test('Pengeluaran menunggu_admin: Admin BISA setujui dan tolak, Finance TIDAK BISA', () {
      // Admin
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'admin',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_admin',
        ),
        isTrue,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'admin',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_admin',
        ),
        isTrue,
      );

      // Finance
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'finance',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_admin',
        ),
        isFalse,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'finance',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_admin',
        ),
        isFalse,
      );
    });

    test('Pengeluaran menunggu_finance: Finance BISA verifikasi dan tolak, Admin TIDAK BISA', () {
      // Finance
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'finance',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_finance',
        ),
        isTrue,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'finance',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_finance',
        ),
        isTrue,
      );

      // Admin
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'admin',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_finance',
        ),
        isFalse,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'admin',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_finance',
        ),
        isFalse,
      );
    });

    test('Timesheet menunggu_admin: Admin BISA setujui/tolak, Finance TIDAK BISA', () {
      // Admin
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'admin',
          documentType: ApprovalDocumentType.timesheet,
          status: 'menunggu_admin',
        ),
        isTrue,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'admin',
          documentType: ApprovalDocumentType.timesheet,
          status: 'menunggu_admin',
        ),
        isTrue,
      );

      // Finance
      expect(
        ApprovalActionEvaluator.canApprove(
          role: 'finance',
          documentType: ApprovalDocumentType.timesheet,
          status: 'menunggu_admin',
        ),
        isFalse,
      );
      expect(
        ApprovalActionEvaluator.canReject(
          role: 'finance',
          documentType: ApprovalDocumentType.timesheet,
          status: 'menunggu_admin',
        ),
        isFalse,
      );
    });

    test('Pengeluaran siap_dibayar: Finance BISA mencatat pembayaran, Admin/Pengguna TIDAK BISA', () {
      expect(
        ApprovalActionEvaluator.canRecordPayment(
          role: 'finance',
          documentType: ApprovalDocumentType.expense,
          status: 'siap_dibayar',
        ),
        isTrue,
      );

      expect(
        ApprovalActionEvaluator.canRecordPayment(
          role: 'admin',
          documentType: ApprovalDocumentType.expense,
          status: 'siap_dibayar',
        ),
        isFalse,
      );

      expect(
        ApprovalActionEvaluator.canRecordPayment(
          role: 'pengguna',
          documentType: ApprovalDocumentType.expense,
          status: 'siap_dibayar',
        ),
        isFalse,
      );
    });

    test('Role Pengguna tidak memiliki izin menyetujui atau menolak dokumen apa pun', () {
      expect(
        ApprovalActionEvaluator.getAvailableActions(
          role: 'pengguna',
          documentType: ApprovalDocumentType.expense,
          status: 'menunggu_admin',
        ),
        isEmpty,
      );

      expect(
        ApprovalActionEvaluator.getAvailableActions(
          role: 'pengguna',
          documentType: ApprovalDocumentType.timesheet,
          status: 'menunggu_admin',
        ),
        isEmpty,
      );
    });
  });

  group('ApprovalsRepositoryMock - Operasi Antrean & Pembayaran', () {
    late ApprovalsRepositoryMock repository;

    setUp(() {
      repository = ApprovalsRepositoryMock();
    });

    test('Admin mengambil pending approvals hanya yang berstatus menunggu_admin', () async {
      final items = await repository.getPendingApprovals(role: 'admin');
      expect(items, isNotEmpty);
      for (final item in items) {
        expect(item.status, 'menunggu_admin');
      }
    });

    test('Finance mengambil pending approvals dengan dokumen Nominal Besar di urutan pertama', () async {
      final items = await repository.getPendingApprovals(role: 'finance');
      expect(items, isNotEmpty);
      expect(items.first.isLargeAmount, isTrue);
      for (final item in items) {
        expect(item.status, 'menunggu_finance');
      }
    });

    test('Admin menyetujui pengeluaran mengubah status menjadi menunggu_finance', () async {
      final updated = await repository.approveDocument(
        documentId: 'exp-001',
        documentType: ApprovalDocumentType.expense,
        role: 'admin',
      );
      expect(updated.status, 'menunggu_finance');
      expect(updated.history.last.role, 'admin');
      expect(updated.history.last.status, 'disetujui');
    });

    test('Admin menolak pengeluaran dengan alasan wajib', () async {
      final updated = await repository.rejectDocument(
        documentId: 'exp-002',
        documentType: ApprovalDocumentType.expense,
        role: 'admin',
        reason: 'Nota buram dan tidak terbaca',
      );
      expect(updated.status, 'ditolak');
      expect(updated.history.last.reason, 'Nota buram dan tidak terbaca');
    });

    test('Finance mengambil pengeluaran siap dibayar dan mencatat pembayaran', () async {
      final readyList = await repository.getReadyForPaymentExpenses();
      expect(readyList, isNotEmpty);
      expect(readyList.first.status, 'siap_dibayar');

      final success = await repository.recordPayment(
        expenseId: readyList.first.documentId,
        method: 'transfer',
        referenceNo: 'TRF-TEST-123',
        paidAt: DateTime.now(),
      );
      expect(success, isTrue);
    });
  });
}
