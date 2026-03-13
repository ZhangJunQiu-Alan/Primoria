// ignore_for_file: deprecated_member_use

import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

import 'file_picker.dart';

typedef OnAIFilesDropped = Future<void> Function(List<FilePickResult> files);

typedef OnAIDragStateChanged = void Function(bool hovering);

class AIGlobalDropListener {
  final OnAIFilesDropped onFilesDropped;
  final OnAIDragStateChanged? onDragStateChanged;

  StreamSubscription<html.MouseEvent>? _dragOverSub;
  StreamSubscription<html.MouseEvent>? _dragLeaveSub;
  StreamSubscription<html.MouseEvent>? _dropSub;

  AIGlobalDropListener({required this.onFilesDropped, this.onDragStateChanged});

  void start() {
    _dragOverSub ??= html.document.onDragOver.listen((event) {
      event.preventDefault();
      onDragStateChanged?.call(true);
    });

    _dragLeaveSub ??= html.document.onDragLeave.listen((event) {
      onDragStateChanged?.call(false);
    });

    _dropSub ??= html.document.onDrop.listen((event) async {
      event.preventDefault();
      onDragStateChanged?.call(false);

      final files = event.dataTransfer.files;
      if (files == null || files.isEmpty) return;

      final results = await readDroppedFiles(files);
      final successFiles = results.where((file) => file.success).toList();
      if (successFiles.isNotEmpty) {
        await onFilesDropped(successFiles);
      }
    });
  }

  void dispose() {
    _dragOverSub?.cancel();
    _dragLeaveSub?.cancel();
    _dropSub?.cancel();
    _dragOverSub = null;
    _dragLeaveSub = null;
    _dropSub = null;
  }
}
