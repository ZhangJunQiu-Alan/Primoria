import 'package:flutter_test/flutter_test.dart';

import 'package:primoria/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PrimoriaApp());

    // Verify that the app loads with the demo screen title
    expect(find.text('调整水温'), findsOneWidget);
  });
}
