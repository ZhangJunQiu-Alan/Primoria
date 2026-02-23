import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

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

/// Pick JSON file
Future<FilePickResult> pickJsonFile() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()
    ..accept = '.json,application/json';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(
        const FilePickResult(success: false, message: 'No file selected'),
      );
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final content = reader.result as String;
      completer.complete(
        FilePickResult(
          success: true,
          message: 'File loaded',
          content: content,
          fileName: file.name,
        ),
      );
    });

    reader.onError.listen((event) {
      completer.complete(
        const FilePickResult(success: false, message: 'Failed to read file'),
      );
    });

    reader.readAsText(file);
  });

  input.click();

  return completer.future;
}

/// Pick PDF file
Future<FilePickResult> pickPdfFile() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()..accept = '.pdf,application/pdf';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(
        const FilePickResult(success: false, message: 'No file selected'),
      );
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final bytes = reader.result as Uint8List;
      completer.complete(
        FilePickResult(
          success: true,
          message: 'File loaded',
          bytes: bytes,
          fileName: file.name,
        ),
      );
    });

    reader.onError.listen((event) {
      completer.complete(
        const FilePickResult(success: false, message: 'Failed to read file'),
      );
    });

    reader.readAsArrayBuffer(file);
  });

  input.click();

  return completer.future;
}

/// Pick image file as raw bytes (for Supabase Storage upload).
///
/// Uses readAsDataUrl + base64 decode because readAsArrayBuffer returns a
/// JS ArrayBuffer / Dart ByteBuffer that cannot be cast to Uint8List directly.
Future<FilePickResult> pickImageFileBytes() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()
    ..accept = 'image/png,image/jpeg,image/gif,image/webp';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(
        const FilePickResult(success: false, message: 'No file selected'),
      );
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      try {
        // readAsDataUrl returns "data:<mime>;base64,<data>"
        final dataUrl = reader.result as String;
        final comma = dataUrl.indexOf(',');
        if (comma < 0) {
          completer.complete(
            const FilePickResult(
              success: false,
              message: 'Invalid data URL from FileReader',
            ),
          );
          return;
        }
        final bytes = base64.decode(dataUrl.substring(comma + 1));
        completer.complete(
          FilePickResult(
            success: true,
            message: 'Image loaded',
            bytes: bytes,
            fileName: file.name,
          ),
        );
      } catch (e) {
        completer.complete(
          FilePickResult(success: false, message: 'Failed to decode image: $e'),
        );
      }
    });

    reader.onError.listen((event) {
      completer.complete(
        const FilePickResult(success: false, message: 'Failed to read image'),
      );
    });

    reader.readAsDataUrl(file); // returns a String — reliable cross-browser
  });

  input.click();
  return completer.future;
}

/// Pick image file
Future<FilePickResult> pickImageFile() async {
  final completer = Completer<FilePickResult>();

  final input = html.FileUploadInputElement()
    ..accept = 'image/png,image/jpeg,image/gif,image/webp';

  input.onChange.listen((event) async {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(
        const FilePickResult(success: false, message: 'No file selected'),
      );
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((event) {
      final content = reader.result as String?;
      if (content == null || content.isEmpty) {
        completer.complete(
          const FilePickResult(success: false, message: 'Failed to read image'),
        );
        return;
      }
      completer.complete(
        FilePickResult(
          success: true,
          message: 'Image loaded',
          content: content,
          fileName: file.name,
        ),
      );
    });

    reader.onError.listen((event) {
      completer.complete(
        const FilePickResult(success: false, message: 'Failed to read image'),
      );
    });

    reader.readAsDataUrl(file);
  });

  input.click();

  return completer.future;
}
