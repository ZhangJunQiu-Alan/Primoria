import 'dart:convert';
import '../models/models.dart';
import 'course_schema_validator.dart';
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
    final validation = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );
    return ExportValidationResult(
      isValid: validation.isValid,
      errors: validation.errorMessages,
      warnings: validation.warningMessages,
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
  final List<String> warnings;

  const ExportValidationResult({
    required this.isValid,
    required this.errors,
    this.warnings = const [],
  });
}

/// Export exception
class ExportException implements Exception {
  final String message;
  const ExportException(this.message);

  @override
  String toString() => 'ExportException: $message';
}
