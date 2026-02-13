import 'dart:convert';
import 'dart:io';

import 'package:builder/models/models.dart';
import 'package:builder/services/course_export.dart';
import 'package:builder/services/course_import.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Course schema migration', () {
    test('migrates unversioned camelCase legacy fixture', () {
      final json = _readFixture('legacy_unversioned_camelcase.json');
      final result = CourseImport.importFromString(json);

      expect(result.success, isTrue);
      expect(result.course, isNotNull);
      expect(result.migration, isNotNull);
      expect(result.migration!.wasMigrated, isTrue);
      expect(result.migration!.sourceVersion, 'legacy-unversioned');
      expect(result.migration!.targetVersion, Course.schemaVersion);

      final course = result.course!;
      expect(course.pages.length, 1);
      expect(
        course.pages.first.blocks.any(
          (b) => b.type == BlockType.codePlayground,
        ),
        isTrue,
      );
      expect(
        course.pages.first.blocks.any(
          (b) => b.type == BlockType.multipleChoice,
        ),
        isTrue,
      );
    });

    test('migrates 0.9 modules alias fixture', () {
      final json = _readFixture('legacy_v0_9_modules_alias.json');
      final result = CourseImport.importFromString(json);

      expect(result.success, isTrue);
      expect(result.course, isNotNull);
      expect(result.migration, isNotNull);
      expect(result.migration!.wasMigrated, isTrue);
      expect(result.migration!.sourceVersion, '0.9.0');

      final course = result.course!;
      expect(course.pages.length, 1);
      expect(course.pages.first.title, 'Legacy Module');
      expect(
        course.pages.first.blocks.any((b) => b.type == BlockType.codeBlock),
        isTrue,
      );
      expect(
        course.pages.first.blocks.any((b) => b.type == BlockType.trueFalse),
        isTrue,
      );
      expect(
        course.pages.first.blocks.any((b) => b.type == BlockType.text),
        isTrue,
      );
    });

    test('migration failure is explicit for unsupported schemaVersion', () {
      final unsupported = {
        r'$schema': Course.schemaUrl,
        'schemaVersion': '9.0.0',
        'courseId': 'future-course',
        'metadata': {'title': 'Future Course'},
        'pages': [
          {'pageId': 'p1', 'title': 'Page 1', 'blocks': []},
        ],
      };

      final result = CourseImport.importFromString(jsonEncode(unsupported));
      expect(result.success, isFalse);
      expect(result.message, contains('Migration failed'));
      expect(result.message, contains('Unsupported schemaVersion'));
      expect(result.migration, isNotNull);
      expect(result.migration!.success, isFalse);
      expect(result.migration!.steps, isNotEmpty);
    });

    test('legacy fixture passes compatibility check via validateJson', () {
      final json = _readFixture('legacy_unversioned_camelcase.json');
      final result = CourseImport.validateJson(json);

      expect(result.isValid, isTrue);
      expect(
        result.warnings.any((w) => w.contains('Migration applied')),
        isTrue,
      );
    });

    test('new export includes schema metadata after migration', () {
      final json = _readFixture('legacy_unversioned_camelcase.json');
      final imported = CourseImport.importFromString(json);
      expect(imported.success, isTrue);

      final exportedJson =
          jsonDecode(CourseExport.exportToJson(imported.course!))
              as Map<String, dynamic>;

      expect(exportedJson[r'$schema'], Course.schemaUrl);
      expect(exportedJson['schemaVersion'], Course.schemaVersion);
    });
  });
}

String _readFixture(String fileName) {
  return File('test/fixtures/$fileName').readAsStringSync();
}
