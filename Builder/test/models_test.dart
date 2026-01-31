import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:builder/models/models.dart';
import 'package:builder/services/id_generator.dart';

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
      final copied = block.copyWith(
        position: BlockPosition(order: 5),
      );

      expect(copied.id, block.id);
      expect(copied.type, block.type);
      expect(copied.position.order, 5);
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
        explanation: 'Basic arithmetic',
        multiSelect: false,
      );
      final json = content.toJson();

      expect(json['question'], 'What is 2+2?');
      expect(json['options'].length, 3);
      expect(json['correctAnswer'], 'b');
      expect(json['explanation'], 'Basic arithmetic');
    });
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
}
