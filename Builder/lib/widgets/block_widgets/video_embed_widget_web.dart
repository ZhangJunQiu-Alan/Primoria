// ignore_for_file: deprecated_member_use

// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';

import '../../theme/design_tokens.dart';

/// Web implementation: renders playable video via HtmlElementView.
class VideoEmbedWidget extends StatefulWidget {
  final String url;
  final String? title;
  final double height;

  const VideoEmbedWidget({
    super.key,
    required this.url,
    this.title,
    this.height = 220,
  });

  @override
  State<VideoEmbedWidget> createState() => _VideoEmbedWidgetState();
}

class _VideoEmbedWidgetState extends State<VideoEmbedWidget> {
  late final String _viewId;
  html.VideoElement? _videoElement;

  @override
  void initState() {
    super.initState();
    _viewId =
        'video-embed-${identityHashCode(this)}-${DateTime.now().microsecondsSinceEpoch}';
    _registerFactory();
  }

  void _registerFactory() {
    // ignore: avoid_web_libraries_in_flutter
    ui_web.platformViewRegistry.registerViewFactory(_viewId, (int viewId) {
      final video = html.VideoElement()
        ..controls = true
        ..preload = 'metadata'
        ..src = widget.url
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.objectFit = 'contain'
        ..style.backgroundColor = '#0F172A'
        ..setAttribute('playsinline', 'true');
      final title = widget.title?.trim();
      if (title != null && title.isNotEmpty) {
        video.setAttribute('title', title);
      }
      _videoElement = video;
      return video;
    });
  }

  @override
  void didUpdateWidget(covariant VideoEmbedWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    final video = _videoElement;
    if (video == null) return;

    if (oldWidget.url != widget.url) {
      video.pause();
      video.src = widget.url;
      video.load();
    }
    if ((oldWidget.title ?? '') != (widget.title ?? '')) {
      final title = widget.title?.trim();
      if (title != null && title.isNotEmpty) {
        video.setAttribute('title', title);
      } else {
        video.attributes.remove('title');
      }
    }
  }

  @override
  void dispose() {
    final video = _videoElement;
    if (video != null) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    super.dispose();
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
