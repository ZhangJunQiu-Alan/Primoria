import 'package:flutter/widgets.dart';

typedef OnVideoFilesDropped = Future<void> Function(dynamic rawFiles);

/// Non-web fallback drop zone wrapper.
class VideoDropZone extends StatelessWidget {
  final Widget Function(BuildContext context, bool isHovering) builder;
  final OnVideoFilesDropped onVideoFilesDropped;
  final bool enabled;

  const VideoDropZone({
    super.key,
    required this.builder,
    required this.onVideoFilesDropped,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return builder(context, false);
  }
}
