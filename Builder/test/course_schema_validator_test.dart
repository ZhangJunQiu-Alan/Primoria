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
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.correct_answers[0]'),
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
          (w) => w.contains(r'$.lessons[0].pages[0].blocks[0].content.question'),
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
          (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.question'),
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
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.correct_answers[0]'),
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
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.question'),
      ),
      isTrue,
    );
  });

  test('animation block passes strict schema validation', () {
    final block = Block.create(BlockType.animation, order: 0).copyWith(
      content: const AnimationContent(
        preset: AnimationContent.presetPulseBars,
        durationMs: 1600,
        loop: true,
        speed: 1.25,
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isTrue);
  });

  test('animation block invalid config reports actionable paths', () {
    final block = Block.create(
      BlockType.animation,
      order: 0,
    ).copyWith(content: const AnimationContent());
    final course = _buildCourseWithBlock(block);
    final json = course.toJson();
    final lessons = json['lessons'] as List<dynamic>;
    final lesson = lessons.first as Map<String, dynamic>;
    final lessonPages = lesson['pages'] as List<dynamic>;
    final lessonPage = lessonPages.first as Map<String, dynamic>;
    final blocks = lessonPage['blocks'] as List<dynamic>;
    final blockJson = blocks.first as Map<String, dynamic>;
    final content = blockJson['content'] as Map<String, dynamic>;
    content['preset'] = 'unknown';
    content['durationMs'] = 'fast';
    content['speed'] = -2;

    final result = CourseSchemaValidator.validateJsonMap(
      json,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.preset'),
      ),
      isTrue,
    );
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.durationMs'),
      ),
      isTrue,
    );
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.speed'),
      ),
      isTrue,
    );
  });

  test('animation configuration is preserved by export/import', () {
    final block = Block.create(BlockType.animation, order: 0).copyWith(
      content: const AnimationContent(
        preset: AnimationContent.presetPulseBars,
        durationMs: 2400,
        loop: false,
        speed: 1.75,
      ),
    );
    final course = _buildCourseWithBlock(block);

    final exported = CourseExport.exportToJson(course);
    final imported = CourseImport.importFromString(exported);

    expect(imported.success, isTrue);
    final restored = imported.course!;
    final restoredBlock = restored.lessons.first.pages.first.blocks.first;
    expect(restoredBlock.type, BlockType.animation);
    final content = restoredBlock.content as AnimationContent;
    expect(content.preset, AnimationContent.presetPulseBars);
    expect(content.durationMs, 2400);
    expect(content.loop, isFalse);
    expect(content.speed, 1.75);
  });

  test('function-flow invalid edge reports actionable path', () {
    final block = Block.create(BlockType.functionFlow, order: 0).copyWith(
      content: const FunctionFlowContent(
        title: 'Flow',
        nodes: [
          FunctionFlowNode(
            id: 'start',
            label: 'Start',
            x: 10,
            y: 50,
            kind: FunctionFlowNode.kindStart,
          ),
          FunctionFlowNode(
            id: 'end',
            label: 'End',
            x: 90,
            y: 50,
            kind: FunctionFlowNode.kindEnd,
          ),
        ],
        edges: [FunctionFlowEdge(from: 'start', to: 'missing-node')],
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.edges[0].to'),
      ),
      isTrue,
    );
  });

  test('code-execution invalid line reports actionable path', () {
    final block = Block.create(BlockType.codeExecution, order: 0).copyWith(
      content: const CodeExecutionContent(
        title: 'Execution',
        language: 'python',
        sourceCode: 'x = 1\\nprint(x)',
        traceSteps: [
          CodeExecutionTraceStep(line: 1, variables: {'x': 1}),
          CodeExecutionTraceStep(line: 5, variables: {'x': 1}),
        ],
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.trace_steps[1].line'),
      ),
      isTrue,
    );
  });

  test('code-execution invalid checkpoint indexes report actionable path', () {
    final block = Block.create(BlockType.codeExecution, order: 0).copyWith(
      content: const CodeExecutionContent(
        title: 'Execution',
        language: 'python',
        sourceCode: 'x = 1\\nprint(x)',
        traceSteps: [
          CodeExecutionTraceStep(line: 1, variables: {'x': 1}),
          CodeExecutionTraceStep(
            line: 2,
            stdoutDelta: '1',
            variables: {'x': 1},
          ),
        ],
        checkpoints: [
          CodeExecutionCheckpoint(
            stepIndex: 5,
            question: 'What prints?',
            options: ['0', '1'],
            correctIndex: 4,
          ),
        ],
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(
          r'$.lessons[0].pages[0].blocks[0].content.checkpoints[0].step_index',
        ),
      ),
      isTrue,
    );
    expect(
      result.errorMessages.any(
        (e) => e.contains(
          r'$.lessons[0].pages[0].blocks[0].content.checkpoints[0].correct_index',
        ),
      ),
      isTrue,
    );
  });

  test('matching graph invalid edge reports actionable path', () {
    final block = Block.create(BlockType.matching, order: 0).copyWith(
      content: const MatchingContent(
        question: 'Graph match',
        mode: MatchingContent.modeGraph,
        nodes: [
          MatchingNode(id: 'a', label: 'A', x: 20, y: 50),
          MatchingNode(id: 'b', label: 'B', x: 80, y: 50),
        ],
        edges: [MatchingEdge(from: 'a', to: 'missing', directed: true)],
        rules: MatchingRules(directed: true),
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.edges[0].to'),
      ),
      isTrue,
    );
  });

  test('matching graph one-to-one conflict reports edge path', () {
    final block = Block.create(BlockType.matching, order: 0).copyWith(
      content: const MatchingContent(
        question: 'Graph match',
        mode: MatchingContent.modeGraph,
        nodes: [
          MatchingNode(id: 'a', label: 'A', x: 20, y: 50),
          MatchingNode(id: 'b', label: 'B', x: 60, y: 30),
          MatchingNode(id: 'c', label: 'C', x: 60, y: 70),
        ],
        edges: [
          MatchingEdge(from: 'a', to: 'b', directed: true),
          MatchingEdge(from: 'a', to: 'c', directed: true),
        ],
        rules: MatchingRules(
          allowOneToMany: false,
          allowManyToMany: false,
          directed: true,
        ),
      ),
    );
    final course = _buildCourseWithBlock(block);

    final result = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.export,
    );

    expect(result.isValid, isFalse);
    expect(
      result.errorMessages.any(
        (e) => e.contains(r'$.lessons[0].pages[0].blocks[0].content.edges[1]'),
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
  return _buildCourseWithBlock(block);
}

Course _buildCourseWithBlock(Block block) {
  final lesson = CourseLesson.create(title: 'Lesson 1').addBlock(block);
  return Course.create(title: 'Validation Test').copyWith(lessons: [lesson]);
}
