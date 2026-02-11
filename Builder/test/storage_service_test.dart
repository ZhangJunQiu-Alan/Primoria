import 'package:builder/models/models.dart';
import 'package:builder/services/storage_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await StorageService.init();
  });

  test('saves and loads per-course browser draft', () async {
    final course = Course.create(title: 'Draft Course');
    const courseId = 'course-abc';

    final saved = await StorageService.saveCourseDraft(courseId, course);
    final loaded = await StorageService.loadCourseDraft(courseId);

    expect(saved, isTrue);
    expect(loaded, isNotNull);
    expect(loaded!.metadata.title, 'Draft Course');
  });

  test('drafts are isolated per course', () async {
    final courseA = Course.create(title: 'Draft A');
    final courseB = Course.create(title: 'Draft B');

    await StorageService.saveCourseDraft('course-a', courseA);
    await StorageService.saveCourseDraft('course-b', courseB);

    final loadedA = await StorageService.loadCourseDraft('course-a');
    final loadedB = await StorageService.loadCourseDraft('course-b');

    expect(loadedA!.metadata.title, 'Draft A');
    expect(loadedB!.metadata.title, 'Draft B');
  });

  test('clears per-course browser draft', () async {
    final course = Course.create(title: 'Draft to clear');
    const courseId = 'course-clear';

    await StorageService.saveCourseDraft(courseId, course);
    final removed = await StorageService.clearCourseDraft(courseId);
    final exists = await StorageService.hasCourseDraft(courseId);

    expect(removed, isTrue);
    expect(exists, isFalse);
  });
}
