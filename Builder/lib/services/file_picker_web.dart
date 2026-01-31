import 'dart:async';
import 'dart:typed_data';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// 文件选择结果
class FilePickResult {
  final bool success;
  final String message;
  final String? content;
  final Uint8List? bytes;
  final String? fileName;

  const FilePickResult({
    required this.success,
    required this.message,
    this.content,
    this.bytes,
    this.fileName,
  });
}

/// 选择 JSON 文件
Future<FilePickResult> pickJsonFile() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()
    ..accept = '.json,application/json';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(const FilePickResult(
        success: false,
        message: 'No file selected',
      ));
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final content = reader.result as String;
      completer.complete(FilePickResult(
        success: true,
        message: 'File loaded',
        content: content,
        fileName: file.name,
      ));
    });

    reader.onError.listen((event) {
      completer.complete(const FilePickResult(
        success: false,
        message: 'Failed to read file',
      ));
    });

    reader.readAsText(file);
  });

  input.click();

  return completer.future;
}

/// 选择 PDF 文件
Future<FilePickResult> pickPdfFile() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()
    ..accept = '.pdf,application/pdf';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(const FilePickResult(
        success: false,
        message: 'No file selected',
      ));
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final bytes = reader.result as Uint8List;
      completer.complete(FilePickResult(
        success: true,
        message: 'File loaded',
        bytes: bytes,
        fileName: file.name,
      ));
    });

    reader.onError.listen((event) {
      completer.complete(const FilePickResult(
        success: false,
        message: 'Failed to read file',
      ));
    });

    reader.readAsArrayBuffer(file);
  });

  input.click();

  return completer.future;
}
