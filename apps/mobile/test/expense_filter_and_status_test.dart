import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/core/utils/rupiah_input_formatter.dart';
import 'package:damacoflow/features/expenses/data/repositories/expenses_repository_mock.dart';
import 'package:damacoflow/features/expenses/domain/entities/expense_approval_entity.dart';
import 'package:damacoflow/features/expenses/domain/entities/expense_entity.dart';

void main() {
  group('RupiahInputFormatter Tests', () {
    test('Memformat angka menjadi string ribuan Indonesia dengan benar', () {
      expect(RupiahInputFormatter.format(0), equals('0'));
      expect(RupiahInputFormatter.format(850000), equals('850.000'));
      expect(RupiahInputFormatter.format(6200000), equals('6.200.000'));
      expect(RupiahInputFormatter.format(9800000), equals('9.800.000'));
    });

    test('Mem-parsing string format Rupiah kembali menjadi double murni', () {
      expect(RupiahInputFormatter.parse(''), equals(0.0));
      expect(RupiahInputFormatter.parse('0'), equals(0.0));
      expect(RupiahInputFormatter.parse('850.000'), equals(850000.0));
      expect(RupiahInputFormatter.parse('Rp 6.200.000'), equals(6200000.0));
      expect(RupiahInputFormatter.parse('Rp9.800.000'), equals(9800000.0));
    });
  });

  group('ExpenseEntity - Pemetaan Status & Filter', () {
    ExpenseEntity createSample(String status, {double amount = 500000}) {
      return ExpenseEntity(
        id: 'exp-test-01',
        requesterId: 'usr-1',
        projectId: 'prj-1',
        costCenterId: 'cc-1',
        categoryId: 'cat-1',
        amount: amount,
        expenseDate: DateTime.utc(2026, 10, 8),
        vendor: 'Toko Elektronik Maju',
        title: 'Kabel LAN Cat6',
        status: status,
      );
    }

    test('Pemetaan status ke kategori filter', () {
      final draft = createSample('draft');
      final mAdmin = createSample('menunggu_admin');
      final mFinance = createSample('menunggu_finance');
      final siapBayar = createSample('siap_dibayar');
      final disetujui = createSample('disetujui');
      final dibayar = createSample('dibayar');
      final ditolak = createSample('ditolak');

      // Filter: Semua
      expect(draft.matchesFilter('Semua'), isTrue);
      expect(mAdmin.matchesFilter('Semua'), isTrue);
      expect(dibayar.matchesFilter('Semua'), isTrue);

      // Filter: Draft
      expect(draft.matchesFilter('Draft'), isTrue);
      expect(mAdmin.matchesFilter('Draft'), isFalse);

      // Filter: Diproses = menunggu_admin + menunggu_finance
      expect(mAdmin.matchesFilter('Diproses'), isTrue);
      expect(mFinance.matchesFilter('Diproses'), isTrue);
      expect(draft.matchesFilter('Diproses'), isFalse);
      expect(siapBayar.matchesFilter('Diproses'), isFalse);

      // Filter: Siap Dibayar = siap_dibayar (+ disetujui)
      expect(siapBayar.matchesFilter('Siap Dibayar'), isTrue);
      expect(disetujui.matchesFilter('Siap Dibayar'), isTrue);
      expect(mFinance.matchesFilter('Siap Dibayar'), isFalse);

      // Filter: Dibayar
      expect(dibayar.matchesFilter('Dibayar'), isTrue);
      expect(siapBayar.matchesFilter('Dibayar'), isFalse);

      // Filter: Ditolak
      expect(ditolak.matchesFilter('Ditolak'), isTrue);
      expect(draft.matchesFilter('Ditolak'), isFalse);
    });

    test('Label status dalam Bahasa Indonesia', () {
      expect(createSample('draft').displayStatusLabel, equals('Draft'));
      expect(createSample('menunggu_admin').displayStatusLabel, equals('Menunggu Admin'));
      expect(createSample('menunggu_finance').displayStatusLabel, equals('Menunggu Finance'));
      expect(createSample('siap_dibayar').displayStatusLabel, equals('Siap Dibayar'));
      expect(createSample('dibayar').displayStatusLabel, equals('Dibayar'));
      expect(createSample('ditolak').displayStatusLabel, equals('Ditolak'));
    });

    test('Diskrepansi #1: Fallback displayTitle (title -> vendor -> note)', () {
      final withTitle = ExpenseEntity(
        id: '1',
        requesterId: 'u',
        projectId: 'p',
        costCenterId: 'c',
        categoryId: 'cat',
        amount: 100,
        expenseDate: DateTime.now(),
        title: 'Lisensi Desain',
        vendor: 'Adobe',
        status: 'draft',
      );
      expect(withTitle.displayTitle, equals('Lisensi Desain'));

      final withVendorOnly = ExpenseEntity(
        id: '2',
        requesterId: 'u',
        projectId: 'p',
        costCenterId: 'c',
        categoryId: 'cat',
        amount: 100,
        expenseDate: DateTime.now(),
        vendor: 'PT Toko Kabel',
        status: 'draft',
      );
      expect(withVendorOnly.displayTitle, equals('PT Toko Kabel'));
    });

    test('Diskrepansi #4: Kode dokumen resmi berformat EXP-XXXXXX', () {
      final exp = ExpenseEntity(
        id: 'a1b2c3d4-e5f6-7890',
        requesterId: 'u',
        projectId: 'p',
        costCenterId: 'c',
        categoryId: 'cat',
        amount: 100,
        expenseDate: DateTime.now(),
        status: 'draft',
      );
      expect(exp.displayCode, equals('EXP-A1B2C3'));
    });

    test('Diskrepansi #6: Alasan penolakan diambil dari riwayat approvals', () {
      final exp = ExpenseEntity(
        id: 'exp-rejected',
        requesterId: 'u',
        projectId: 'p',
        costCenterId: 'c',
        categoryId: 'cat',
        amount: 100,
        expenseDate: DateTime.now(),
        status: 'ditolak',
        approvals: [
          ExpenseApprovalEntity(
            id: 'app-1',
            documentType: 'expense',
            documentId: 'exp-rejected',
            stepOrder: 1,
            role: 'admin',
            status: 'ditolak',
            reason: 'Stempel toko tidak ada',
            createdAt: DateTime.now(),
          ),
        ],
      );
      expect(exp.rejectReason, equals('Stempel toko tidak ada'));
    });
  });

  group('ExpensesRepositoryMock Tests', () {
    test('Mengambil 7 data awal mock dan menghitung counts persis sesuai screenshot', () async {
      final repo = ExpensesRepositoryMock();
      final all = await repo.getExpenses(filter: 'Semua');
      expect(all.length, equals(7));

      final counts = await repo.getExpenseCounts();
      expect(counts['Semua'], equals(7));
      expect(counts['Draft'], equals(1));
      expect(counts['Diproses'], equals(3));
      expect(counts['Siap Dibayar'], equals(1));
      expect(counts['Dibayar'], equals(1));
      expect(counts['Ditolak'], equals(1));
    });

    test('Menyimpan draft baru dan mengajukan pengeluaran', () async {
      final repo = ExpensesRepositoryMock();
      final draft = await repo.createExpense({
        'title': 'Kabel HDMI 4K',
        'amount': 250000.0,
        'categoryId': 'cat-mat',
        'projectId': 'prj-001',
        'costCenterId': 'cc-001',
        'submitNow': false,
        'expenseDate': DateTime.now().toIso8601String(),
      });

      expect(draft.status, equals('draft'));
      expect(draft.displayTitle, equals('Kabel HDMI 4K'));

      final submitted = await repo.submitExpense(draft.id);
      expect(submitted.status, equals('menunggu_admin'));
    });
  });
}

