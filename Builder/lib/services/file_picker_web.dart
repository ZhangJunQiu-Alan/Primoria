// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

const String aiGenerationAcceptTypes =
    '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpeg,.jpg,.png,.tiff,.tif,.gif,'
    'application/pdf,application/msword,application/vnd.ms-excel,'
    'application/vnd.ms-powerpoint,'
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document,'
    'application/vnd.openxmlformats-officedocument.presentationml.presentation,'
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,'
    'image/jpeg,image/png,image/gif,image/tiff';

const String videoAcceptTypes =
    '.mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime,video/*';

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

List<html.File> _toFileList(dynamic files) {
  if (files == null) return const <html.File>[];
  if (files is html.FileList) {
    return List<html.File>.generate(files.length, (index) => files[index]);
  }
  if (files is List<html.File>) {
    return files;
  }
  if (files is List) {
    return files.whereType<html.File>().toList();
  }
  return const <html.File>[];
}

String _guessMimeType(html.File file) {
  final type = file.type.trim();
  if (type.isNotEmpty) return type;

  final name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (name.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (name.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (name.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (name.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (name.endsWith('.jpeg') || name.endsWith('.jpg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.tiff') || name.endsWith('.tif')) return 'image/tiff';
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.ogg') || name.endsWith('.ogv')) return 'video/ogg';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.m4v')) return 'video/x-m4v';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

Future<String> _readAsDataUrl(
  html.File file, {
  FileReadProgressCallback? onProgress,
}) {
  final completer = Completer<String>();
  final reader = html.FileReader();

  reader.onProgress.listen((event) {
    if (onProgress == null) return;
    final loadedRaw = event.loaded;
    final totalRaw = event.total;
    final loaded = (loadedRaw ?? 0).toInt();
    final totalFromEvent = (totalRaw ?? 0).toInt();
    final total = totalFromEvent > 0
        ? totalFromEvent
        : (file.size > 0 ? file.size : 1);
    final clampedLoaded = loaded.clamp(0, total);
    final progress = (clampedLoaded / total).clamp(0.0, 1.0).toDouble();
    onProgress(progress, clampedLoaded, total);
  });

  reader.onLoadEnd.listen((event) {
    final result = reader.result;
    if (result is String && result.isNotEmpty) {
      if (onProgress != null) {
        final total = file.size > 0 ? file.size : 1;
        onProgress(1.0, total, total);
      }
      completer.complete(result);
    } else {
      completer.completeError('Empty FileReader result');
    }
  });

  reader.onError.listen((event) {
    completer.completeError('Failed to read file');
  });

  reader.readAsDataUrl(file);
  return completer.future;
}

Future<FilePickResult> _readSingleFile(
  html.File file, {
  FileReadProgressCallback? onProgress,
}) async {
  try {
    final dataUrl = await _readAsDataUrl(file, onProgress: onProgress);
    final comma = dataUrl.indexOf(',');
    if (comma < 0 || comma + 1 >= dataUrl.length) {
      return FilePickResult(
        success: false,
        message: 'Invalid file payload for ${file.name}',
        fileName: file.name,
      );
    }

    final bytes = base64.decode(dataUrl.substring(comma + 1));
    final mimeType = _guessMimeType(file);

    return FilePickResult(
      success: true,
      message: 'File loaded',
      bytes: bytes,
      fileName: file.name,
      mimeType: mimeType,
      sizeBytes: file.size,
    );
  } catch (e) {
    return FilePickResult(
      success: false,
      message: 'Failed to read ${file.name}: $e',
      fileName: file.name,
    );
  }
}

Future<List<FilePickResult>> _readFiles(List<html.File> files) async {
  if (files.isEmpty) {
    return const <FilePickResult>[
      FilePickResult(success: false, message: 'No file selected'),
    ];
  }

  final results = <FilePickResult>[];
  for (final file in files) {
    results.add(await _readSingleFile(file));
  }
  return results;
}

Future<html.File?> _pickSingleRawFile({required String accept}) async {
  final completer = Completer<html.File?>();
  final input = html.FileUploadInputElement()
    ..accept = accept
    ..multiple = false;

  input.onChange.listen((event) {
    final pickedFiles = _toFileList(input.files);
    input.value = '';
    completer.complete(pickedFiles.isEmpty ? null : pickedFiles.first);
  });

  input.click();
  return completer.future;
}

Future<List<FilePickResult>> _pickFiles({
  required String accept,
  bool multiple = false,
}) async {
  final completer = Completer<List<FilePickResult>>();
  final input = html.FileUploadInputElement()
    ..accept = accept
    ..multiple = multiple;

  input.onChange.listen((event) async {
    final pickedFiles = _toFileList(input.files);
    final results = await _readFiles(pickedFiles);
    input.value = '';
    completer.complete(results);
  });

  input.click();
  return completer.future;
}

/// Parse files dropped from a drag-and-drop event.
Future<List<FilePickResult>> readDroppedFiles(dynamic rawFiles) async {
  final files = _toFileList(rawFiles);
  if (files.isEmpty) {
    return const <FilePickResult>[
      FilePickResult(success: false, message: 'No dropped files'),
    ];
  }
  return _readFiles(files);
}

Future<FilePickResult> readDroppedVideoFile(
  dynamic rawFiles, {
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  final files = _toFileList(rawFiles);
  if (files.isEmpty) {
    return const FilePickResult(success: false, message: 'No dropped files');
  }

  bool isVideoFile(html.File file) {
    final mime = _guessMimeType(file).toLowerCase();
    if (mime.startsWith('video/')) return true;

    final name = file.name.toLowerCase();
    return name.endsWith('.mp4') ||
        name.endsWith('.webm') ||
        name.endsWith('.ogg') ||
        name.endsWith('.ogv') ||
        name.endsWith('.mov') ||
        name.endsWith('.m4v') ||
        name.endsWith('.avi') ||
        name.endsWith('.mkv') ||
        name.endsWith('.wmv') ||
        name.endsWith('.flv');
  }

  final selected = files.cast<html.File?>().firstWhere(
    (file) => file != null && isVideoFile(file),
    orElse: () => null,
  );

  if (selected == null) {
    return const FilePickResult(
      success: false,
      message: 'No supported video file found',
    );
  }

  onReadStart?.call();
  final bytesResult = await _readSingleFile(selected, onProgress: onProgress);
  if (!bytesResult.success || bytesResult.bytes == null) {
    return bytesResult;
  }

  final mimeType = bytesResult.mimeType ?? 'video/mp4';
  final base64Content = base64.encode(bytesResult.bytes!);
  final dataUrl = 'data:$mimeType;base64,$base64Content';

  return FilePickResult(
    success: true,
    message: 'Video loaded',
    content: dataUrl,
    bytes: bytesResult.bytes,
    fileName: bytesResult.fileName,
    mimeType: mimeType,
    sizeBytes: bytesResult.sizeBytes,
  );
}

/// Pick JSON file
Future<FilePickResult> pickJsonFile() async {
  final results = await _pickFiles(
    accept: '.json,application/json',
    multiple: false,
  );

  final first = results.first;
  if (!first.success || first.bytes == null) {
    return first;
  }

  try {
    final content = utf8.decode(first.bytes!);
    return FilePickResult(
      success: true,
      message: 'File loaded',
      content: content,
      bytes: first.bytes,
      fileName: first.fileName,
      mimeType: first.mimeType,
      sizeBytes: first.sizeBytes,
    );
  } catch (e) {
    return FilePickResult(
      success: false,
      message: 'Failed to decode JSON file: $e',
      fileName: first.fileName,
    );
  }
}

/// Pick PDF file
Future<FilePickResult> pickPdfFile() async {
  final results = await _pickFiles(
    accept: '.pdf,application/pdf',
    multiple: false,
  );
  return results.first;
}

/// Pick image file as raw bytes (for Supabase Storage upload).
Future<FilePickResult> pickImageFileBytes() async {
  final results = await _pickFiles(
    accept: 'image/png,image/jpeg,image/gif,image/webp,image/tiff',
    multiple: false,
  );
  return results.first;
}

/// Pick image file
Future<FilePickResult> pickImageFile() async {
  final bytesResult = await pickImageFileBytes();
  if (!bytesResult.success || bytesResult.bytes == null) {
    return bytesResult;
  }

  final mimeType = bytesResult.mimeType ?? 'image/png';
  final base64Content = base64.encode(bytesResult.bytes!);
  final dataUrl = 'data:$mimeType;base64,$base64Content';

  return FilePickResult(
    success: true,
    message: 'Image loaded',
    content: dataUrl,
    bytes: bytesResult.bytes,
    fileName: bytesResult.fileName,
    mimeType: mimeType,
    sizeBytes: bytesResult.sizeBytes,
  );
}

/// Pick video file as raw bytes.
Future<FilePickResult> pickVideoFileBytes({
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  final file = await _pickSingleRawFile(accept: videoAcceptTypes);
  if (file == null) {
    return const FilePickResult(success: false, message: 'No file selected');
  }
  onReadStart?.call();
  return _readSingleFile(file, onProgress: onProgress);
}

/// Pick video file and return as data URL.
Future<FilePickResult> pickVideoFile({
  FileReadStartCallback? onReadStart,
  FileReadProgressCallback? onProgress,
}) async {
  final bytesResult = await pickVideoFileBytes(
    onReadStart: onReadStart,
    onProgress: onProgress,
  );
  if (!bytesResult.success || bytesResult.bytes == null) {
    return bytesResult;
  }

  final mimeType = bytesResult.mimeType ?? 'video/mp4';
  final base64Content = base64.encode(bytesResult.bytes!);
  final dataUrl = 'data:$mimeType;base64,$base64Content';

  return FilePickResult(
    success: true,
    message: 'Video loaded',
    content: dataUrl,
    bytes: bytesResult.bytes,
    fileName: bytesResult.fileName,
    mimeType: mimeType,
    sizeBytes: bytesResult.sizeBytes,
  );
}

/// Pick mixed source files for AI course generation.
Future<List<FilePickResult>> pickAIGenerationFiles() async {
  return _pickFiles(accept: aiGenerationAcceptTypes, multiple: true);
}
