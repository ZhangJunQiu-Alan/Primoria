import 'package:flutter_test/flutter_test.dart';
import 'package:primoria/components/common/viewer_page_shell.dart';

void main() {
  group('ViewerLayoutMetrics.resolveMaxWidth', () {
    test('uses full width on mobile', () {
      final width = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 390,
        preset: ViewerContentWidthPreset.standard,
      );
      expect(width, 390);
    });

    test('caps tablet width at 920', () {
      final width = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 1000,
        preset: ViewerContentWidthPreset.standard,
      );
      expect(width, 920);
    });

    test('uses desktop preset caps with side gutters', () {
      final standard = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 1280,
        preset: ViewerContentWidthPreset.standard,
      );
      final wide = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 1280,
        preset: ViewerContentWidthPreset.wide,
      );
      expect(standard, 768);
      expect(wide, 768);
    });

    test('uses large desktop gutter and per-page preset cap', () {
      final wide = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 1600,
        preset: ViewerContentWidthPreset.wide,
      );
      final profile = ViewerLayoutMetrics.resolveMaxWidth(
        viewportWidth: 1100,
        preset: ViewerContentWidthPreset.profile,
      );
      expect(wide, 960);
      expect(profile, 660);
    });
  });
}
