import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

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
  try {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (picked == null) {
      return const ImagePickResult(success: false, cancelled: true);
    }

    final bytes = await picked.readAsBytes();
    return ImagePickResult(success: true, bytes: bytes, fileName: picked.name);
  } catch (e) {
    return ImagePickResult(success: false, message: e.toString());
  }
}
