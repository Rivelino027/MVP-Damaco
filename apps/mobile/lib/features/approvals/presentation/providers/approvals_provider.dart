import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/repositories/approvals_repository_mock.dart';
import '../../data/repositories/approvals_repository_remote.dart';
import '../../domain/entities/approval_item_entity.dart';
import '../../domain/repositories/approvals_repository.dart';

final approvalsRepositoryProvider = Provider<ApprovalsRepository>((ref) {
  if (AppConfig.useMockData) {
    return ApprovalsRepositoryMock();
  }
  final dioClient = ref.watch(dioClientProvider);
  return ApprovalsRepositoryRemote(dioClient: dioClient);
});

// Filter Dokumen: null = Semua, atau expense, timesheet, budgetRequest
final selectedApprovalFilterProvider =
    StateProvider<ApprovalDocumentType?>((ref) => null);

// State untuk Antrean Persetujuan
enum ApprovalsStatus { initial, loading, loaded, error }

class ApprovalsState {
  final ApprovalsStatus status;
  final List<ApprovalItemEntity> items;
  final String? errorMessage;

  const ApprovalsState({
    this.status = ApprovalsStatus.initial,
    this.items = const [],
    this.errorMessage,
  });

  ApprovalsState copyWith({
    ApprovalsStatus? status,
    List<ApprovalItemEntity>? items,
    String? errorMessage,
  }) {
    return ApprovalsState(
      status: status ?? this.status,
      items: items ?? this.items,
      errorMessage: errorMessage,
    );
  }
}

class ApprovalsNotifier extends StateNotifier<ApprovalsState> {
  final ApprovalsRepository _repository;
  final Ref _ref;

  ApprovalsNotifier({
    required ApprovalsRepository repository,
    required Ref ref,
  })  : _repository = repository,
        _ref = ref,
        super(const ApprovalsState()) {
    loadApprovals();
  }

  Future<void> loadApprovals() async {
    state = state.copyWith(status: ApprovalsStatus.loading, errorMessage: null);

    try {
      final user = _ref.read(currentUserProvider);
      final role = user?.role ?? 'admin';
      final filter = _ref.read(selectedApprovalFilterProvider);

      final items = await _repository.getPendingApprovals(
        role: role,
        documentType: filter,
      );

      state = state.copyWith(
        status: ApprovalsStatus.loaded,
        items: items,
      );
    } catch (e) {
      state = state.copyWith(
        status: ApprovalsStatus.error,
        errorMessage: 'Gagal memuat antrean persetujuan. Periksa koneksi Anda.',
      );
    }
  }

  Future<bool> approveDocument(ApprovalItemEntity item) async {
    try {
      final user = _ref.read(currentUserProvider);
      final role = user?.role ?? 'admin';

      await _repository.approveDocument(
        documentId: item.documentId,
        documentType: item.documentType,
        role: role,
      );

      // Hapus item dari daftar antrean yang sedang aktif
      final updatedList = state.items.where((it) => it.id != item.id).toList();
      state = state.copyWith(items: updatedList);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> rejectDocument(ApprovalItemEntity item, String reason) async {
    try {
      final user = _ref.read(currentUserProvider);
      final role = user?.role ?? 'admin';

      await _repository.rejectDocument(
        documentId: item.documentId,
        documentType: item.documentType,
        role: role,
        reason: reason,
      );

      // Hapus item dari daftar antrean yang sedang aktif
      final updatedList = state.items.where((it) => it.id != item.id).toList();
      state = state.copyWith(items: updatedList);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final approvalsProvider =
    StateNotifierProvider<ApprovalsNotifier, ApprovalsState>((ref) {
  final repository = ref.watch(approvalsRepositoryProvider);
  return ApprovalsNotifier(repository: repository, ref: ref);
});

// ───────────── State & Notifier Pembayaran (Finance) ─────────────

class PaymentsState {
  final ApprovalsStatus status;
  final List<ApprovalItemEntity> items;
  final String? errorMessage;

  const PaymentsState({
    this.status = ApprovalsStatus.initial,
    this.items = const [],
    this.errorMessage,
  });

  PaymentsState copyWith({
    ApprovalsStatus? status,
    List<ApprovalItemEntity>? items,
    String? errorMessage,
  }) {
    return PaymentsState(
      status: status ?? this.status,
      items: items ?? this.items,
      errorMessage: errorMessage,
    );
  }
}

class PaymentsNotifier extends StateNotifier<PaymentsState> {
  final ApprovalsRepository _repository;

  PaymentsNotifier({required ApprovalsRepository repository})
      : _repository = repository,
        super(const PaymentsState()) {
    loadPayments();
  }

  Future<void> loadPayments() async {
    state = state.copyWith(status: ApprovalsStatus.loading, errorMessage: null);

    try {
      final items = await _repository.getReadyForPaymentExpenses();
      state = state.copyWith(
        status: ApprovalsStatus.loaded,
        items: items,
      );
    } catch (e) {
      state = state.copyWith(
        status: ApprovalsStatus.error,
        errorMessage: 'Gagal memuat daftar pembayaran siap proses.',
      );
    }
  }

  Future<bool> recordPayment({
    required String expenseId,
    required String method,
    String? referenceNo,
    required DateTime paidAt,
  }) async {
    try {
      final success = await _repository.recordPayment(
        expenseId: expenseId,
        method: method,
        referenceNo: referenceNo,
        paidAt: paidAt,
      );

      if (success) {
        final updatedList =
            state.items.where((it) => it.documentId != expenseId).toList();
        state = state.copyWith(items: updatedList);
      }
      return success;
    } catch (_) {
      return false;
    }
  }
}

final paymentsProvider =
    StateNotifierProvider<PaymentsNotifier, PaymentsState>((ref) {
  final repository = ref.watch(approvalsRepositoryProvider);
  return PaymentsNotifier(repository: repository);
});

