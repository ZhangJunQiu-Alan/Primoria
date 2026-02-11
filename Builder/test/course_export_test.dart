import 'package:builder/models/models.dart';
import 'package:builder/services/course_export.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validateForExport accepts valid multi-select multiple choice', () {
    final course = _buildCourseWithMultipleChoice(
      const MultipleChoiceContent(
        question: 'Select all prime numbers',
        options: [
          ChoiceOption(id: 'a', text: '2'),
          ChoiceOption(id: 'b', text: '3'),
          ChoiceOption(id: 'c', text: '4'),
        ],
        correctAnswers: ['a', 'b'],
        multiSelect: true,
      ),
    );

    final result = CourseExport.validateForExport(course);
    expect(result.isValid, isTrue);
    expect(result.errors, isEmpty);
  });

  test(
    'validateForExport rejects single-select multiple choice with multiple answers',
    () {
      final course = _buildCourseWithMultipleChoice(
        const MultipleChoiceContent(
          question: 'Single select question',
          options: [
            ChoiceOption(id: 'a', text: 'A'),
            ChoiceOption(id: 'b', text: 'B'),
          ],
          correctAnswers: ['a', 'b'],
          multiSelect: false,
        ),
      );

      final result = CourseExport.validateForExport(course);
      expect(result.isValid, isFalse);
      expect(
        result.errors.any((e) => e.contains('single-select mode')),
        isTrue,
      );
    },
  );

  test('validateForExport rejects unknown correct answer ids', () {
    final course = _buildCourseWithMultipleChoice(
      const MultipleChoiceContent(
        question: 'Invalid answer IDs',
        options: [
          ChoiceOption(id: 'a', text: 'A'),
          ChoiceOption(id: 'b', text: 'B'),
        ],
        correctAnswers: ['a', 'z'],
        multiSelect: true,
      ),
    );

    final result = CourseExport.validateForExport(course);
    expect(result.isValid, isFalse);
    expect(
      result.errors.any((e) => e.contains('not present in options')),
      isTrue,
    );
  });
}

Course _buildCourseWithMultipleChoice(MultipleChoiceContent multipleChoice) {
  final block = Block.create(
    BlockType.multipleChoice,
    order: 0,
  ).copyWith(content: multipleChoice);
  final page = CoursePage.create(title: 'Page 1').copyWith(blocks: [block]);

  return Course.create(title: 'Export Validation').copyWith(pages: [page]);
}
