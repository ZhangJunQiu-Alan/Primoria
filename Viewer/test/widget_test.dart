import 'package:flutter_test/flutter_test.dart';

import 'package:primoria/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PrimoriaApp());

    // Verify that the app loads with the landing screen branding
    expect(find.text('PRIMORIA'), findsAtLeastNWidgets(1));
  });
}
