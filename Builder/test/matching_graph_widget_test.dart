import 'package:builder/features/viewer/viewer_screen.dart';
import 'package:builder/models/models.dart';
import 'package:builder/providers/course_provider.dart';
import 'package:builder/widgets/matching_content_editor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('viewer graph matching supports connect and submit', (
    tester,
  ) async {
    final block = Block.create(BlockType.matching, order: 0).copyWith(
      content: const MatchingContent(
        question: 'Connect caller to callee',
        mode: MatchingContent.modeGraph,
        nodes: [
          MatchingNode(
            id: 'caller',
            label: 'caller()',
            x: 20,
            y: 50,
            group: MatchingNode.groupLeft,
          ),
          MatchingNode(
            id: 'callee',
            label: 'callee()',
            x: 80,
            y: 50,
            group: MatchingNode.groupRight,
          ),
        ],
        edges: [MatchingEdge(from: 'caller', to: 'callee', directed: true)],
        rules: MatchingRules(
          allowOneToMany: false,
          allowManyToMany: false,
          directed: true,
        ),
      ),
    );

    final lesson = CourseLesson.create(title: 'Lesson 1').copyWith(blocks: [block]);
    final course = Course.create(
      title: 'Matching Graph',
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

    expect(find.byKey(const Key('matching_graph_node_caller')), findsOneWidget);
    expect(find.byKey(const Key('matching_graph_node_callee')), findsOneWidget);

    await tester.tap(find.byKey(const Key('matching_graph_node_caller')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.byKey(const Key('matching_graph_node_callee')));
    await tester.pump(const Duration(milliseconds: 150));

    await tester.tap(find.text('Check'));
    await tester.pumpAndSettle();

    expect(find.text('Score: 1/1'), findsOneWidget);
  });

  testWidgets('matching editor can switch to graph mode', (tester) async {
    MatchingContent current = const MatchingContent(
      question: 'Match terms',
      leftItems: [
        MatchingItem(id: 'l1', text: 'Input'),
        MatchingItem(id: 'l2', text: 'Output'),
      ],
      rightItems: [
        MatchingItem(id: 'r1', text: 'Source'),
        MatchingItem(id: 'r2', text: 'Result'),
      ],
      correctPairs: [
        MatchingPair(leftId: 'l1', rightId: 'r1'),
        MatchingPair(leftId: 'l2', rightId: 'r2'),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return SingleChildScrollView(
                child: MatchingContentEditor(
                  content: current,
                  onChanged: (next) {
                    setState(() {
                      current = next;
                    });
                  },
                ),
              );
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Graph'));
    await tester.pumpAndSettle();

    expect(current.mode, MatchingContent.modeGraph);
    expect(find.text('Rules'), findsOneWidget);
    expect(find.text('Nodes'), findsOneWidget);
    expect(find.text('Edges'), findsOneWidget);
  });
}
