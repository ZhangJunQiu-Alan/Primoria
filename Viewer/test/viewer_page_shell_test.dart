import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:primoria/components/common/viewer_page_shell.dart';

void main() {
  testWidgets('constrains content to desktop max width', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1400, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ViewerPageShell(
            preset: ViewerContentWidthPreset.standard,
            child: SizedBox(key: ValueKey('content')),
          ),
        ),
      ),
    );

    final contentSize = tester.getSize(find.byKey(const ValueKey('content')));
    expect(contentSize.width, 840);
  });

  testWidgets('uses full width on mobile viewports', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ViewerPageShell(
            preset: ViewerContentWidthPreset.standard,
            child: SizedBox(key: ValueKey('mobile-content')),
          ),
        ),
      ),
    );

    final contentSize = tester.getSize(
      find.byKey(const ValueKey('mobile-content')),
    );
    expect(contentSize.width, 390);
  });

  testWidgets('can opt into full-width desktop layouts', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1400, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ViewerPageShell(
            preset: ViewerContentWidthPreset.fullWidth,
            child: SizedBox(key: ValueKey('full-width-content')),
          ),
        ),
      ),
    );

    final contentSize = tester.getSize(
      find.byKey(const ValueKey('full-width-content')),
    );
    expect(contentSize.width, 1400);
  });
}
