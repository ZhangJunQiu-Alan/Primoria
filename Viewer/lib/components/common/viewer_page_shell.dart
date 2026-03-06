import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// Width presets for top-level Viewer pages.
enum ViewerContentWidthPreset { standard, wide, feed, profile, readable }

class ViewerLayoutBreakpoints {
  ViewerLayoutBreakpoints._();

  static const double mobile = 768;
  static const double desktop = 1024;
  static const double largeDesktop = 1440;
}

class ViewerLayoutMetrics {
  ViewerLayoutMetrics._();

  static double resolveMaxWidth({
    required double viewportWidth,
    required ViewerContentWidthPreset preset,
  }) {
    if (viewportWidth < ViewerLayoutBreakpoints.mobile) {
      return viewportWidth;
    }

    if (viewportWidth < ViewerLayoutBreakpoints.desktop) {
      return math.min(viewportWidth, 920);
    }

    final sideGutter = viewportWidth >= ViewerLayoutBreakpoints.largeDesktop
        ? 96.0
        : 48.0;

    final desktopPresetWidth = switch (preset) {
      ViewerContentWidthPreset.standard => 1200.0,
      ViewerContentWidthPreset.wide => 1320.0,
      ViewerContentWidthPreset.feed => 1280.0,
      ViewerContentWidthPreset.profile => 1160.0,
      ViewerContentWidthPreset.readable => 960.0,
    };

    return math.min(
      desktopPresetWidth,
      math.max(0.0, viewportWidth - sideGutter),
    );
  }
}

/// Shared top-level container for Viewer page content.
class ViewerPageShell extends StatelessWidget {
  final Widget child;
  final ViewerContentWidthPreset preset;
  final AlignmentGeometry alignment;

  const ViewerPageShell({
    super.key,
    required this.child,
    this.preset = ViewerContentWidthPreset.standard,
    this.alignment = Alignment.topCenter,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = ViewerLayoutMetrics.resolveMaxWidth(
          viewportWidth: constraints.maxWidth,
          preset: preset,
        );

        return Align(
          alignment: alignment,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: SizedBox(width: double.infinity, child: child),
          ),
        );
      },
    );
  }
}
