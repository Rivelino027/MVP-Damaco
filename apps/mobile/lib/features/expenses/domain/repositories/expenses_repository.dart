import '../entities/expense_entity.dart';

abstract class ExpensesRepository {
  /// Mengambil daftar pengeluaran dengan filter status & pencarian
  Future<List<ExpenseEntity>> getExpenses({
    String? filter,
    String? search,
    int page = 1,
    int limit = 20,
  });

  /// Mengambil detail satu pengeluaran beserta riwayat persetujuan, lampiran, dan pembayaran
  Future<ExpenseEntity> getExpenseDetail(String id);

  /// Membuat pengeluaran baru (draft atau ajukan langsung)
  Future<ExpenseEntity> createExpense(Map<String, dynamic> data);

  /// Mengubah pengeluaran (hanya draft atau ditolak)
  Future<ExpenseEntity> updateExpense(String id, Map<String, dynamic> data);

  /// Menghapus pengeluaran (hanya draft atau ditolak)
  Future<void> deleteExpense(String id);

  /// Mengajukan pengeluaran draft / ditolak ke Admin
  Future<ExpenseEntity> submitExpense(String id);

  /// Mengambil jumlah item per kategori filter (Semua, Draft, Diproses, Siap Dibayar, Dibayar, Ditolak)
  Future<Map<String, int>> getExpenseCounts();
}

