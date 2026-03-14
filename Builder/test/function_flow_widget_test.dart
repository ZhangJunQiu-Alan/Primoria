import 'package:builder/features/viewer/viewer_screen.dart';
import 'package:builder/models/models.dart';
import 'package:builder/providers/course_provider.dart';
import 'package:builder/widgets/block_widgets/function_flow_block_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  FunctionFlowContent buildContent() {
    return const FunctionFlowContent(
      title: 'Function Flow',
      nodes: [
        FunctionFlowNode(
          id: 'start',
          label: 'Start',
          x: 10,
          y: 50,
          kind: FunctionFlowNode.kindStart,
        ),
        FunctionFlowNode(id: 'run', label: 'run()', x: 50, y: 50),
        FunctionFlowNode(
          id: 'end',
          label: 'End',
          x: 88,
          y: 50,
          kind: FunctionFlowNode.kindEnd,
        ),
      ],
      edges: [
        FunctionFlowEdge(from: 'start', to: 'run', label: 'call'),
        FunctionFlowEdge(from: 'run', to: 'end', label: 'return'),
      ],
      entryNodeId: 'start',
      steps: [
        FunctionFlowStep(edgeIndex: 0, note: 'call run'),
        FunctionFlowStep(edgeIndex: 1, note: 'return end'),
      ],
      style: FunctionFlowStyle(stepDurationMs: 1000),
    );
  }

  testWidgets('function flow widget supports step interaction', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: FunctionFlowBlockWidget(content: buildContent())),
      ),
    );

    expect(find.text('Function Flow'), findsOneWidget);
    expect(
      find.byKey(const Key('function_flow_step_indicator')),
      findsOneWidget,
    );
    expect(find.text('Step 0/2'), findsOneWidget);

    await tester.tap(find.byKey(const Key('function_flow_step')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Step 1/2'), findsOneWidget);
  });

  testWidgets('viewer renders function-flow block and supports step', (
    tester,
  ) async {
    final block = Block.create(
      BlockType.functionFlow,
      order: 0,
    ).copyWith(content: buildContent());
    final lesson = CourseLesson.create(title: 'Lesson 1').addBlock(block);
    final course = Course.create(title: 'Flow course').copyWith(lessons: [lesson]);

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
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Function Flow'), findsOneWidget);
    expect(find.text('Step 0/2'), findsOneWidget);
    expect(find.byKey(const Key('function_flow_step')), findsOneWidget);
  });
}
