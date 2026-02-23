import 'dart:async';
import 'dart:typed_data';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class ImagePickResult {
  final bool success;
  final bool cancelled;
  final String? message;
  final Uint8List? bytes;
  final String? fileName;

  const ImagePickResult({
    required this.success,
    this.cancelled = false,
    this.message,
    this.bytes,
    this.fileName,
  });
}

Future<ImagePickResult> pickImageFileBytes() async {
  final completer = Completer<ImagePickResult>();
  final input = html.FileUploadInputElement()
    ..accept = 'image/png,image/jpeg,image/gif,image/webp'
    ..multiple = false;

  input.onChange.listen((_) {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(
        const ImagePickResult(success: false, cancelled: true),
      );
      return;
    }

    final file = files.first;
    final reader = html.FileReader();

    reader.onLoadEnd.listen((_) {
      final bytes = reader.result as Uint8List?;
      if (bytes == null) {
        completer.complete(
          const ImagePickResult(
            success: false,
            message: 'Failed to read selected image bytes',
          ),
        );
        return;
      }
      completer.complete(
        ImagePickResult(success: true, bytes: bytes, fileName: file.name),
      );
    });

    reader.onError.listen((_) {
      completer.complete(
        const ImagePickResult(
          success: false,
          message: 'Failed to read selected image',
        ),
      );
    });

    reader.readAsArrayBuffer(file);
  });

  input.click();
  return completer.future;
}
