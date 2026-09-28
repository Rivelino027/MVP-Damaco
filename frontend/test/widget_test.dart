import 'package:flutter_test/flutter_test.dart';
import 'package:mp_app/main.dart';

void main() {
  testWidgets('App initialization test', (WidgetTester tester) async {
    await tester.pumpWidget(const AgileCostApp());
    expect(find.byType(AgileCostApp), findsOneWidget);
  });
}
