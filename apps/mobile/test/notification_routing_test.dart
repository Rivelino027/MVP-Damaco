import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/core/router/app_routes.dart';
import 'package:damacoflow/features/notifications/services/notification_navigator.dart';

void main() {
  group('NotificationNavigator.resolveRoute - Pemetaan refType → Rute', () {
    test('Memetakan refType task dengan refId ke detail task', () {
      final route = NotificationNavigator.resolveRoute(
        refType: 'task',
        refId: 'tsk-001',
      );
      expect(route, equals('/tasks/tsk-001'));
      expect(route, equals(AppRoutes.taskDetailPath('tsk-001')));
    });

    test('Memetakan refType task tanpa refId ke daftar task', () {
      final routeWithNull = NotificationNavigator.resolveRoute(
        refType: 'task',
        refId: null,
      );
      expect(routeWithNull, equals(AppRoutes.tasks));

      final routeWithEmpty = NotificationNavigator.resolveRoute(
        refType: 'task',
        refId: '   ',
      );
      expect(routeWithEmpty, equals(AppRoutes.tasks));
    });

    test('Memetakan refType timesheet ke tab timesheet', () {
      final route = NotificationNavigator.resolveRoute(
        refType: 'timesheet',
      );
      expect(route, equals(AppRoutes.timesheet));
    });

    test('Memetakan refType expense dengan refId ke detail pengeluaran', () {
      final route = NotificationNavigator.resolveRoute(
        refType: 'expense',
        refId: 'exp-005',
      );
      expect(route, equals('/expenses/exp-005'));
      expect(route, equals(AppRoutes.expenseDetailPath('exp-005')));
    });

    test('Memetakan refType expense tanpa refId ke daftar pengeluaran', () {
      final routeWithNull = NotificationNavigator.resolveRoute(
        refType: 'expense',
        refId: null,
      );
      expect(routeWithNull, equals(AppRoutes.expenses));

      final routeWithEmpty = NotificationNavigator.resolveRoute(
        refType: 'expense',
        refId: '',
      );
      expect(routeWithEmpty, equals(AppRoutes.expenses));
    });

    test('Memetakan tipe lain atau system ke daftar notifikasi', () {
      expect(
        NotificationNavigator.resolveRoute(refType: 'system'),
        equals(AppRoutes.notifications),
      );
      expect(
        NotificationNavigator.resolveRoute(refType: 'general'),
        equals(AppRoutes.notifications),
      );
      expect(
        NotificationNavigator.resolveRoute(refType: null),
        equals(AppRoutes.notifications),
      );
      expect(
        NotificationNavigator.resolveRoute(refType: ''),
        equals(AppRoutes.notifications),
      );
    });

    test('Menangani huruf besar-kecil (case insensitive)', () {
      expect(
        NotificationNavigator.resolveRoute(refType: 'TASK', refId: 'tsk-999'),
        equals('/tasks/tsk-999'),
      );
      expect(
        NotificationNavigator.resolveRoute(refType: 'Timesheet'),
        equals(AppRoutes.timesheet),
      );
      expect(
        NotificationNavigator.resolveRoute(refType: 'EXPENSE', refId: 'exp-123'),
        equals('/expenses/exp-123'),
      );
    });
  });
}

