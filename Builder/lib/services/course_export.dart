import 'dart:convert';
import '../models/models.dart';
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

      for (int j = 0; j < page.blocks.length; j++) {
        final block = page.blocks[j];
        if (block.type == BlockType.multipleChoice) {
          _validateMultipleChoice(
            content: block.content as MultipleChoiceContent,
            pageNumber: i + 1,
            blockNumber: j + 1,
            errors: errors,
          );
        } else if (block.type == BlockType.matching) {
          _validateMatching(
            content: block.content as MatchingContent,
            pageNumber: i + 1,
            blockNumber: j + 1,
            errors: errors,
          );
        }
      }
    }

    return ExportValidationResult(isValid: errors.isEmpty, errors: errors);
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

  static void _validateMultipleChoice({
    required MultipleChoiceContent content,
    required int pageNumber,
    required int blockNumber,
    required List<String> errors,
  }) {
    final prefix = 'Page $pageNumber block $blockNumber (Multiple Choice)';
    if (content.question.trim().isEmpty) {
      errors.add('$prefix question cannot be empty');
    }

    if (content.options.length < 2) {
      errors.add('$prefix must have at least 2 options');
    }

    final optionIds = <String>{};
    for (int i = 0; i < content.options.length; i++) {
      final option = content.options[i];
      final id = option.id.trim();
      if (id.isEmpty) {
        errors.add('$prefix option ${i + 1} has an empty id');
      } else if (!optionIds.add(id)) {
        errors.add('$prefix has duplicate option id "$id"');
      }

      if (option.text.trim().isEmpty) {
        errors.add('$prefix option ${i + 1} text cannot be empty');
      }
    }

    final correctAnswerIds = content.normalizedCorrectAnswers.toSet();
    if (correctAnswerIds.isEmpty) {
      errors.add('$prefix must have at least one correct answer');
    }

    if (!optionIds.containsAll(correctAnswerIds)) {
      errors.add('$prefix has correct answers not present in options');
    }

    if (!content.multiSelect && correctAnswerIds.length != 1) {
      errors.add('$prefix in single-select mode must have exactly one answer');
    }
  }

  static void _validateMatching({
    required MatchingContent content,
    required int pageNumber,
    required int blockNumber,
    required List<String> errors,
  }) {
    final prefix = 'Page $pageNumber block $blockNumber (Matching)';

    if (content.question.trim().isEmpty) {
      errors.add('$prefix question cannot be empty');
    }

    if (content.leftItems.length < 2) {
      errors.add('$prefix must have at least 2 left items');
    }

    if (content.rightItems.length < 2) {
      errors.add('$prefix must have at least 2 right items');
    }

    // Check for duplicate left IDs
    final leftIds = <String>{};
    for (final item in content.leftItems) {
      if (!leftIds.add(item.id)) {
        errors.add('$prefix has duplicate left item id "${item.id}"');
      }
    }

    // Check for duplicate right IDs
    final rightIds = <String>{};
    for (final item in content.rightItems) {
      if (!rightIds.add(item.id)) {
        errors.add('$prefix has duplicate right item id "${item.id}"');
      }
    }

    // Validate pair references
    for (final pair in content.correctPairs) {
      if (!leftIds.contains(pair.leftId)) {
        errors.add('$prefix pair references unknown left id "${pair.leftId}"');
      }
      if (!rightIds.contains(pair.rightId)) {
        errors.add(
          '$prefix pair references unknown right id "${pair.rightId}"',
        );
      }
    }
  }
}

/// Export validation result
class ExportValidationResult {
  final bool isValid;
  final List<String> errors;

  const ExportValidationResult({required this.isValid, required this.errors});
}

/// Export exception
class ExportException implements Exception {
  final String message;
  const ExportException(this.message);

  @override
  String toString() => 'ExportException: $message';
}
