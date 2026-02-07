import 'dart:typed_data';

/// File pick result
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

/// File picker for non-web platforms (stub)
Future<FilePickResult> pickJsonFile() async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}

Future<FilePickResult> pickPdfFile() async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}
