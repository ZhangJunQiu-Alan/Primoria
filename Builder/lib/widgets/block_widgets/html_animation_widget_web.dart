// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

final Set<html.IFrameElement> _activeHtmlAnimationIframes = {};
bool _htmlAnimationInteractionEnabled = true;

void setHtmlAnimationInteractionEnabled(bool enabled) {
  _htmlAnimationInteractionEnabled = enabled;
  for (final iframe in _activeHtmlAnimationIframes) {
    iframe.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

/// Web implementation: renders HTML inside a sandboxed iframe via HtmlElementView.
class HtmlAnimationWidget extends StatefulWidget {
  final String htmlContent;
  final double height;

  const HtmlAnimationWidget({
    super.key,
    required this.htmlContent,
    this.height = 300,
  });

  @override
  State<HtmlAnimationWidget> createState() => _HtmlAnimationWidgetState();
}

class _HtmlAnimationWidgetState extends State<HtmlAnimationWidget> {
  late final String _viewId;
  html.IFrameElement? _iframe;

  @override
  void initState() {
    super.initState();
    _viewId =
        'html-anim-${identityHashCode(this)}-${DateTime.now().microsecondsSinceEpoch}';
    _registerView();
  }

  void _registerView() {
    // ignore: avoid_web_libraries_in_flutter
    ui_web.platformViewRegistry.registerViewFactory(_viewId, (int id) {
      final iframe = html.IFrameElement()
        ..setAttribute('srcdoc', _withOverflowGuard(widget.htmlContent))
        ..setAttribute('sandbox', 'allow-scripts')
        ..setAttribute('scrolling', 'no')
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '${widget.height.toInt()}px'
        ..style.overflow = 'hidden'
        ..style.borderRadius = '${AppBorderRadius.sm}px';
      iframe.style.pointerEvents = _htmlAnimationInteractionEnabled
          ? 'auto'
          : 'none';
      _activeHtmlAnimationIframes.add(iframe);
      _iframe = iframe;
      return iframe;
    });
  }

  @override
  void didUpdateWidget(covariant HtmlAnimationWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    final iframe = _iframe;
    if (iframe == null) return;

    if ((oldWidget.height - widget.height).abs() > 0.5) {
      iframe.style.height = '${widget.height.toInt()}px';
    }
    if (oldWidget.htmlContent != widget.htmlContent) {
      // Force hard reload so regenerated HTML always replaces old runtime state.
      iframe.setAttribute(
        'srcdoc',
        '<!DOCTYPE html><html><head></head><body></body></html>',
      );
      iframe.setAttribute('srcdoc', _withOverflowGuard(widget.htmlContent));
    }
  }

  @override
  void dispose() {
    final iframe = _iframe;
    if (iframe != null) {
      _activeHtmlAnimationIframes.remove(iframe);
    }
    super.dispose();
  }

  String _withOverflowGuard(String htmlContent) {
    const guardStyle = '''
<style id="primoria-overflow-guard">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    overflow: hidden !important;
  }
  *, *::before, *::after { box-sizing: border-box; }
  canvas, svg, img, video {
    max-width: 100% !important;
    max-height: 100% !important;
  }
</style>
''';

    const guardScript = '''
<script id="primoria-overflow-guard-script">
(() => {
  function resizeCanvases() {
    const w = window.innerWidth || document.documentElement.clientWidth || 1;
    const h = window.innerHeight || document.documentElement.clientHeight || 1;
    document.querySelectorAll('canvas').forEach((c) => {
      const cw = Number(c.width) || 0;
      const ch = Number(c.height) || 0;
      if (cw !== w || ch !== h) {
        c.width = w;
        c.height = h;
      }
    });
  }

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases, { passive: true });
})();
</script>
''';

    final headPattern = RegExp(r'<head[^>]*>', caseSensitive: false);
    final headMatch = headPattern.firstMatch(htmlContent);
    if (headMatch != null) {
      final headTag = headMatch.group(0)!;
      final withStyle = htmlContent.replaceFirst(
        headTag,
        '$headTag$guardStyle',
      );
      final bodyEndPattern = RegExp(r'</body>', caseSensitive: false);
      if (bodyEndPattern.hasMatch(withStyle)) {
        return withStyle.replaceFirst(bodyEndPattern, '$guardScript</body>');
      }
      return '$withStyle$guardScript';
    }

    return '''
<!DOCTYPE html>
<html>
<head>
$guardStyle
</head>
<body>
$htmlContent
$guardScript
</body>
</html>
''';
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
      child: SizedBox(
        width: double.infinity,
        height: widget.height,
        child: HtmlElementView(viewType: _viewId),
      ),
    );
  }
}
