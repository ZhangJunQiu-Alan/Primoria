import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';
import 'package:web/web.dart' as web;

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
  final input =
      web.document.createElement('input') as web.HTMLInputElement
        ..type = 'file'
        ..accept = 'image/png,image/jpeg,image/gif,image/webp'
        ..multiple = false;

  input.addEventListener(
    'change',
    (web.Event _) {
      final files = input.files;
      if (files == null || files.length == 0) {
        completer.complete(
          const ImagePickResult(success: false, cancelled: true),
        );
        return;
      }

      final file = files.item(0)!;
      final reader = web.FileReader();

      reader.addEventListener(
        'loadend',
        (web.Event _) {
          final result = reader.result;
          if (result == null) {
            completer.complete(
              const ImagePickResult(
                success: false,
                message: 'Failed to read selected image bytes',
              ),
            );
            return;
          }
          final bytes =
              (result as JSArrayBuffer).toDart.asUint8List();
          completer.complete(
            ImagePickResult(
              success: true,
              bytes: bytes,
              fileName: file.name,
            ),
          );
        }.toJS,
      );

      reader.addEventListener(
        'error',
        (web.Event _) {
          completer.complete(
            const ImagePickResult(
              success: false,
              message: 'Failed to read selected image',
            ),
          );
        }.toJS,
      );

      reader.readAsArrayBuffer(file);
    }.toJS,
  );

  input.click();
  return completer.future;
}
