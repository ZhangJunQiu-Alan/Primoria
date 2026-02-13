import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/course.dart';
import 'file_picker.dart';
import 'course_schema_validator.dart';
import 'course_schema_migrator.dart';

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
      final migration = CourseSchemaMigrator.migrateToCurrent(jsonMap);
      _logMigration(migration);
      if (!migration.success || migration.migratedJson == null) {
        return ImportResult(
          success: false,
          message: 'Migration failed: ${migration.message}',
          migration: migration,
        );
      }

      final migratedJson = migration.migratedJson!;
      final validation = CourseSchemaValidator.validateJsonMap(
        migratedJson,
        mode: CourseSchemaValidationMode.import,
      );

      if (validation.hasBlockingErrors) {
        return ImportResult(
          success: false,
          message: _formatValidationFailureMessage(validation.errorMessages),
          validation: validation,
          migration: migration,
        );
      }

      final course = Course.fromJson(migratedJson);
      final migrationSuffix = migration.wasMigrated
          ? ' (migrated from ${migration.sourceVersion})'
          : '';

      return ImportResult(
        success: true,
        message: validation.warnings.isEmpty
            ? 'Import successful$migrationSuffix'
            : 'Import successful with ${validation.warnings.length} warning(s)$migrationSuffix',
        course: course,
        validation: validation,
        migration: migration,
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

      final migration = CourseSchemaMigrator.migrateToCurrent(
        Map<String, dynamic>.from(decoded),
      );
      if (!migration.success || migration.migratedJson == null) {
        return ImportValidationResult(
          isValid: false,
          errors: ['Migration failed: ${migration.message}'],
          warnings: migration.steps,
        );
      }

      final validation = CourseSchemaValidator.validateJsonMap(
        migration.migratedJson!,
        mode: CourseSchemaValidationMode.import,
      );
      final migrationWarnings = migration.wasMigrated
          ? [
              'Migration applied: ${migration.sourceVersion} -> ${migration.targetVersion}',
              ...migration.steps,
            ]
          : const <String>[];

      return ImportValidationResult(
        isValid: validation.isValid,
        errors: validation.errorMessages,
        warnings: [...migrationWarnings, ...validation.warningMessages],
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

  static void _logMigration(CourseSchemaMigrationResult migration) {
    debugPrint(
      '[CourseImport] schema migration '
      '${migration.success ? 'success' : 'failed'} '
      '(${migration.sourceVersion} -> ${migration.targetVersion})',
    );
    for (final step in migration.steps) {
      debugPrint('[CourseImport] $step');
    }
    if (!migration.success) {
      debugPrint('[CourseImport] Migration error: ${migration.message}');
    }
  }
}

/// Import result
class ImportResult {
  final bool success;
  final String message;
  final Course? course;
  final CourseSchemaValidationResult? validation;
  final CourseSchemaMigrationResult? migration;

  const ImportResult({
    required this.success,
    required this.message,
    this.course,
    this.validation,
    this.migration,
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
