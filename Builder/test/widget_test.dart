import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:builder/main.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();

    // Mock SharedPreferences so Supabase.initialize can read its local storage
    // without hitting a real platform channel.
    SharedPreferences.setMockInitialValues({});

    // Suppress MissingPluginException for other platform channels used during
    // widget build (e.g. path_provider) by setting a no-op handler.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (call) async => null,
    );

    await Supabase.initialize(
      url: 'https://stub.supabase.co',
      anonKey:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
          '.eyJpc3MiOiJzdWIiLCJyb2xlIjoiYW5vbiJ9'
          '.stub',
    );
  });

  testWidgets('Builder app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: BuilderApp(),
      ),
    );
    await tester.pump();
    // Verify the app builds without fatal exceptions.
    expect(tester.takeException(), isNull);
  });
}
