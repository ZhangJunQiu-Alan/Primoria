// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

void downloadJsonFile(String jsonString, String fileName) {
  final blob = html.Blob([jsonString], 'application/json');
  final url = html.Url.createObjectUrlFromBlob(blob);

  final anchor = html.AnchorElement()
    ..href = url
    ..download = fileName
    ..style.display = 'none';

  html.document.body?.append(anchor);
  anchor.click();
  anchor.remove();

  html.Url.revokeObjectUrl(url);
}
