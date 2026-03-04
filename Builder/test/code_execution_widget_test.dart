import 'package:builder/features/viewer/viewer_screen.dart';
import 'package:builder/models/models.dart';
import 'package:builder/providers/course_provider.dart';
import 'package:builder/widgets/block_widgets/code_execution_block_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  CodeExecutionContent buildContent() {
    return const CodeExecutionContent(
      title: 'Code Execution',
      language: 'python',
      sourceCode: 'a = 1\nb = a + 2\nprint(b)',
      traceSteps: [
        CodeExecutionTraceStep(line: 1, variables: {'a': 1}),
        CodeExecutionTraceStep(line: 2, variables: {'a': 1, 'b': 3}),
        CodeExecutionTraceStep(
          line: 3,
          stdoutDelta: '3',
          variables: {'a': 1, 'b': 3},
        ),
      ],
      checkpoints: [
        CodeExecutionCheckpoint(
          stepIndex: 1,
          question: 'What is b?',
          options: ['2', '3'],
          correctIndex: 1,
          explanation: 'a + 2',
        ),
      ],
      controls: CodeExecutionControls(
        autoplay: false,
        stepDurationMs: 700,
        allowScrub: true,
      ),
      style: CodeExecutionStyle(
        theme: 'indigo',
        showLineNumbers: true,
        showVariablesPanel: true,
        showStdoutPanel: true,
      ),
    );
  }

  testWidgets('code execution widget supports step/reset/checkpoint flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: CodeExecutionBlockWidget(content: buildContent())),
      ),
    );

    expect(find.text('Step 0/3'), findsOneWidget);
    expect(find.byKey(const Key('code_execution_variables')), findsOneWidget);
    expect(find.byKey(const Key('code_execution_stdout')), findsOneWidget);

    await tester.tap(find.byKey(const Key('code_execution_step')));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('Step 1/3'), findsOneWidget);

    await tester.tap(find.byKey(const Key('code_execution_step')));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.byKey(const Key('code_execution_checkpoint')), findsOneWidget);

    await tester.ensureVisible(
      find.byKey(const Key('code_execution_checkpoint_option_1')),
    );
    await tester.tap(
      find.byKey(const Key('code_execution_checkpoint_option_1')),
    );
    await tester.pump(const Duration(milliseconds: 100));
    await tester.ensureVisible(
      find.byKey(const Key('code_execution_checkpoint_submit')),
    );
    await tester.tap(find.byKey(const Key('code_execution_checkpoint_submit')));
    await tester.pumpAndSettle();
    expect(find.text('Correct'), findsOneWidget);

    await tester.tap(
      find.byKey(const Key('code_execution_checkpoint_continue')),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('code_execution_checkpoint')), findsNothing);

    await tester.tap(find.byKey(const Key('code_execution_reset')));
    await tester.pumpAndSettle();
    expect(find.text('Step 0/3'), findsOneWidget);
  });

  testWidgets('viewer renders code-execution block and supports controls', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final block = Block.create(
      BlockType.codeExecution,
      order: 0,
    ).copyWith(content: buildContent());
    final lesson = CourseLesson.create(title: 'Lesson 1').copyWith(blocks: [block]);
    final course = Course.create(
      title: 'Execution Course',
    ).copyWith(lessons: [lesson]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          courseProvider.overrideWith((ref) {
            final notifier = CourseNotifier();
            notifier.loadCourse(course);
            return notifier;
          }),
        ],
        child: const MaterialApp(home: ViewerScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Code Execution'), findsOneWidget);
    expect(find.byKey(const Key('code_execution_step')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('code_execution_step')));
    await tester.tap(find.byKey(const Key('code_execution_step')));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('Step 1/3'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('code_execution_reset')));
    await tester.tap(find.byKey(const Key('code_execution_reset')));
    await tester.pumpAndSettle();
    expect(find.text('Step 0/3'), findsOneWidget);
  });
}
