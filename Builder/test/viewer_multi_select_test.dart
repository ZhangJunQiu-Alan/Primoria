import 'package:builder/features/viewer/viewer_screen.dart';
import 'package:builder/models/models.dart';
import 'package:builder/providers/course_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('multi-select validates unordered correct selections', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestApp(_buildMultiSelectCourse()));
    await tester.pumpAndSettle();

    expect(find.text('Select all that apply'), findsOneWidget);

    // Select in reverse order to ensure matching is order-independent.
    await tester.ensureVisible(find.text('Choice C'));
    await tester.tap(find.text('Choice C'));
    await tester.ensureVisible(find.text('Choice A'));
    await tester.tap(find.text('Choice A'));
    await tester.ensureVisible(find.text('Check'));
    await tester.tap(find.text('Check'));
    await tester.pumpAndSettle();

    expect(find.text('Correct!'), findsOneWidget);
  });

  testWidgets('multi-select fails when only subset is selected', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestApp(_buildMultiSelectCourse()));
    await tester.pumpAndSettle();

    expect(find.text('Select all that apply'), findsOneWidget);
    await tester.ensureVisible(find.text('Choice A'));
    await tester.tap(find.text('Choice A'));
    await tester.ensureVisible(find.text('Check'));
    await tester.tap(find.text('Check'));
    await tester.pumpAndSettle();

    expect(find.text('Incorrect'), findsOneWidget);
  });
}

Widget _buildTestApp(Course course) {
  return ProviderScope(
    overrides: [
      courseProvider.overrideWith((ref) {
        final notifier = CourseNotifier();
        notifier.loadCourse(course);
        return notifier;
      }),
    ],
    child: const MaterialApp(home: ViewerScreen()),
  );
}

Course _buildMultiSelectCourse() {
  final questionBlock = Block.create(BlockType.multipleChoice, order: 0)
      .copyWith(
        content: const MultipleChoiceContent(
          question: 'Pick all correct choices',
          options: [
            ChoiceOption(id: 'a', text: 'Choice A'),
            ChoiceOption(id: 'b', text: 'Choice B'),
            ChoiceOption(id: 'c', text: 'Choice C'),
          ],
          correctAnswer: 'a',
          correctAnswers: ['a', 'c'],
          multiSelect: true,
        ),
      );

  final page = CoursePage.create(
    title: 'Page 1',
  ).copyWith(blocks: [questionBlock]);

  return Course.create(
    title: 'Multi Select Validation',
  ).copyWith(pages: [page]);
}
