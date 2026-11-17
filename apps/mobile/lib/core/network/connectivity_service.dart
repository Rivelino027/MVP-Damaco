import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

final isConnectedProvider = StreamProvider<bool>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.connectionStream;
});

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final _controller = StreamController<bool>.broadcast();

  Stream<bool> get connectionStream => _controller.stream;
  StreamSubscription? _subscription;
  bool _lastStatus = true;

  ConnectivityService() {
    _init();
  }

  void _init() {
    _subscription = _connectivity.onConnectivityChanged.listen(_handleResults);
    checkConnection();
  }

  void _handleResults(List<ConnectivityResult> results) {
    final connected = results.any((r) => r != ConnectivityResult.none);
    _lastStatus = connected;
    _controller.add(connected);
  }

  Future<bool> checkConnection() async {
    try {
      final results = await _connectivity.checkConnectivity();
      final connected = results.any((r) => r != ConnectivityResult.none);
      _lastStatus = connected;
      _controller.add(connected);
      return connected;
    } catch (_) {
      _lastStatus = false;
      _controller.add(false);
      return false;
    }
  }

  bool get isConnected => _lastStatus;

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}

