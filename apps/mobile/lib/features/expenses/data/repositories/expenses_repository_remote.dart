import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/app_exception.dart';
import '../../domain/entities/expense_entity.dart';
import '../../domain/repositories/expenses_repository.dart';

class ExpensesRepositoryRemote implements ExpensesRepository {
  final Dio _dio;

  ExpensesRepositoryRemote(this._dio);

  @override
  Future<List<ExpenseEntity>> getExpenses({
    String? filter,
    String? search,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (search != null && search.trim().isNotEmpty) {
        queryParams['vendor'] = search.trim();
      }

      final response = await _dio.get(
        ApiEndpoints.expenses,
        queryParameters: queryParams,
      );

      final dynamic raw = response.data;
      final List<dynamic> items;
      if (raw is Map<String, dynamic> && raw.containsKey('data') && raw['data'] is List) {
        items = raw['data'] as List<dynamic>;
      } else if (raw is List) {
        items = raw;
      } else {
        items = [];
      }

      final expenses = items
          .map((item) => ExpenseEntity.fromJson(item as Map<String, dynamic>))
          .toList();

      if (filter != null && filter != 'Semua') {
        return expenses.where((e) => e.matchesFilter(filter)).toList();
      }

      return expenses;
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<ExpenseEntity> getExpenseDetail(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.expenseDetail(id));
      final dynamic raw = response.data;
      final Map<String, dynamic> item =
          (raw is Map<String, dynamic> && raw.containsKey('data'))
              ? raw['data'] as Map<String, dynamic>
              : raw as Map<String, dynamic>;

      return ExpenseEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<ExpenseEntity> createExpense(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiEndpoints.expenses, data: data);
      final dynamic raw = response.data;
      final Map<String, dynamic> item =
          (raw is Map<String, dynamic> && raw.containsKey('data'))
              ? raw['data'] as Map<String, dynamic>
              : raw as Map<String, dynamic>;

      return ExpenseEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<ExpenseEntity> updateExpense(
      String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(ApiEndpoints.expenseDetail(id), data: data);
      final dynamic raw = response.data;
      final Map<String, dynamic> item =
          (raw is Map<String, dynamic> && raw.containsKey('data'))
              ? raw['data'] as Map<String, dynamic>
              : raw as Map<String, dynamic>;

      return ExpenseEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<void> deleteExpense(String id) async {
    try {
      await _dio.delete(ApiEndpoints.expenseDetail(id));
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<ExpenseEntity> submitExpense(String id) async {
    try {
      final response = await _dio.post(ApiEndpoints.submitExpense(id));
      final dynamic raw = response.data;
      final Map<String, dynamic> item =
          (raw is Map<String, dynamic> && raw.containsKey('data'))
              ? raw['data'] as Map<String, dynamic>
              : raw as Map<String, dynamic>;

      return ExpenseEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<Map<String, int>> getExpenseCounts() async {
    try {
      // Ambil daftar pengeluaran untuk menghitung agregat badge
      final all = await getExpenses(limit: 200);
      final counts = <String, int>{
        'Semua': all.length,
        'Draft': 0,
        'Diproses': 0,
        'Siap Dibayar': 0,
        'Dibayar': 0,
        'Ditolak': 0,
      };

      for (final e in all) {
        if (e.matchesFilter('Draft')) counts['Draft'] = (counts['Draft'] ?? 0) + 1;
        if (e.matchesFilter('Diproses')) counts['Diproses'] = (counts['Diproses'] ?? 0) + 1;
        if (e.matchesFilter('Siap Dibayar')) counts['Siap Dibayar'] = (counts['Siap Dibayar'] ?? 0) + 1;
        if (e.matchesFilter('Dibayar')) counts['Dibayar'] = (counts['Dibayar'] ?? 0) + 1;
        if (e.matchesFilter('Ditolak')) counts['Ditolak'] = (counts['Ditolak'] ?? 0) + 1;
      }

      return counts;
    } catch (_) {
      return {
        'Semua': 0,
        'Draft': 0,
        'Diproses': 0,
        'Siap Dibayar': 0,
        'Dibayar': 0,
        'Ditolak': 0,
      };
    }
  }
}

