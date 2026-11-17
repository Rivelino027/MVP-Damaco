import '../../domain/entities/approval_item_entity.dart';
import '../../domain/repositories/approvals_repository.dart';

class ApprovalsRepositoryMock implements ApprovalsRepository {
  final List<ApprovalItemEntity> _items = [
    // 1. Pengeluaran Menunggu Admin
    ApprovalItemEntity(
      id: 'appr-exp-001',
      documentId: 'exp-001',
      documentType: ApprovalDocumentType.expense,
      title: 'Kabel LAN & konektor',
      applicantName: 'Lilit',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      amount: 850000,
      status: 'menunggu_admin',
      isLargeAmount: false,
      submittedAt: DateTime(2026, 10, 15, 14, 30),
      receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e4c018a482a?w=600',
      note: 'Pengadaan kabel patch cord Cat6 untuk lantai 2',
      vendor: 'PT Jaya Mandiri',
      history: const [
        ApprovalHistoryStep(
          role: 'pengguna',
          status: 'disetujui',
          approverName: 'Lilit',
        ),
      ],
    ),

    // 2. Pengeluaran Menunggu Admin (Nominal Besar + Terindikasi Dipecah)
    ApprovalItemEntity(
      id: 'appr-exp-002',
      documentId: 'exp-002',
      documentType: ApprovalDocumentType.expense,
      title: 'Server rack & UPS',
      applicantName: 'Lilit',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      amount: 9800000,
      status: 'menunggu_admin',
      isLargeAmount: true,
      flags: const ['terindikasi_dipecah'],
      submittedAt: DateTime(2026, 10, 14, 11, 20),
      receiptUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      note: 'Pembelian UPS Online 2000VA dan unit rak tertutup untuk data center cabang',
      vendor: 'CV Solusi Daya',
      history: const [
        ApprovalHistoryStep(
          role: 'pengguna',
          status: 'disetujui',
          approverName: 'Lilit',
        ),
      ],
    ),

    // 3. Timesheet Menunggu Admin
    ApprovalItemEntity(
      id: 'appr-ts-001',
      documentId: 'ts-001',
      documentType: ApprovalDocumentType.timesheet,
      title: 'Timesheet Minggu 12 - 18 Okt 2026',
      applicantName: 'Lilit',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      hours: 28.0,
      status: 'menunggu_admin',
      submittedAt: DateTime(2026, 10, 18, 17, 00),
      note: 'Pengerjaan konfigurasi VLAN lantai 2 dan implementasi monitoring server baru.',
      history: const [
        ApprovalHistoryStep(
          role: 'pengguna',
          status: 'disetujui',
          approverName: 'Lilit',
        ),
      ],
    ),

    // 4. Pengeluaran Menunggu Finance (Nominal Besar + Vendor Baru)
    ApprovalItemEntity(
      id: 'appr-exp-003',
      documentId: 'exp-003',
      documentType: ApprovalDocumentType.expense,
      title: 'Sewa server cloud Q4',
      applicantName: 'Lilit',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      amount: 7500000,
      status: 'menunggu_finance',
      isLargeAmount: true,
      flags: const ['vendor_baru'],
      submittedAt: DateTime(2026, 10, 12, 10, 00),
      receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e4c018a482a?w=600',
      note: 'Pembayaran langganan cloud compute AWS Q4 untuk server staging internal.',
      vendor: 'Amazon Web Services',
      history: const [
        ApprovalHistoryStep(
          role: 'admin',
          status: 'disetujui',
          approverName: 'Ransink (IT Manager)',
        ),
      ],
    ),

    // 5. Anggaran Menunggu Finance
    ApprovalItemEntity(
      id: 'appr-bg-001',
      documentId: 'bg-001',
      documentType: ApprovalDocumentType.budgetRequest,
      title: 'Penambahan Anggaran Server Q4',
      applicantName: 'Ransink',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      amount: 45000000,
      status: 'menunggu_finance',
      isLargeAmount: true,
      submittedAt: DateTime(2026, 10, 10, 9, 30),
      note: 'Penyesuaian kapasitas komputasi menyambut peluncuran aplikasi mobile cabang.',
      history: const [
        ApprovalHistoryStep(
          role: 'admin',
          status: 'disetujui',
          approverName: 'Ransink (IT Manager)',
        ),
      ],
    ),

    // 6. Pengeluaran Siap Dibayar (Finance)
    ApprovalItemEntity(
      id: 'appr-exp-004',
      documentId: 'exp-004',
      documentType: ApprovalDocumentType.expense,
      title: 'Lisensi software desain Figma',
      applicantName: 'Rina Kusuma',
      applicantDepartment: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      amount: 6200000,
      status: 'siap_dibayar',
      isLargeAmount: true,
      submittedAt: DateTime(2026, 10, 09, 14, 00),
      receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e4c018a482a?w=600',
      note: 'Perpanjangan langganan tahunan Figma Enterprise untuk 3 desainer produk.',
      vendor: 'Figma Inc.',
      history: const [
        ApprovalHistoryStep(
          role: 'admin',
          status: 'disetujui',
          approverName: 'Ransink (IT Manager)',
        ),
        ApprovalHistoryStep(
          role: 'finance',
          status: 'disetujui',
          approverName: 'Mamas (Finance Specialist)',
        ),
      ],
    ),

    // 7. Pengeluaran Siap Dibayar Lainnya
    ApprovalItemEntity(
      id: 'appr-exp-005',
      documentId: 'exp-005',
      documentType: ApprovalDocumentType.expense,
      title: 'Transport survei lokasi cabang Surabaya',
      applicantName: 'Budi Santoso',
      applicantDepartment: 'Departemen Operasional',
      costCenterCode: 'CC-OPS-01',
      amount: 310000,
      status: 'siap_dibayar',
      isLargeAmount: false,
      submittedAt: DateTime(2026, 10, 11, 16, 20),
      receiptUrl: 'https://images.unsplash.com/photo-1554415707-9e4c018a482a?w=600',
      note: 'Penggantian biaya bensin dan tol survei jalur fiber optik cabang Surabaya.',
      vendor: 'Jasa Marga',
      history: const [
        ApprovalHistoryStep(
          role: 'admin',
          status: 'disetujui',
          approverName: 'Admin Ops',
        ),
        ApprovalHistoryStep(
          role: 'finance',
          status: 'disetujui',
          approverName: 'Mamas (Finance Specialist)',
        ),
      ],
    ),
  ];

  @override
  Future<List<ApprovalItemEntity>> getPendingApprovals({
    required String role,
    ApprovalDocumentType? documentType,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final cleanRole = role.toLowerCase();

    final filtered = _items.where((item) {
      if (documentType != null && item.documentType != documentType) {
        return false;
      }

      if (cleanRole == 'admin') {
        // Admin melihat yang menunggu admin
        return item.status == 'menunggu_admin';
      } else if (cleanRole == 'finance') {
        // Finance melihat yang menunggu finance
        return item.status == 'menunggu_finance';
      }
      return false;
    }).toList();

    // Sesuai aturan: Pengeluaran Nominal Besar muncul paling atas di antrean Finance
    if (cleanRole == 'finance') {
      filtered.sort((a, b) {
        if (a.isLargeAmount && !b.isLargeAmount) return -1;
        if (!a.isLargeAmount && b.isLargeAmount) return 1;
        return b.submittedAt.compareTo(a.submittedAt);
      });
    } else {
      filtered.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
    }

    return filtered;
  }

  @override
  Future<ApprovalItemEntity> approveDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final index = _items.indexWhere(
        (it) => it.documentId == documentId && it.documentType == documentType);

    if (index == -1) {
      throw Exception('Dokumen tidak ditemukan');
    }

    final current = _items[index];
    String nextStatus;
    if (documentType == ApprovalDocumentType.expense) {
      if (role.toLowerCase() == 'admin') {
        nextStatus = 'menunggu_finance';
      } else {
        nextStatus = 'siap_dibayar';
      }
    } else if (documentType == ApprovalDocumentType.timesheet) {
      nextStatus = 'disetujui';
    } else {
      nextStatus = role.toLowerCase() == 'admin'
          ? 'menunggu_finance'
          : 'menunggu_super_admin';
    }

    final updatedHistory = List<ApprovalHistoryStep>.from(current.history)
      ..add(ApprovalHistoryStep(
        role: role,
        status: 'disetujui',
        approverName: role.toLowerCase() == 'admin' ? 'Ransink' : 'Mamas',
        actedAt: DateTime.now(),
      ));

    final updated = current.copyWith(
      status: nextStatus,
      history: updatedHistory,
    );

    _items[index] = updated;
    return updated;
  }

  @override
  Future<ApprovalItemEntity> rejectDocument({
    required String documentId,
    required ApprovalDocumentType documentType,
    required String role,
    required String reason,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final index = _items.indexWhere(
        (it) => it.documentId == documentId && it.documentType == documentType);

    if (index == -1) {
      throw Exception('Dokumen tidak ditemukan');
    }

    final current = _items[index];
    final updatedHistory = List<ApprovalHistoryStep>.from(current.history)
      ..add(ApprovalHistoryStep(
        role: role,
        status: 'ditolak',
        approverName: role.toLowerCase() == 'admin' ? 'Ransink' : 'Mamas',
        actedAt: DateTime.now(),
        reason: reason,
      ));

    final updated = current.copyWith(
      status: 'ditolak',
      history: updatedHistory,
    );

    _items[index] = updated;
    return updated;
  }

  @override
  Future<List<ApprovalItemEntity>> getReadyForPaymentExpenses() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _items
        .where((it) =>
            it.documentType == ApprovalDocumentType.expense &&
            it.status == 'siap_dibayar')
        .toList();
  }

  @override
  Future<bool> recordPayment({
    required String expenseId,
    required String method,
    String? referenceNo,
    required DateTime paidAt,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final index = _items.indexWhere((it) =>
        it.documentId == expenseId &&
        it.documentType == ApprovalDocumentType.expense);

    if (index == -1) {
      return false;
    }

    final current = _items[index];
    _items[index] = current.copyWith(status: 'dibayar');
    return true;
  }
}

