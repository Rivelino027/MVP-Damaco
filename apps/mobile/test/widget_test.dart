import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/main.dart';

void main() {
  testWidgets('DamacoFlowApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: DamacoFlowApp(),
      ),
    );

    // Initial frame pump
    await tester.pump();
    expect(find.byType(DamacoFlowApp), findsOneWidget);

    // Advance timers so splash delayed transition finishes
    await tester.pumpAndSettle(const Duration(seconds: 2));
  });
}
