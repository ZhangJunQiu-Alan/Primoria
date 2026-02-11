import 'package:builder/features/viewer/viewer_screen.dart';
import 'package:builder/models/models.dart';
import 'package:builder/providers/course_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'gated block stays hidden without lock placeholder before check',
    (tester) async {
      await tester.pumpWidget(_buildTestApp(_buildCourse()));
      await tester.pumpAndSettle();

      expect(find.text('Question 1'), findsOneWidget);
      expect(find.text('Unlocked block'), findsNothing);
      expect(find.text('Trailing block'), findsNothing);
      expect(
        find.text('Answer the previous question correctly to unlock'),
        findsNothing,
      );
    },
  );

  testWidgets('gated block unlocks and reveals subsequent blocks after check', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestApp(_buildCourse()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Option A1'));
    await tester.tap(find.text('Check'));
    await tester.pumpAndSettle();

    expect(find.text('Unlocked block'), findsOneWidget);
    expect(find.text('Trailing block'), findsOneWidget);
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

Course _buildCourse() {
  final questionBlock = Block.create(BlockType.multipleChoice, order: 0)
      .copyWith(
        content: const MultipleChoiceContent(
          question: 'Question 1',
          options: [
            ChoiceOption(id: 'a', text: 'Option A1'),
            ChoiceOption(id: 'b', text: 'Option B1'),
          ],
          correctAnswer: 'a',
        ),
      );

  final gatedBlock = Block.create(BlockType.text, order: 1).copyWith(
    content: const TextContent(value: 'Unlocked block'),
    visibilityRule: 'afterPreviousCorrect',
  );

  final trailingBlock = Block.create(
    BlockType.text,
    order: 2,
  ).copyWith(content: const TextContent(value: 'Trailing block'));

  final page = CoursePage.create(
    title: 'Page 1',
  ).copyWith(blocks: [questionBlock, gatedBlock, trailingBlock]);

  return Course.create(title: 'Viewer Visibility Test').copyWith(pages: [page]);
}
