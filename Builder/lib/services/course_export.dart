import 'dart:convert';
import '../models/course.dart';
import 'course_export_platform.dart'
    if (dart.library.html) 'course_export_web.dart';

/// Course export service
class CourseExport {
  CourseExport._();

  /// Export course as JSON string
  static String exportToJson(Course course) {
    final jsonMap = course.toJson();
    return const JsonEncoder.withIndent('  ').convert(jsonMap);
  }

  /// Validate course for export
  static ExportValidationResult validateForExport(Course course) {
    final errors = <String>[];

    // Check course title
    if (course.metadata.title.isEmpty) {
      errors.add('Course title cannot be empty');
    }

    // Check pages
    if (course.pages.isEmpty) {
      errors.add('A course must have at least one page');
    }

    // Check each page
    for (int i = 0; i < course.pages.length; i++) {
      final page = course.pages[i];
      if (page.title.isEmpty) {
        errors.add('Page ${i + 1} title cannot be empty');
      }
    }

    return ExportValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
    );
  }

  /// Download JSON file (web)
  static void downloadJson(Course course) {
    final validation = validateForExport(course);
    if (!validation.isValid) {
      throw ExportException(validation.errors.join('\n'));
    }

    final jsonString = exportToJson(course);
    final fileName = _generateFileName(course.metadata.title);
    downloadJsonFile(jsonString, fileName);
  }

  /// Generate filename
  static String _generateFileName(String title) {
    // Remove invalid filename characters
    final cleanTitle = title
        .replaceAll(RegExp(r'[<>:"/\\|?*]'), '')
        .replaceAll(RegExp(r'\s+'), '_')
        .toLowerCase();

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return '${cleanTitle}_$timestamp.json';
  }
}

/// Export validation result
class ExportValidationResult {
  final bool isValid;
  final List<String> errors;

  const ExportValidationResult({
    required this.isValid,
    required this.errors,
  });
}

/// Export exception
class ExportException implements Exception {
  final String message;
  const ExportException(this.message);

  @override
  String toString() => 'ExportException: $message';
}
