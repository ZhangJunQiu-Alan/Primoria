import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:builder/models/models.dart';
import 'package:builder/services/id_generator.dart';
import 'package:builder/services/course_export.dart';

void main() {
  group('Block Model', () {
    test('Block.create generates valid block with ID', () {
      final block = Block.create(BlockType.text, order: 0);

      expect(block.id, isNotEmpty);
      expect(block.type, BlockType.text);
      expect(block.position.order, 0);
      expect(block.content, isA<TextContent>());
    });

    test('Block JSON serialization roundtrip', () {
      final block = Block.create(BlockType.text, order: 1);
      final json = block.toJson();
      final restored = Block.fromJson(json);

      expect(restored.id, block.id);
      expect(restored.type, block.type);
      expect(restored.position.order, block.position.order);
    });

    test('Block copyWith preserves values', () {
      final block = Block.create(BlockType.text, order: 0);
      final copied = block.copyWith(position: BlockPosition(order: 5));

      expect(copied.id, block.id);
      expect(copied.type, block.type);
      expect(copied.position.order, 5);
    });

    test('Block.create defaults visibilityRule to always', () {
      final block = Block.create(BlockType.text, order: 0);
      expect(block.visibilityRule, 'always');
    });

    test('Block visibilityRule serializes to JSON', () {
      final block = Block.create(
        BlockType.text,
        order: 0,
      ).copyWith(visibilityRule: 'afterPreviousCorrect');
      final json = block.toJson();

      expect(json['visibilityRule'], 'afterPreviousCorrect');
    });

    test('Block visibilityRule deserializes from JSON', () {
      final block = Block.create(BlockType.text, order: 0);
      final json = block.toJson();
      json['visibilityRule'] = 'afterPreviousCorrect';
      final restored = Block.fromJson(json);

      expect(restored.visibilityRule, 'afterPreviousCorrect');
    });

    test('Block visibilityRule defaults to always when missing from JSON', () {
      final block = Block.create(BlockType.text, order: 0);
      final json = block.toJson();
      json.remove('visibilityRule');
      final restored = Block.fromJson(json);

      expect(restored.visibilityRule, 'always');
    });

    test('Block copyWith updates visibilityRule', () {
      final block = Block.create(BlockType.text, order: 0);
      final updated = block.copyWith(visibilityRule: 'afterPreviousCorrect');

      expect(updated.visibilityRule, 'afterPreviousCorrect');
      expect(updated.id, block.id);
    });

    test('Block JSON roundtrip preserves visibilityRule', () {
      final block = Block.create(
        BlockType.multipleChoice,
        order: 0,
      ).copyWith(visibilityRule: 'afterPreviousCorrect');
      final json = block.toJson();
      final restored = Block.fromJson(json);

      expect(restored.visibilityRule, 'afterPreviousCorrect');
      expect(restored.type, BlockType.multipleChoice);
    });
  });

  group('TextContent', () {
    test('TextContent serialization', () {
      const content = TextContent(format: 'markdown', value: '# Hello');
      final json = content.toJson();

      expect(json['format'], 'markdown');
      expect(json['value'], '# Hello');
    });

    test('TextContent deserialization', () {
      final json = {'format': 'plain', 'value': 'Test text'};
      final content = TextContent.fromJson(json);

      expect(content.format, 'plain');
      expect(content.value, 'Test text');
    });

    test('TextContent defaults to markdown format', () {
      const content = TextContent(value: 'some text');
      expect(content.format, 'markdown');
    });

    test('TextContent copyWith switches format', () {
      const content = TextContent(format: 'plain', value: 'hello');
      final switched = content.copyWith(format: 'markdown');

      expect(switched.format, 'markdown');
      expect(switched.value, 'hello');
    });

    test('TextContent roundtrip preserves format', () {
      const content = TextContent(format: 'plain', value: 'plain text');
      final json = content.toJson();
      final restored = TextContent.fromJson(json);

      expect(restored.format, 'plain');
      expect(restored.value, 'plain text');
    });

    test('TextContent fromJson defaults format to markdown when missing', () {
      final json = {'value': 'no format field'};
      final content = TextContent.fromJson(json);

      expect(content.format, 'markdown');
      expect(content.value, 'no format field');
    });

    test('TextContent handles markdown syntax in value', () {
      const mdValue =
          '# Heading\n\n**bold** and *italic*\n\n- item 1\n- item 2\n\n`code`';
      const content = TextContent(format: 'markdown', value: mdValue);
      final json = content.toJson();
      final restored = TextContent.fromJson(json);

      expect(restored.format, 'markdown');
      expect(restored.value, mdValue);
    });

    test('TextContent handles malformed markdown without error', () {
      const malformed =
          '# Unclosed **bold\n\n```\nno closing fence\n\n[broken link(';
      const content = TextContent(format: 'markdown', value: malformed);
      final json = content.toJson();
      final restored = TextContent.fromJson(json);

      expect(restored.value, malformed);
      expect(restored.format, 'markdown');
    });
  });

  group('CodePlaygroundContent', () {
    test('CodePlaygroundContent serialization', () {
      const content = CodePlaygroundContent(
        language: 'python',
        initialCode: 'print("Hello")',
        expectedOutput: 'Hello',
        hints: ['Use print function'],
        runnable: true,
      );
      final json = content.toJson();

      expect(json['language'], 'python');
      expect(json['initialCode'], 'print("Hello")');
      expect(json['expectedOutput'], 'Hello');
      expect(json['hints'], ['Use print function']);
      expect(json['runnable'], true);
    });

    test('CodePlaygroundContent deserialization', () {
      final json = {
        'language': 'javascript',
        'initialCode': 'console.log("Hi")',
        'expectedOutput': 'Hi',
        'hints': [],
        'runnable': false,
      };
      final content = CodePlaygroundContent.fromJson(json);

      expect(content.language, 'javascript');
      expect(content.initialCode, 'console.log("Hi")');
      expect(content.expectedOutput, 'Hi');
      expect(content.runnable, false);
    });
  });

  group('AnimationContent', () {
    test('AnimationContent serialization', () {
      const content = AnimationContent(
        preset: AnimationContent.presetPulseBars,
        durationMs: 1800,
        loop: false,
        speed: 1.5,
      );
      final json = content.toJson();

      expect(json['preset'], AnimationContent.presetPulseBars);
      expect(json['durationMs'], 1800);
      expect(json['loop'], false);
      expect(json['speed'], 1.5);
    });

    test('AnimationContent deserialization with normalization', () {
      final json = {
        'preset': 'unknown-preset',
        'durationMs': 120,
        'loop': true,
        'speed': 10,
      };
      final content = AnimationContent.fromJson(json);

      expect(content.preset, AnimationContent.presetBouncingDot);
      expect(content.durationMs, 300);
      expect(content.loop, isTrue);
      expect(content.speed, 3.0);
    });

    test('Block.create animation uses AnimationContent defaults', () {
      final block = Block.create(BlockType.animation, order: 0);

      expect(block.content, isA<AnimationContent>());
      final content = block.content as AnimationContent;
      expect(content.preset, AnimationContent.presetBouncingDot);
      expect(content.durationMs, 2000);
      expect(content.loop, isTrue);
      expect(content.speed, 1.0);
    });
  });

  group('MultipleChoiceContent', () {
    test('MultipleChoiceContent serialization', () {
      final content = MultipleChoiceContent(
        question: 'What is 2+2?',
        options: [
          const ChoiceOption(id: 'a', text: '3'),
          const ChoiceOption(id: 'b', text: '4'),
          const ChoiceOption(id: 'c', text: '5'),
        ],
        correctAnswer: 'b',
        correctAnswers: ['b'],
        explanation: 'Basic arithmetic',
        multiSelect: false,
      );
      final json = content.toJson();

      expect(json['question'], 'What is 2+2?');
      expect(json['options'].length, 3);
      expect(json['correctAnswer'], 'b');
      expect(json['correctAnswers'], ['b']);
      expect(json['explanation'], 'Basic arithmetic');
    });

    test('MultipleChoiceContent fromJson supports multi-answer list', () {
      final json = {
        'question': 'Select prime numbers',
        'options': [
          {'id': 'a', 'text': '2'},
          {'id': 'b', 'text': '3'},
          {'id': 'c', 'text': '4'},
        ],
        'correctAnswers': ['b', 'a'],
        'multiSelect': true,
      };

      final content = MultipleChoiceContent.fromJson(json);
      expect(content.multiSelect, isTrue);
      expect(content.normalizedCorrectAnswers, ['b', 'a']);
      expect(content.primaryCorrectAnswer, 'b');
    });

    test(
      'MultipleChoiceContent fromJson falls back to legacy correctAnswer',
      () {
        final json = {
          'question': 'Fallback',
          'options': [
            {'id': 'a', 'text': 'A'},
            {'id': 'b', 'text': 'B'},
          ],
          'correctAnswer': 'a',
          'multiSelect': false,
        };

        final content = MultipleChoiceContent.fromJson(json);
        expect(content.normalizedCorrectAnswers, ['a']);
        expect(content.primaryCorrectAnswer, 'a');
      },
    );
  });

  group('CoursePage Model', () {
    test('CoursePage.create generates valid page', () {
      final page = CoursePage.create(title: 'Test Page');

      expect(page.pageId, isNotEmpty);
      expect(page.title, 'Test Page');
      expect(page.blocks, isEmpty);
    });

    test('CoursePage addBlock', () {
      final page = CoursePage.create(title: 'Test');
      final block = Block.create(BlockType.text, order: 0);
      final updated = page.addBlock(block);

      expect(updated.blocks.length, 1);
      expect(updated.blocks.first.id, block.id);
    });

    test('CoursePage removeBlock', () {
      final page = CoursePage.create(title: 'Test');
      final block = Block.create(BlockType.text, order: 0);
      final withBlock = page.addBlock(block);
      final removed = withBlock.removeBlock(block.id);

      expect(removed.blocks.length, 0);
    });

    test('CoursePage reorderBlocks', () {
      final page = CoursePage.create(title: 'Test');
      final block1 = Block.create(BlockType.text, order: 0);
      final block2 = Block.create(BlockType.image, order: 1);
      final withBlocks = page.addBlock(block1).addBlock(block2);
      final reordered = withBlocks.reorderBlocks(0, 1);

      expect(reordered.blocks[0].id, block2.id);
      expect(reordered.blocks[1].id, block1.id);
      expect(reordered.blocks[0].position.order, 0);
      expect(reordered.blocks[1].position.order, 1);
    });

    test('CoursePage JSON roundtrip', () {
      final page = CoursePage.create(title: 'Test Page');
      final block = Block.create(BlockType.text, order: 0);
      final withBlock = page.addBlock(block);

      final json = withBlock.toJson();
      final restored = CoursePage.fromJson(json);

      expect(restored.pageId, withBlock.pageId);
      expect(restored.title, withBlock.title);
      expect(restored.blocks.length, 1);
    });
  });

  group('Course Model', () {
    test('Course.create generates valid course', () {
      final course = Course.create(title: 'My Course');

      expect(course.courseId, isNotEmpty);
      expect(course.metadata.title, 'My Course');
      expect(course.pages.length, 1);
    });

    test('Course addPage', () {
      final course = Course.create(title: 'Test');
      final newPage = CoursePage.create(title: 'Page 2');
      final updated = course.addPage(newPage);

      expect(updated.pages.length, 2);
    });

    test('Course removePage', () {
      final course = Course.create(title: 'Test');
      final newPage = CoursePage.create(title: 'Page 2');
      final withPage = course.addPage(newPage);
      final removed = withPage.removePage(newPage.pageId);

      expect(removed.pages.length, 1);
    });

    test('Course getPage', () {
      final course = Course.create(title: 'Test');

      expect(course.getPage(0), isNotNull);
      expect(course.getPage(1), isNull);
      expect(course.getPage(-1), isNull);
    });

    test('Course JSON roundtrip', () {
      final course = Course.create(title: 'Full Course');
      final page = course.pages.first;
      final block = Block.create(BlockType.codePlayground, order: 0);
      final updatedPage = page.addBlock(block);
      final updatedCourse = course.updatePage(updatedPage);

      final json = updatedCourse.toJson();
      final jsonString = jsonEncode(json);
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      final restored = Course.fromJson(decoded);

      expect(restored.courseId, updatedCourse.courseId);
      expect(restored.metadata.title, 'Full Course');
      expect(restored.pages.length, 1);
      expect(restored.pages.first.blocks.length, 1);
      expect(restored.pages.first.blocks.first.type, BlockType.codePlayground);
    });

    test('Course JSON schema fields', () {
      final course = Course.create(title: 'Schema Test');
      final json = course.toJson();

      expect(json['\$schema'], isNotNull);
      expect(json['schemaVersion'], '1.0.0');
      expect(json['courseId'], isNotEmpty);
      expect(json['metadata'], isNotNull);
      expect(json['settings'], isNotNull);
      expect(json['pages'], isA<List>());
    });
  });

  group('IdGenerator', () {
    test('generates unique IDs', () {
      final ids = List.generate(100, (_) => IdGenerator.generate());
      final uniqueIds = ids.toSet();

      expect(uniqueIds.length, 100);
    });

    test('courseId has correct prefix', () {
      final id = IdGenerator.courseId();
      expect(id.startsWith('course-'), true);
    });

    test('pageId has correct prefix', () {
      final id = IdGenerator.pageId();
      expect(id.startsWith('page-'), true);
    });

    test('blockId has correct prefix', () {
      final id = IdGenerator.blockId();
      expect(id.startsWith('block-'), true);
    });
  });

  group('BlockType', () {
    test('BlockType values', () {
      expect(BlockType.text.value, 'text');
      expect(BlockType.image.value, 'image');
      expect(BlockType.codeBlock.value, 'code-block');
      expect(BlockType.codePlayground.value, 'code-playground');
      expect(BlockType.multipleChoice.value, 'multiple-choice');
    });

    test('BlockType fromValue', () {
      expect(BlockType.fromValue('text'), BlockType.text);
      expect(BlockType.fromValue('code-playground'), BlockType.codePlayground);
    });

    test('BlockType labels', () {
      expect(BlockType.text.label, isNotEmpty);
      expect(BlockType.codePlayground.label, isNotEmpty);
    });
  });

  group('MatchingContent', () {
    test('default values', () {
      const content = MatchingContent();
      expect(content.question, '');
      expect(content.leftItems, isEmpty);
      expect(content.rightItems, isEmpty);
      expect(content.correctPairs, isEmpty);
      expect(content.explanation, isNull);
    });

    test('fromJson parses correctly', () {
      final json = {
        'question': 'Match capitals',
        'leftItems': [
          {'id': 'l1', 'text': 'France'},
          {'id': 'l2', 'text': 'Germany'},
        ],
        'rightItems': [
          {'id': 'r1', 'text': 'Paris'},
          {'id': 'r2', 'text': 'Berlin'},
        ],
        'correctPairs': [
          {'leftId': 'l1', 'rightId': 'r1'},
          {'leftId': 'l2', 'rightId': 'r2'},
        ],
        'explanation': 'Geography basics',
      };

      final content = MatchingContent.fromJson(json);
      expect(content.question, 'Match capitals');
      expect(content.leftItems.length, 2);
      expect(content.rightItems.length, 2);
      expect(content.correctPairs.length, 2);
      expect(content.correctPairs[0].leftId, 'l1');
      expect(content.correctPairs[0].rightId, 'r1');
      expect(content.explanation, 'Geography basics');
    });

    test('toJson roundtrip', () {
      const content = MatchingContent(
        question: 'Test Q',
        leftItems: [
          MatchingItem(id: 'a', text: 'A'),
          MatchingItem(id: 'b', text: 'B'),
        ],
        rightItems: [
          MatchingItem(id: 'x', text: 'X'),
          MatchingItem(id: 'y', text: 'Y'),
        ],
        correctPairs: [
          MatchingPair(leftId: 'a', rightId: 'x'),
          MatchingPair(leftId: 'b', rightId: 'y'),
        ],
        explanation: 'Explanation',
      );

      final json = content.toJson();
      final restored = MatchingContent.fromJson(json);

      expect(restored.question, content.question);
      expect(restored.leftItems.length, content.leftItems.length);
      expect(restored.rightItems.length, content.rightItems.length);
      expect(restored.correctPairs.length, content.correctPairs.length);
      expect(restored.explanation, content.explanation);
    });

    test('copyWith updates fields', () {
      const original = MatchingContent(
        question: 'Original',
        leftItems: [MatchingItem(id: 'l1', text: 'L1')],
        rightItems: [MatchingItem(id: 'r1', text: 'R1')],
        correctPairs: [MatchingPair(leftId: 'l1', rightId: 'r1')],
      );

      final updated = original.copyWith(question: 'Updated');
      expect(updated.question, 'Updated');
      expect(updated.leftItems.length, 1);
      expect(updated.correctPairs.length, 1);
    });

    test('fromJson handles empty lists gracefully', () {
      final json = {'question': 'Empty'};
      final content = MatchingContent.fromJson(json);

      expect(content.question, 'Empty');
      expect(content.leftItems, isEmpty);
      expect(content.rightItems, isEmpty);
      expect(content.correctPairs, isEmpty);
    });

    test('fromJson handles null explanation', () {
      final json = {
        'question': 'Q',
        'leftItems': <dynamic>[],
        'rightItems': <dynamic>[],
        'correctPairs': <dynamic>[],
      };
      final content = MatchingContent.fromJson(json);
      expect(content.explanation, isNull);
    });
  });

  group('Export validation — Matching', () {
    Course buildCourseWithMatching(MatchingContent matchingContent) {
      final block = Block(
        id: 'b1',
        type: BlockType.matching,
        position: const BlockPosition(order: 0),
        style: const BlockStyle(),
        content: matchingContent,
      );
      final course = Course.create(title: 'Test Course');
      final page = course.pages.first.copyWith(blocks: [block]);
      return course.updatePage(page);
    }

    test('valid matching passes validation', () {
      final course = buildCourseWithMatching(
        const MatchingContent(
          question: 'Match these',
          leftItems: [
            MatchingItem(id: 'l1', text: 'A'),
            MatchingItem(id: 'l2', text: 'B'),
          ],
          rightItems: [
            MatchingItem(id: 'r1', text: 'X'),
            MatchingItem(id: 'r2', text: 'Y'),
          ],
          correctPairs: [
            MatchingPair(leftId: 'l1', rightId: 'r1'),
            MatchingPair(leftId: 'l2', rightId: 'r2'),
          ],
        ),
      );
      final result = CourseExport.validateForExport(course);
      expect(result.isValid, isTrue);
    });

    test('empty question fails', () {
      final course = buildCourseWithMatching(
        const MatchingContent(
          question: '',
          leftItems: [
            MatchingItem(id: 'l1', text: 'A'),
            MatchingItem(id: 'l2', text: 'B'),
          ],
          rightItems: [
            MatchingItem(id: 'r1', text: 'X'),
            MatchingItem(id: 'r2', text: 'Y'),
          ],
          correctPairs: [],
        ),
      );
      final result = CourseExport.validateForExport(course);
      expect(result.errors, contains(contains('question cannot be empty')));
    });

    test('fewer than 2 left items fails', () {
      final course = buildCourseWithMatching(
        const MatchingContent(
          question: 'Q',
          leftItems: [MatchingItem(id: 'l1', text: 'A')],
          rightItems: [
            MatchingItem(id: 'r1', text: 'X'),
            MatchingItem(id: 'r2', text: 'Y'),
          ],
          correctPairs: [],
        ),
      );
      final result = CourseExport.validateForExport(course);
      expect(result.errors, contains(contains('at least 2 left items')));
    });

    test('invalid pair reference fails', () {
      final course = buildCourseWithMatching(
        const MatchingContent(
          question: 'Q',
          leftItems: [
            MatchingItem(id: 'l1', text: 'A'),
            MatchingItem(id: 'l2', text: 'B'),
          ],
          rightItems: [
            MatchingItem(id: 'r1', text: 'X'),
            MatchingItem(id: 'r2', text: 'Y'),
          ],
          correctPairs: [
            MatchingPair(leftId: 'l1', rightId: 'r1'),
            MatchingPair(leftId: 'l999', rightId: 'r2'),
          ],
        ),
      );
      final result = CourseExport.validateForExport(course);
      expect(result.errors, contains(contains('unknown left id')));
    });
  });
}
