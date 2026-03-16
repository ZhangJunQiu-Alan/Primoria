import 'dart:typed_data';

import 'package:builder/services/ai_course_generator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AI generation diagnostics', () {
    test('records prompt version metadata on preflight failure', () async {
      AICourseGenerator.setApiKey('');

      final result = await AICourseGenerator.generateFromPdf(
        pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46]),
        fileName: 'test.pdf',
      );

      expect(result.success, isFalse);
      expect(result.diagnostics, isNotNull);
      expect(
        result.diagnostics!.promptVersion,
        AICourseGenerator.promptVersion,
      );
      expect(result.diagnostics!.stage, 'preflight');
      expect(
        result.diagnostics!.parseResult,
        AIGenerationParseResult.notAttempted,
      );
    });

    test('marks custom prompt source in diagnostics', () async {
      AICourseGenerator.setApiKey('');

      final result = await AICourseGenerator.generateFromPdf(
        pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46]),
        fileName: 'test.pdf',
        customPrompt: 'Return JSON only.',
      );

      expect(result.success, isFalse);
      expect(result.diagnostics, isNotNull);
      expect(result.diagnostics!.promptSource, 'custom');
      expect(result.diagnostics!.promptFingerprint, isNotEmpty);
    });

    test('counts generated blocks from nested lesson pages', () {
      final count = AICourseGenerator.debugCountGeneratedBlocksForTesting([
        {
          'lessonId': 'l1',
          'title': 'Nested',
          'pages': [
            {
              'pageId': 'p1',
              'blocks': [
                {
                  'id': 'b1',
                  'type': 'text',
                  'content': {'value': 'hello'},
                },
              ],
            },
            {
              'pageId': 'p2',
              'blocks': [
                {
                  'id': 'b2',
                  'type': 'animation',
                  'content': {'preset': 'pulse-bars'},
                },
              ],
            },
          ],
        },
      ]);

      expect(count, 2);
    });

    test('counts generated blocks from legacy flat lesson blocks', () {
      final count = AICourseGenerator.debugCountGeneratedBlocksForTesting([
        {
          'lessonId': 'l1',
          'title': 'Flat',
          'blocks': [
            {
              'id': 'b1',
              'type': 'text',
              'content': {'value': 'hello'},
            },
            {
              'id': 'b2',
              'type': 'multiple-choice',
              'content': {
                'question': 'Q',
                'options': [
                  {'id': 'a', 'text': 'A'},
                ],
                'correctAnswer': 'a',
              },
            },
          ],
        },
      ]);

      expect(count, 2);
    });
  });
}
