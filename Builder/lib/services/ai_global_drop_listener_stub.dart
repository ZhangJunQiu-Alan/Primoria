import 'file_picker.dart';

typedef OnAIFilesDropped = Future<void> Function(List<FilePickResult> files);

typedef OnAIDragStateChanged = void Function(bool hovering);

class AIGlobalDropListener {
  final OnAIFilesDropped onFilesDropped;
  final OnAIDragStateChanged? onDragStateChanged;

  AIGlobalDropListener({required this.onFilesDropped, this.onDragStateChanged});

  void start() {}

  void dispose() {}
}
