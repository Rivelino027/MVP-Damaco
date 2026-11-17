import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/notification_settings_entity.dart';

class NotificationSettingsController
    extends StateNotifier<NotificationSettingsEntity> {
  final SecureStorageService _storage;

  NotificationSettingsController({required SecureStorageService storage})
      : _storage = storage,
        super(const NotificationSettingsEntity()) {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final hasToken = await _storage.hasValidToken();
      if (!hasToken) return;
    } catch (_) {
      // Default fallback
    }
  }

  Future<void> togglePush(bool enabled) async {
    state = state.copyWith(pushEnabled: enabled);
  }

  Future<void> toggleSound(bool enabled) async {
    state = state.copyWith(soundEnabled: enabled);
  }

  Future<void> toggleTaskAssigned(bool enabled) async {
    state = state.copyWith(taskAssigned: enabled);
  }

  Future<void> toggleExpenseUpdates(bool enabled) async {
    state = state.copyWith(expenseUpdates: enabled);
  }

  Future<void> toggleTimesheetReminders(bool enabled) async {
    state = state.copyWith(timesheetReminders: enabled);
  }
}
