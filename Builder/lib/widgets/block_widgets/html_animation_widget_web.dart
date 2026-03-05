// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

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
        ..setAttribute('srcdoc', widget.htmlContent)
        ..setAttribute('sandbox', 'allow-scripts')
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '${widget.height.toInt()}px'
        ..style.borderRadius = '${AppBorderRadius.sm}px';
      return iframe;
    });
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
