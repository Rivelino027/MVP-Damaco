import '../../domain/entities/expense_approval_entity.dart';
import '../../domain/entities/expense_attachment_entity.dart';
import '../../domain/entities/expense_category_entity.dart';
import '../../domain/entities/expense_entity.dart';
import '../../domain/entities/expense_payment_entity.dart';
import '../../domain/repositories/expenses_repository.dart';

class ExpensesRepositoryMock implements ExpensesRepository {
  final List<ExpenseEntity> _mockExpenses = [];

  ExpensesRepositoryMock() {
    _initMockData();
  }

  void _initMockData() {
    final catMaterial = ExpenseCategoryEntity(
      id: 'cat-mat',
      name: 'Material & Perangkat',
      code: 'material',
      color: ExpenseCategoryEntity.fallbackColorFor('Material & Perangkat'),
    );

    final catVendor = ExpenseCategoryEntity(
      id: 'cat-ven',
      name: 'Vendor/Jasa',
      code: 'vendor',
      color: ExpenseCategoryEntity.fallbackColorFor('Vendor/Jasa'),
    );

    final catLain = ExpenseCategoryEntity(
      id: 'cat-oth',
      name: 'Lain-lain',
      code: 'lain_lain',
      color: ExpenseCategoryEntity.fallbackColorFor('Lain-lain'),
    );

    _mockExpenses.addAll([
      // 1. Kabel LAN & konektor (Menunggu Admin, Rp850.000)
      ExpenseEntity(
        id: 'exp-001',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-001',
        projectName: 'Renovasi Lab Jaringan',
        costCenterId: 'cc-001',
        costCenterCode: 'CC-IT-OPS',
        costCenterName: 'IT Operations',
        categoryId: catMaterial.id,
        category: catMaterial,
        amount: 850000.0,
        expenseDate: DateTime.utc(2026, 10, 8),
        vendor: 'Kabel LAN & konektor',
        title: 'Kabel LAN & konektor',
        note: 'Pembelian patch cord Cat6 50 meter dan konektor RJ45 AMP untuk patch panel.',
        status: 'menunggu_admin',
        isLargeAmount: false,
        submittedAt: DateTime.utc(2026, 10, 8, 14, 30),
        createdAt: DateTime.utc(2026, 10, 8, 14, 0),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-001',
            documentType: 'expense',
            documentId: 'exp-001',
            stepOrder: 1,
            role: 'admin',
            status: 'menunggu',
            approverName: 'Ransin',
            createdAt: DateTime.utc(2026, 10, 8, 14, 30),
          ),
          ExpenseApprovalEntity(
            id: 'app-002',
            documentType: 'expense',
            documentId: 'exp-001',
            stepOrder: 2,
            role: 'finance',
            status: 'menunggu',
            approverName: 'Mamas',
            createdAt: DateTime.utc(2026, 10, 8, 14, 30),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-001',
            fileName: 'nota_kabel_lan.jpg',
            fileSize: 245000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 8, 14, 25),
          ),
        ],
      ),

      // 2. Server rack & UPS (Menunggu Admin, Rp9.800.000, Nominal Besar)
      ExpenseEntity(
        id: 'exp-002',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-001',
        projectName: 'Renovasi Lab Jaringan',
        costCenterId: 'cc-001',
        costCenterCode: 'CC-IT-OPS',
        costCenterName: 'IT Operations',
        categoryId: catMaterial.id,
        category: catMaterial,
        amount: 9800000.0,
        expenseDate: DateTime.utc(2026, 10, 7),
        vendor: 'Server rack & UPS',
        title: 'Server rack & UPS',
        note: 'Rackmount server 42U dan APC Smart-UPS 3000VA untuk ruang server lab.',
        status: 'menunggu_admin',
        isLargeAmount: true,
        limitAtSubmission: 5000000.0,
        submittedAt: DateTime.utc(2026, 10, 7, 10, 15),
        createdAt: DateTime.utc(2026, 10, 7, 9, 30),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-003',
            documentType: 'expense',
            documentId: 'exp-002',
            stepOrder: 1,
            role: 'admin',
            status: 'menunggu',
            approverName: 'Ransin',
            createdAt: DateTime.utc(2026, 10, 7, 10, 15),
          ),
          ExpenseApprovalEntity(
            id: 'app-004',
            documentType: 'expense',
            documentId: 'exp-002',
            stepOrder: 2,
            role: 'finance',
            status: 'menunggu',
            approverName: 'Mamas',
            createdAt: DateTime.utc(2026, 10, 7, 10, 15),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-002',
            fileName: 'invoice_rack_ups.jpg',
            fileSize: 450000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 7, 10, 10),
          ),
        ],
      ),

      // 3. Sewa server cloud Q4 (Menunggu Finance, Rp7.500.000, Nominal Besar)
      ExpenseEntity(
        id: 'exp-003',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-002',
        projectName: 'Migrasi Server',
        costCenterId: 'cc-002',
        costCenterCode: 'CC-CLOUD',
        costCenterName: 'Cloud Infrastructure',
        categoryId: catVendor.id,
        category: catVendor,
        amount: 7500000.0,
        expenseDate: DateTime.utc(2026, 10, 6),
        vendor: 'Sewa server cloud Q4',
        title: 'Sewa server cloud Q4',
        note: 'Langganan instance compute engine dan storage AWS/GCP periode Q4.',
        status: 'menunggu_finance',
        isLargeAmount: true,
        limitAtSubmission: 5000000.0,
        submittedAt: DateTime.utc(2026, 10, 6, 11, 0),
        createdAt: DateTime.utc(2026, 10, 6, 10, 0),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-005',
            documentType: 'expense',
            documentId: 'exp-003',
            stepOrder: 1,
            role: 'admin',
            status: 'disetujui',
            approverName: 'Ransin',
            actedAt: DateTime.utc(2026, 10, 6, 15, 20),
            createdAt: DateTime.utc(2026, 10, 6, 11, 0),
          ),
          ExpenseApprovalEntity(
            id: 'app-006',
            documentType: 'expense',
            documentId: 'exp-003',
            stepOrder: 2,
            role: 'finance',
            status: 'menunggu',
            approverName: 'Mamas',
            createdAt: DateTime.utc(2026, 10, 6, 11, 0),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-003',
            fileName: 'invoice_cloud_q4.jpg',
            fileSize: 310000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 6, 10, 55),
          ),
        ],
      ),

      // 4. Konsumsi rapat vendor (Ditolak, Rp420.000)
      ExpenseEntity(
        id: 'exp-004',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-001',
        projectName: 'Renovasi Lab Jaringan',
        costCenterId: 'cc-001',
        costCenterCode: 'CC-IT-OPS',
        costCenterName: 'IT Operations',
        categoryId: catLain.id,
        category: catLain,
        amount: 420000.0,
        expenseDate: DateTime.utc(2026, 10, 5),
        vendor: 'Konsumsi rapat vendor',
        title: 'Konsumsi rapat vendor',
        note: 'Konsumsi snack dan makan siang koordinasi vendor instalasi kabel lab.',
        status: 'ditolak',
        isLargeAmount: false,
        submittedAt: DateTime.utc(2026, 10, 5, 13, 0),
        createdAt: DateTime.utc(2026, 10, 5, 12, 0),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-007',
            documentType: 'expense',
            documentId: 'exp-004',
            stepOrder: 1,
            role: 'admin',
            status: 'ditolak',
            approverName: 'Ransin',
            actedAt: DateTime.utc(2026, 10, 5, 16, 45),
            reason: 'Nota konsumsi tidak mencantumkan stempel basah toko dan belum ada daftar absensi rapat.',
            createdAt: DateTime.utc(2026, 10, 5, 13, 0),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-004',
            fileName: 'struk_konsumsi.jpg',
            fileSize: 180000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 5, 12, 50),
          ),
        ],
      ),

      // 5. Lisensi software desain (Siap Dibayar, Rp6.200.000, Nominal Besar)
      ExpenseEntity(
        id: 'exp-005',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-003',
        projectName: 'Aplikasi Mobile Cabang',
        costCenterId: 'cc-003',
        costCenterCode: 'CC-DEV',
        costCenterName: 'Product Development',
        categoryId: catMaterial.id,
        category: catMaterial,
        amount: 6200000.0,
        expenseDate: DateTime.utc(2026, 10, 4),
        vendor: 'Lisensi software desain',
        title: 'Lisensi software desain',
        note: 'Perpanjangan 4 kursi Figma Organization tahunan untuk tim UI/UX mobile.',
        status: 'siap_dibayar',
        isLargeAmount: true,
        limitAtSubmission: 5000000.0,
        submittedAt: DateTime.utc(2026, 10, 4, 9, 30),
        createdAt: DateTime.utc(2026, 10, 4, 8, 0),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-008',
            documentType: 'expense',
            documentId: 'exp-005',
            stepOrder: 1,
            role: 'admin',
            status: 'disetujui',
            approverName: 'Ransin',
            actedAt: DateTime.utc(2026, 10, 4, 11, 0),
            createdAt: DateTime.utc(2026, 10, 4, 9, 30),
          ),
          ExpenseApprovalEntity(
            id: 'app-009',
            documentType: 'expense',
            documentId: 'exp-005',
            stepOrder: 2,
            role: 'finance',
            status: 'disetujui',
            approverName: 'Mamas',
            actedAt: DateTime.utc(2026, 10, 4, 14, 0),
            createdAt: DateTime.utc(2026, 10, 4, 9, 30),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-005',
            fileName: 'invoice_figma.jpg',
            fileSize: 390000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 4, 9, 25),
          ),
        ],
      ),

      // 6. Transport survei lokasi (Dibayar, Rp310.000)
      ExpenseEntity(
        id: 'exp-006',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-003',
        projectName: 'Aplikasi Mobile Cabang',
        costCenterId: 'cc-003',
        costCenterCode: 'CC-DEV',
        costCenterName: 'Product Development',
        categoryId: catLain.id,
        category: catLain,
        amount: 310000.0,
        expenseDate: DateTime.utc(2026, 10, 3),
        vendor: 'Transport survei lokasi',
        title: 'Transport survei lokasi',
        note: 'Biaya BBM tol dan parkir kunjungan survei koneksi unit cabang.',
        status: 'dibayar',
        isLargeAmount: false,
        submittedAt: DateTime.utc(2026, 10, 3, 16, 0),
        createdAt: DateTime.utc(2026, 10, 3, 15, 0),
        payment: ExpensePaymentEntity(
          id: 'pay-001',
          expenseId: 'exp-006',
          paidBy: 'usr-fin-001',
          paidByName: 'Mamas (Finance)',
          paidAt: DateTime.utc(2026, 10, 4, 16, 30),
          method: 'transfer',
          referenceNo: 'TRX-BCA-88912304',
          amount: 310000.0,
        ),
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-010',
            documentType: 'expense',
            documentId: 'exp-006',
            stepOrder: 1,
            role: 'admin',
            status: 'disetujui',
            approverName: 'Ransin',
            actedAt: DateTime.utc(2026, 10, 4, 9, 0),
            createdAt: DateTime.utc(2026, 10, 3, 16, 0),
          ),
          ExpenseApprovalEntity(
            id: 'app-011',
            documentType: 'expense',
            documentId: 'exp-006',
            stepOrder: 2,
            role: 'finance',
            status: 'disetujui',
            approverName: 'Mamas',
            actedAt: DateTime.utc(2026, 10, 4, 14, 0),
            createdAt: DateTime.utc(2026, 10, 3, 16, 0),
          ),
        ],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-006',
            fileName: 'struk_bbm_tol.jpg',
            fileSize: 210000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 3, 15, 50),
          ),
        ],
      ),

      // 7. Cetak laporan proyek (Draft, Rp420.000)
      ExpenseEntity(
        id: 'exp-007',
        requesterId: 'usr-001',
        requesterName: 'Lilit',
        projectId: 'prj-001',
        projectName: 'Renovasi Lab Jaringan',
        costCenterId: 'cc-001',
        costCenterCode: 'CC-IT-OPS',
        costCenterName: 'IT Operations',
        categoryId: catLain.id,
        category: catLain,
        amount: 420000.0,
        expenseDate: DateTime.utc(2026, 10, 9),
        vendor: 'Cetak laporan proyek',
        title: 'Cetak laporan proyek',
        note: 'Jilid hardcover 3 rangkap dokumen topologi dan spesifikasi perangkat lab.',
        status: 'draft',
        isLargeAmount: false,
        createdAt: DateTime.utc(2026, 10, 9, 8, 30),
        approvals: [],
        attachments: [
          ExpenseAttachmentEntity(
            id: 'att-007',
            fileName: 'nota_fotokopi.jpg',
            fileSize: 195000,
            mimeType: 'image/jpeg',
            url: 'https://images.unsplash.com/photo-1554415707-9e4466bfe03b?w=800',
            createdAt: DateTime.utc(2026, 10, 9, 8, 35),
          ),
        ],
      ),
    ]);
  }

  @override
  Future<List<ExpenseEntity>> getExpenses({
    String? filter,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    await Future.delayed(const Duration(milliseconds: 200));

    var list = List<ExpenseEntity>.from(_mockExpenses);

    if (filter != null && filter != 'Semua') {
      list = list.where((e) => e.matchesFilter(filter)).toList();
    }

    if (search != null && search.trim().isNotEmpty) {
      final q = search.trim().toLowerCase();
      list = list.where((e) {
        final title = e.displayTitle.toLowerCase();
        final project = (e.projectName ?? '').toLowerCase();
        final vendor = (e.vendor ?? '').toLowerCase();
        return title.contains(q) || project.contains(q) || vendor.contains(q);
      }).toList();
    }

    return list;
  }

  @override
  Future<ExpenseEntity> getExpenseDetail(String id) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final index = _mockExpenses.indexWhere((e) => e.id == id);
    if (index != -1) {
      return _mockExpenses[index];
    }
    throw Exception('Pengeluaran tidak ditemukan');
  }

  @override
  Future<ExpenseEntity> createExpense(Map<String, dynamic> data) async {
    await Future.delayed(const Duration(milliseconds: 250));
    final newId = 'exp-${DateTime.now().millisecondsSinceEpoch}';
    final parsed = ExpenseEntity.fromJson({
      'id': newId,
      ...data,
      'status': data['submitNow'] == true ? 'menunggu_admin' : 'draft',
      'createdAt': DateTime.now().toIso8601String(),
    });
    _mockExpenses.insert(0, parsed);
    return parsed;
  }

  @override
  Future<ExpenseEntity> updateExpense(
      String id, Map<String, dynamic> data) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final index = _mockExpenses.indexWhere((e) => e.id == id);
    if (index == -1) throw Exception('Pengeluaran tidak ditemukan');

    final existing = _mockExpenses[index];
    final updated = existing.copyWith(
      amount: data['amount'] != null ? (data['amount'] as num).toDouble() : existing.amount,
      vendor: data['vendor']?.toString() ?? existing.vendor,
      title: data['title']?.toString() ?? existing.title,
      note: data['note']?.toString() ?? existing.note,
    );
    _mockExpenses[index] = updated;
    return updated;
  }

  @override
  Future<void> deleteExpense(String id) async {
    await Future.delayed(const Duration(milliseconds: 150));
    _mockExpenses.removeWhere((e) => e.id == id);
  }

  @override
  Future<ExpenseEntity> submitExpense(String id) async {
    await Future.delayed(const Duration(milliseconds: 250));
    final index = _mockExpenses.indexWhere((e) => e.id == id);
    if (index == -1) throw Exception('Pengeluaran tidak ditemukan');

    final existing = _mockExpenses[index];
    final submitted = existing.copyWith(
      status: 'menunggu_admin',
      submittedAt: DateTime.now(),
      approvals: [
        ExpenseApprovalEntity(
          id: 'app-sub-1',
          documentType: 'expense',
          documentId: existing.id,
          stepOrder: 1,
          role: 'admin',
          status: 'menunggu',
          approverName: 'Admin',
          createdAt: DateTime.now(),
        ),
        ExpenseApprovalEntity(
          id: 'app-sub-2',
          documentType: 'expense',
          documentId: existing.id,
          stepOrder: 2,
          role: 'finance',
          status: 'menunggu',
          approverName: 'Finance',
          createdAt: DateTime.now(),
        ),
      ],
    );
    _mockExpenses[index] = submitted;
    return submitted;
  }

  @override
  Future<Map<String, int>> getExpenseCounts() async {
    await Future.delayed(const Duration(milliseconds: 100));
    final counts = <String, int>{
      'Semua': _mockExpenses.length,
      'Draft': 0,
      'Diproses': 0,
      'Siap Dibayar': 0,
      'Dibayar': 0,
      'Ditolak': 0,
    };

    for (final e in _mockExpenses) {
      if (e.matchesFilter('Draft')) counts['Draft'] = (counts['Draft'] ?? 0) + 1;
      if (e.matchesFilter('Diproses')) counts['Diproses'] = (counts['Diproses'] ?? 0) + 1;
      if (e.matchesFilter('Siap Dibayar')) counts['Siap Dibayar'] = (counts['Siap Dibayar'] ?? 0) + 1;
      if (e.matchesFilter('Dibayar')) counts['Dibayar'] = (counts['Dibayar'] ?? 0) + 1;
      if (e.matchesFilter('Ditolak')) counts['Ditolak'] = (counts['Ditolak'] ?? 0) + 1;
    }

    return counts;
  }
}

