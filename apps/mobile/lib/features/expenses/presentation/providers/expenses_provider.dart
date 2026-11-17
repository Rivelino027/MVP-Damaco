import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/repositories/expenses_repository_mock.dart';
import '../../data/repositories/expenses_repository_remote.dart';
import '../../domain/entities/expense_entity.dart';
import '../../domain/repositories/expenses_repository.dart';

final expensesRepositoryProvider = Provider<ExpensesRepository>((ref) {
  if (AppConfig.useMockData) {
    return ExpensesRepositoryMock();
  }
  return ExpensesRepositoryRemote(ref.watch(dioProvider));
});

/// Filter aktif: 'Semua', 'Draft', 'Diproses', 'Siap Dibayar', 'Dibayar', 'Ditolak'
final expenseFilterProvider = StateProvider<String>((ref) => 'Semua');

/// Search query untuk pencarian judul/vendor pengeluaran
final expenseSearchQueryProvider = StateProvider<String>((ref) => '');

/// Agregat jumlah per filter untuk badge di chip
final expenseCountsProvider =
    FutureProvider.autoDispose<Map<String, int>>((ref) async {
  final repo = ref.watch(expensesRepositoryProvider);
  return repo.getExpenseCounts();
});

class ExpenseListNotifier
    extends AutoDisposeAsyncNotifier<List<ExpenseEntity>> {
  @override
  Future<List<ExpenseEntity>> build() async {
    final repo = ref.watch(expensesRepositoryProvider);
    final filter = ref.watch(expenseFilterProvider);
    final search = ref.watch(expenseSearchQueryProvider);

    return repo.getExpenses(
      filter: filter,
      search: search.isEmpty ? null : search,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(expensesRepositoryProvider);
      final filter = ref.read(expenseFilterProvider);
      final search = ref.read(expenseSearchQueryProvider);
      ref.invalidate(expenseCountsProvider);
      return repo.getExpenses(
        filter: filter,
        search: search.isEmpty ? null : search,
      );
    });
  }

  Future<void> deleteExpense(String id) async {
    final repo = ref.read(expensesRepositoryProvider);
    await repo.deleteExpense(id);
    ref.invalidate(expenseCountsProvider);
    state = state.whenData((list) => list.where((e) => e.id != id).toList());
  }

  Future<void> submitExpense(String id) async {
    final repo = ref.read(expensesRepositoryProvider);
    final updated = await repo.submitExpense(id);
    ref.invalidate(expenseCountsProvider);
    state = state.whenData((list) => list.map((e) => e.id == id ? updated : e).toList());
  }
}

final expenseListProvider =
    AutoDisposeAsyncNotifierProvider<ExpenseListNotifier, List<ExpenseEntity>>(
  ExpenseListNotifier.new,
);

class ExpenseDetailNotifier
    extends AutoDisposeFamilyAsyncNotifier<ExpenseEntity, String> {
  @override
  Future<ExpenseEntity> build(String arg) async {
    final repo = ref.watch(expensesRepositoryProvider);
    return repo.getExpenseDetail(arg);
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(expensesRepositoryProvider);
      return repo.getExpenseDetail(arg);
    });
  }

  Future<void> submit() async {
    final repo = ref.read(expensesRepositoryProvider);
    final updated = await repo.submitExpense(arg);
    state = AsyncValue.data(updated);
    ref.invalidate(expenseListProvider);
    ref.invalidate(expenseCountsProvider);
  }

  Future<void> delete() async {
    final repo = ref.read(expensesRepositoryProvider);
    await repo.deleteExpense(arg);
    ref.invalidate(expenseListProvider);
    ref.invalidate(expenseCountsProvider);
  }
}

final expenseDetailProvider =
    AsyncNotifierProvider.autoDispose.family<ExpenseDetailNotifier, ExpenseEntity, String>(
  ExpenseDetailNotifier.new,
);

