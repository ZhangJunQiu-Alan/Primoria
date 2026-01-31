import 'dart:typed_data';

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

/// 非 Web 平台的文件选择（stub 实现）
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
