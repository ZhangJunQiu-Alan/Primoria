// ignore_for_file: deprecated_member_use

import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

import 'package:flutter/widgets.dart';

typedef OnVideoFilesDropped = Future<void> Function(dynamic rawFiles);

/// Web drop zone wrapper that accepts OS-level video file drops.
class VideoDropZone extends StatefulWidget {
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
  State<VideoDropZone> createState() => _VideoDropZoneState();
}

class _VideoDropZoneState extends State<VideoDropZone> {
  final GlobalKey _regionKey = GlobalKey();
  StreamSubscription<html.MouseEvent>? _dragOverSub;
  StreamSubscription<html.MouseEvent>? _dragLeaveSub;
  StreamSubscription<html.MouseEvent>? _dragEndSub;
  StreamSubscription<html.MouseEvent>? _dropSub;
  bool _isHovering = false;
  bool _isHandlingDrop = false;

  @override
  void initState() {
    super.initState();
    _bindListeners();
  }

  @override
  void didUpdateWidget(covariant VideoDropZone oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.enabled && _isHovering) {
      setState(() => _isHovering = false);
    }
  }

  void _bindListeners() {
    _dragOverSub ??= html.document.onDragOver.listen(_handleDragOver);
    _dragLeaveSub ??= html.document.onDragLeave.listen((event) {
      if (_isHovering) {
        setState(() => _isHovering = false);
      }
    });
    _dragEndSub ??= html.document.onDragEnd.listen((event) {
      if (_isHovering) {
        setState(() => _isHovering = false);
      }
    });
    _dropSub ??= html.document.onDrop.listen(_handleDrop);
  }

  bool _hasFilePayload(html.MouseEvent event) {
    final dataTransfer = event.dataTransfer;
    final files = dataTransfer.files;
    if (files != null && files.isNotEmpty) return true;
    final types = dataTransfer.types;
    return types != null && types.contains('Files');
  }

  bool _isInsideDropRegion(html.MouseEvent event) {
    final renderObject = _regionKey.currentContext?.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) return false;

    final topLeft = renderObject.localToGlobal(Offset.zero);
    final rect = Rect.fromLTWH(
      topLeft.dx,
      topLeft.dy,
      renderObject.size.width,
      renderObject.size.height,
    );

    final pointer = Offset(
      event.client.x.toDouble(),
      event.client.y.toDouble(),
    );
    return rect.contains(pointer);
  }

  void _handleDragOver(html.MouseEvent event) {
    if (!widget.enabled || !_hasFilePayload(event)) {
      if (_isHovering) {
        setState(() => _isHovering = false);
      }
      return;
    }

    final inside = _isInsideDropRegion(event);
    if (inside) {
      event.preventDefault();
      if (!_isHovering) {
        setState(() => _isHovering = true);
      }
    } else if (_isHovering) {
      setState(() => _isHovering = false);
    }
  }

  Future<void> _handleDrop(html.MouseEvent event) async {
    if (!widget.enabled) return;

    final inside = _isInsideDropRegion(event);
    if (!inside) {
      if (_isHovering) {
        setState(() => _isHovering = false);
      }
      return;
    }

    event.preventDefault();
    if (_isHovering) {
      setState(() => _isHovering = false);
    }

    if (_isHandlingDrop) return;
    final files = event.dataTransfer.files;
    if (files == null || files.isEmpty) return;

    _isHandlingDrop = true;
    try {
      await widget.onVideoFilesDropped(files);
    } finally {
      _isHandlingDrop = false;
    }
  }

  @override
  void dispose() {
    _dragOverSub?.cancel();
    _dragLeaveSub?.cancel();
    _dragEndSub?.cancel();
    _dropSub?.cancel();
    _dragOverSub = null;
    _dragLeaveSub = null;
    _dragEndSub = null;
    _dropSub = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: _regionKey,
      child: widget.builder(context, _isHovering),
    );
  }
}
