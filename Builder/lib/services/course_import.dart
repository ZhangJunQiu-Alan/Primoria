import 'dart:convert';
import '../models/course.dart';
import 'file_picker.dart';

/// Course import service
class CourseImport {
  CourseImport._();

  /// Import JSON from file picker
  static Future<ImportResult> importFromFile() async {
    final result = await pickJsonFile();

    if (!result.success || result.content == null) {
      return ImportResult(
        success: false,
        message: result.message,
      );
    }

    try {
      final jsonMap = jsonDecode(result.content!) as Map<String, dynamic>;
      final course = Course.fromJson(jsonMap);

      return ImportResult(
        success: true,
        message: 'Import successful',
        course: course,
      );
    } catch (e) {
      return ImportResult(
        success: false,
        message: 'Parse failed: $e',
      );
    }
  }

  /// Import from JSON string
  static ImportResult importFromString(String jsonString) {
    try {
      final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
      final course = Course.fromJson(jsonMap);

      return ImportResult(
        success: true,
        message: 'Import successful',
        course: course,
      );
    } catch (e) {
      return ImportResult(
        success: false,
        message: 'Parse failed: $e',
      );
    }
  }

  /// Validate JSON structure
  static ImportValidationResult validateJson(String jsonString) {
    final errors = <String>[];

    try {
      final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;

      // Check required fields
      if (!jsonMap.containsKey('courseId')) {
        errors.add('Missing field: courseId');
      }
      if (!jsonMap.containsKey('metadata')) {
        errors.add('Missing field: metadata');
      }
      if (!jsonMap.containsKey('pages')) {
        errors.add('Missing field: pages');
      } else {
        final pages = jsonMap['pages'] as List<dynamic>?;
        if (pages == null || pages.isEmpty) {
          errors.add('pages cannot be empty');
        }
      }
    } catch (e) {
      errors.add('Invalid JSON: $e');
    }

    return ImportValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
    );
  }
}

/// Import result
class ImportResult {
  final bool success;
  final String message;
  final Course? course;

  const ImportResult({
    required this.success,
    required this.message,
    this.course,
  });
}

/// Import validation result
class ImportValidationResult {
  final bool isValid;
  final List<String> errors;

  const ImportValidationResult({
    required this.isValid,
    required this.errors,
  });
}
