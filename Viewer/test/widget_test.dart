import 'package:flutter_test/flutter_test.dart';

import 'package:primoria/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PrimoriaApp());

    // Verify that the app loads with the landing screen
    expect(find.text('Learn by thinking, not just watching'), findsOneWidget);
  });
}
