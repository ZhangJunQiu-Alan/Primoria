import 'dart:typed_data';

const String aiGenerationAcceptTypes =
    '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpeg,.jpg,.png,.tiff,.tif,.gif';

typedef FileReadProgressCallback =
    void Function(double progress, int loadedBytes, int totalBytes);
typedef FileReadStartCallback = void Function();

/// File pick result
class FilePickResult {
  final bool success;
  final String message;
  final String? content;
  final Uint8List? bytes;
  final String? fileName;
  final String? mimeType;
  final int? sizeBytes;

  const FilePickResult({
    required this.success,
    required this.message,
    this.content,
    this.bytes,
    this.fileName,
    this.mimeType,
    this.sizeBytes,
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

Future<FilePickResult> pickImageFile() async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}

Future<FilePickResult> pickImageFileBytes() async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}

Future<FilePickResult> pickVideoFile({
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}

Future<FilePickResult> pickVideoFileBytes({
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  return const FilePickResult(
    success: false,
    message: 'File picker is only available on Web platform',
  );
}

Future<List<FilePickResult>> pickAIGenerationFiles() async {
  return const <FilePickResult>[
    FilePickResult(
      success: false,
      message: 'File picker is only available on Web platform',
    ),
  ];
}

Future<List<FilePickResult>> readDroppedFiles(dynamic rawFiles) async {
  return const <FilePickResult>[
    FilePickResult(
      success: false,
      message: 'Drag-and-drop is only available on Web platform',
    ),
  ];
}

Future<FilePickResult> readDroppedVideoFile(
  dynamic rawFiles, {
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  return const FilePickResult(
    success: false,
    message: 'Drag-and-drop is only available on Web platform',
  );
}
