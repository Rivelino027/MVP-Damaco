import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../data/repositories/dashboard_repository_mock.dart';
import '../../data/repositories/dashboard_repository_remote.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../../domain/repositories/dashboard_repository.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  if (AppConfig.useMockData) {
    return DashboardRepositoryMock();
  }
  return DashboardRepositoryRemote(ref.watch(dioProvider));
});

class DashboardNotifier extends AutoDisposeAsyncNotifier<DashboardSummaryEntity> {
  @override
  Future<DashboardSummaryEntity> build() async {
    final repo = ref.watch(dashboardRepositoryProvider);
    return repo.getDashboardSummary();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(dashboardRepositoryProvider);
      return repo.getDashboardSummary();
    });
  }
}

final dashboardNotifierProvider =
    AutoDisposeAsyncNotifierProvider<DashboardNotifier, DashboardSummaryEntity>(
  DashboardNotifier.new,
);
