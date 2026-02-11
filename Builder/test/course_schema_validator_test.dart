import 'dart:convert';

import 'package:builder/models/models.dart';
import 'package:builder/services/course_export.dart';
import 'package:builder/services/course_import.dart';
import 'package:builder/services/course_schema_validator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validator reports actionable field paths for blocking errors', () {
    final course = _buildCourseWithMultipleChoice(
      const MultipleChoiceContent(
        question: 'Pick prime numbers',
        options: [
          ChoiceOption(id: 'a', text: '2'),
          ChoiceOption(id: 'b', text: '4'),
        ],
        correctAnswers: ['z'],
        multiSelect: true,
      ),
    );

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.save,
    );

    expect(result.hasBlockingErrors, isTrue);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.pages[0].blocks[0].content.correctAnswers[0]'),
      ),
      isTrue,
    );
  });

  test(
    'save mode keeps incomplete authoring as warning, publish blocks it',
    () {
      final course = _buildCourseWithMultipleChoice(
        const MultipleChoiceContent(
          question: '',
          options: [
            ChoiceOption(id: 'a', text: 'Option A'),
            ChoiceOption(id: 'b', text: 'Option B'),
          ],
          correctAnswers: ['a'],
          multiSelect: false,
        ),
      );

      final saveResult = CourseSchemaValidator.validateCourse(
        course,
        mode: CourseSchemaValidationMode.save,
      );
      expect(saveResult.hasBlockingErrors, isFalse);
      expect(
        saveResult.warningMessages.any(
          (w) => w.contains(r'$.pages[0].blocks[0].content.question'),
        ),
        isTrue,
      );

      final publishResult = CourseSchemaValidator.validateCourse(
        course,
        mode: CourseSchemaValidationMode.publish,
      );
      expect(publishResult.hasBlockingErrors, isTrue);
      expect(
        publishResult.errorMessages.any(
          (e) => e.contains(r'$.pages[0].blocks[0].content.question'),
        ),
        isTrue,
      );
    },
  );

  test('import uses centralized schema validation and returns details', () {
    final course = _buildCourseWithMultipleChoice(
      const MultipleChoiceContent(
        question: 'Select all correct',
        options: [
          ChoiceOption(id: 'a', text: 'A'),
          ChoiceOption(id: 'b', text: 'B'),
        ],
        correctAnswers: ['z'],
        multiSelect: true,
      ),
    );

    final result = CourseImport.importFromString(jsonEncode(course.toJson()));

    expect(result.success, isFalse);
    expect(result.validation, isNotNull);
    expect(result.message, contains('Schema validation failed'));
    expect(
      result.validation!.errorMessages.any(
        (e) => e.contains(r'$.pages[0].blocks[0].content.correctAnswers[0]'),
      ),
      isTrue,
    );
  });

  test('export validation reuses strict schema validation', () {
    final course = _buildCourseWithMultipleChoice(
      const MultipleChoiceContent(
        question: '',
        options: [
          ChoiceOption(id: 'a', text: 'Option A'),
          ChoiceOption(id: 'b', text: 'Option B'),
        ],
        correctAnswers: ['a'],
        multiSelect: false,
      ),
    );

    final result = CourseExport.validateForExport(course);
    expect(result.isValid, isFalse);
    expect(
      result.errors.any(
        (e) => e.contains(r'$.pages[0].blocks[0].content.question'),
      ),
      isTrue,
    );
  });
}

Course _buildCourseWithMultipleChoice(MultipleChoiceContent content) {
  final block = Block.create(
    BlockType.multipleChoice,
    order: 0,
  ).copyWith(content: content);
  final page = CoursePage.create(title: 'Page 1').copyWith(blocks: [block]);
  return Course.create(title: 'Validation Test').copyWith(pages: [page]);
}
