import 'dart:convert';
import '../models/course.dart';
import 'file_picker.dart';
import 'course_schema_validator.dart';

/// Course import service
class CourseImport {
  CourseImport._();

  /// Import JSON from file picker
  static Future<ImportResult> importFromFile() async {
    final result = await pickJsonFile();

    if (!result.success || result.content == null) {
      return ImportResult(success: false, message: result.message);
    }

    return _importFromJsonString(result.content!);
  }

  /// Import from JSON string
  static ImportResult importFromString(String jsonString) {
    return _importFromJsonString(jsonString);
  }

  static ImportResult _importFromJsonString(String jsonString) {
    try {
      final decoded = jsonDecode(jsonString);
      if (decoded is! Map) {
        return const ImportResult(
          success: false,
          message: 'Parse failed: root JSON must be an object',
        );
      }

      final jsonMap = Map<String, dynamic>.from(decoded);
      final validation = CourseSchemaValidator.validateJsonMap(
        jsonMap,
        mode: CourseSchemaValidationMode.import,
      );

      if (validation.hasBlockingErrors) {
        return ImportResult(
          success: false,
          message: _formatValidationFailureMessage(validation.errorMessages),
          validation: validation,
        );
      }

      final course = Course.fromJson(jsonMap);

      return ImportResult(
        success: true,
        message: validation.warnings.isEmpty
            ? 'Import successful'
            : 'Import successful with ${validation.warnings.length} warning(s)',
        course: course,
        validation: validation,
      );
    } catch (e) {
      return ImportResult(success: false, message: 'Parse failed: $e');
    }
  }

  /// Validate JSON structure
  static ImportValidationResult validateJson(String jsonString) {
    try {
      final decoded = jsonDecode(jsonString);
      if (decoded is! Map) {
        return const ImportValidationResult(
          isValid: false,
          errors: ['Root JSON must be an object'],
        );
      }

      final validation = CourseSchemaValidator.validateJsonMap(
        Map<String, dynamic>.from(decoded),
        mode: CourseSchemaValidationMode.import,
      );

      return ImportValidationResult(
        isValid: validation.isValid,
        errors: validation.errorMessages,
        warnings: validation.warningMessages,
      );
    } catch (e) {
      return ImportValidationResult(
        isValid: false,
        errors: ['Invalid JSON: $e'],
      );
    }
  }

  static String _formatValidationFailureMessage(List<String> errors) {
    if (errors.isEmpty) return 'Schema validation failed';
    final shown = errors.take(8).toList();
    final more = errors.length - shown.length;
    final suffix = more > 0 ? '\n...and $more more issue(s)' : '';
    return 'Schema validation failed:\n${shown.join('\n')}$suffix';
  }
}

/// Import result
class ImportResult {
  final bool success;
  final String message;
  final Course? course;
  final CourseSchemaValidationResult? validation;

  const ImportResult({
    required this.success,
    required this.message,
    this.course,
    this.validation,
  });
}

/// Import validation result
class ImportValidationResult {
  final bool isValid;
  final List<String> errors;
  final List<String> warnings;

  const ImportValidationResult({
    required this.isValid,
    required this.errors,
    this.warnings = const [],
  });
}
