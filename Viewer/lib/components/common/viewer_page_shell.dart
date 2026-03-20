import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

/// Width presets for top-level Viewer pages.
enum ViewerContentWidthPreset {
  standard,
  wide,
  feed,
  profile,
  readable,
  fullWidth,
}

class ViewerLayoutBreakpoints {
  ViewerLayoutBreakpoints._();

  static const double mobile = 768;
  static const double desktop = 1024;
  static const double largeDesktop = 1440;
}

class ViewerLayoutMetrics {
  ViewerLayoutMetrics._();

  static const double desktopContentRatio = 0.60;

  static double resolveMaxWidth({
    required double viewportWidth,
    required ViewerContentWidthPreset preset,
  }) {
    if (preset == ViewerContentWidthPreset.fullWidth) {
      return viewportWidth;
    }

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
      ViewerContentWidthPreset.fullWidth => viewportWidth,
    };

    final ratioWidth = viewportWidth * desktopContentRatio;

    return math.min(
      desktopPresetWidth,
      math.min(ratioWidth, math.max(0.0, viewportWidth - sideGutter)),
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

        return ViewerScrollGutterProxy(
          contentWidth: maxWidth,
          alignment: alignment,
          child: child,
        );
      },
    );
  }
}

/// Makes the empty desktop gutters on either side of centered content
/// forward wheel/trackpad scroll to the page's main vertical scrollable.
class ViewerScrollGutterProxy extends StatefulWidget {
  final Widget child;
  final double contentWidth;
  final AlignmentGeometry alignment;

  const ViewerScrollGutterProxy({
    super.key,
    required this.child,
    required this.contentWidth,
    this.alignment = Alignment.topCenter,
  });

  @override
  State<ViewerScrollGutterProxy> createState() =>
      _ViewerScrollGutterProxyState();
}

class _ViewerScrollGutterProxyState extends State<ViewerScrollGutterProxy> {
  ScrollPosition? _trackedPosition;

  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification.depth != 0 || notification.metrics.axis != Axis.vertical) {
      return false;
    }
    final scrollContext = notification.context;
    if (scrollContext == null) return false;
    _trackedPosition = Scrollable.maybeOf(scrollContext)?.position;
    return false;
  }

  bool _handleScrollMetricsNotification(
    ScrollMetricsNotification notification,
  ) {
    if (notification.depth != 0 || notification.metrics.axis != Axis.vertical) {
      return false;
    }
    _trackedPosition = Scrollable.maybeOf(notification.context)?.position;
    return false;
  }

  void _handlePointerSignal(PointerSignalEvent event) {
    if (event is! PointerScrollEvent) return;
    final position = _trackedPosition;
    if (position == null || !position.hasPixels) return;
    if (position.axis != Axis.vertical) return;

    final minScrollExtent = position.minScrollExtent;
    final maxScrollExtent = position.maxScrollExtent;
    if (maxScrollExtent <= minScrollExtent) return;

    final targetPixels = (position.pixels + event.scrollDelta.dy).clamp(
      minScrollExtent,
      maxScrollExtent,
    );
    if (targetPixels == position.pixels) return;

    position.jumpTo(targetPixels.toDouble());
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final gutterWidth = math.max(
          0.0,
          (constraints.maxWidth - widget.contentWidth) / 2,
        );

        return NotificationListener<ScrollMetricsNotification>(
          onNotification: _handleScrollMetricsNotification,
          child: NotificationListener<ScrollNotification>(
            onNotification: _handleScrollNotification,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Align(
                  alignment: widget.alignment,
                  child: SizedBox(
                    width: widget.contentWidth,
                    child: widget.child,
                  ),
                ),
                if (gutterWidth > 0)
                  Positioned(
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: gutterWidth,
                    child: Listener(
                      behavior: HitTestBehavior.translucent,
                      onPointerSignal: _handlePointerSignal,
                    ),
                  ),
                if (gutterWidth > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: gutterWidth,
                    child: Listener(
                      behavior: HitTestBehavior.translucent,
                      onPointerSignal: _handlePointerSignal,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
