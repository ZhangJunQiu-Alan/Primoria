import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:builder/features/dashboard/tabs/course_manage_tab.dart';
import 'package:builder/l10n/app_localizations.dart';

void main() {
  Widget buildHost({
    required BuilderLocalizations t,
    required bool isLoggedIn,
    required bool isLoading,
    String? loadError,
    required List<Map<String, dynamic>> courses,
    required Map<String, List<String>> courseLessons,
    required String sortOrder,
    required ValueChanged<String> onSortChanged,
    required Future<void> Function() onRefresh,
    required VoidCallback onSignIn,
    required VoidCallback onCreateCourse,
    required VoidCallback onAiGenerate,
    required void Function(String courseId, String courseTitle) onOpenCourse,
    required ValueChanged<Map<String, dynamic>> onEditCourse,
    required void Function(String courseId, String title) onDeleteCourse,
    required void Function(
      String courseId,
      String courseTitle,
      int lessonIndex,
      String lessonTitle,
    )
    onOpenLesson,
    required void Function(String courseId, int lessonIndex, String lessonTitle)
    onDeleteLesson,
    required void Function(String courseId, String courseTitle) onAddLesson,
    required Future<void> Function(String courseId) onEnsureLessonsLoaded,
    required String Function(String rawTitle, String courseTitle)
    formatLessonTitle,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: DashboardCourseManageTab(
          t: t,
          isLoggedIn: isLoggedIn,
          isLoading: isLoading,
          loadError: loadError,
          courses: courses,
          courseLessons: courseLessons,
          sortOrder: sortOrder,
          onSortChanged: onSortChanged,
          onRefresh: onRefresh,
          onSignIn: onSignIn,
          onCreateCourse: onCreateCourse,
          onAiGenerate: onAiGenerate,
          onOpenCourse: onOpenCourse,
          onEditCourse: onEditCourse,
          onDeleteCourse: onDeleteCourse,
          onOpenLesson: onOpenLesson,
          onDeleteLesson: onDeleteLesson,
          onAddLesson: onAddLesson,
          onEnsureLessonsLoaded: onEnsureLessonsLoaded,
          formatLessonTitle: formatLessonTitle,
        ),
      ),
    );
  }

  group('DashboardCourseManageTab', () {
    testWidgets('shows sign-in prompt when user is not logged in', (
      tester,
    ) async {
      final t = BuilderLocalizations('en');
      var signInTapped = false;

      await tester.pumpWidget(
        buildHost(
          t: t,
          isLoggedIn: false,
          isLoading: false,
          courses: const [],
          courseLessons: const {},
          sortOrder: 'time',
          onSortChanged: (_) {},
          onRefresh: () async {},
          onSignIn: () => signInTapped = true,
          onCreateCourse: () {},
          onAiGenerate: () {},
          onOpenCourse: (_, __) {},
          onEditCourse: (_) {},
          onDeleteCourse: (_, __) {},
          onOpenLesson: (_, __, ___, ____) {},
          onDeleteLesson: (_, __, ___) {},
          onAddLesson: (_, __) {},
          onEnsureLessonsLoaded: (_) async {},
          formatLessonTitle: (raw, _) => raw,
        ),
      );

      expect(find.text(t.signInToManage), findsOneWidget);
      expect(find.text(t.signIn), findsOneWidget);

      await tester.tap(find.text(t.signIn));
      await tester.pump();

      expect(signInTapped, isTrue);
    });

    testWidgets('shows empty state and allows creating first course', (
      tester,
    ) async {
      final t = BuilderLocalizations('en');
      var createTapped = false;

      await tester.pumpWidget(
        buildHost(
          t: t,
          isLoggedIn: true,
          isLoading: false,
          courses: const [],
          courseLessons: const {},
          sortOrder: 'time',
          onSortChanged: (_) {},
          onRefresh: () async {},
          onSignIn: () {},
          onCreateCourse: () => createTapped = true,
          onAiGenerate: () {},
          onOpenCourse: (_, __) {},
          onEditCourse: (_) {},
          onDeleteCourse: (_, __) {},
          onOpenLesson: (_, __, ___, ____) {},
          onDeleteLesson: (_, __, ___) {},
          onAddLesson: (_, __) {},
          onEnsureLessonsLoaded: (_) async {},
          formatLessonTitle: (raw, _) => raw,
        ),
      );

      expect(find.text(t.noCoursesYet), findsOneWidget);
      expect(find.text(t.createCourse), findsOneWidget);

      await tester.tap(find.text(t.createCourse).first);
      await tester.pump();

      expect(createTapped, isTrue);
    });

    testWidgets('renders a course card and triggers lesson-related callbacks', (
      tester,
    ) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.binding.setSurfaceSize(const Size(1600, 2000));

      final t = BuilderLocalizations('en');
      const courseId = 'course-1';
      const courseTitle = 'Web Fundamentals';
      final ensured = <String>[];
      final openedCourses = <String>[];
      final openedLessons = <String>[];
      final addedLessons = <String>[];

      final course = <String, dynamic>{
        'id': courseId,
        'title': courseTitle,
        'description': 'Intro course',
        'status': 'published',
        'difficulty_level': 'beginner',
        'estimated_minutes': 90,
        'price_tier': 'free',
        'price': 0,
        'updated_at': DateTime.now().toIso8601String(),
      };

      await tester.pumpWidget(
        buildHost(
          t: t,
          isLoggedIn: true,
          isLoading: false,
          courses: [course],
          courseLessons: const {
            courseId: ['Lesson A', 'Lesson B'],
          },
          sortOrder: 'time',
          onSortChanged: (_) {},
          onRefresh: () async {},
          onSignIn: () {},
          onCreateCourse: () {},
          onAiGenerate: () {},
          onOpenCourse: (id, title) => openedCourses.add('$id:$title'),
          onEditCourse: (_) {},
          onDeleteCourse: (_, __) {},
          onOpenLesson: (id, _, index, lessonTitle) =>
              openedLessons.add('$id:$index:$lessonTitle'),
          onDeleteLesson: (_, __, ___) {},
          onAddLesson: (id, title) => addedLessons.add('$id:$title'),
          onEnsureLessonsLoaded: (id) async => ensured.add(id),
          formatLessonTitle: (raw, _) => raw,
        ),
      );

      await tester.pump();

      expect(find.text(courseTitle), findsOneWidget);
      expect(find.text(t.courseManageOpenBuilder), findsOneWidget);
      expect(ensured, isEmpty);

      await tester.tap(find.text(t.courseManageOpenBuilder));
      await tester.pump();
      expect(openedCourses, equals(['$courseId:$courseTitle']));

      await tester.tap(find.text('Lesson A'));
      await tester.pump();
      expect(openedLessons, equals(['$courseId:0:Lesson A']));

      await tester.tap(find.text(t.addLesson));
      await tester.pump();
      expect(addedLessons, equals(['$courseId:$courseTitle']));
    });

    testWidgets('requests lesson loading when cache is missing', (
      tester,
    ) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.binding.setSurfaceSize(const Size(1400, 1400));

      final t = BuilderLocalizations('en');
      const courseId = 'course-missing-cache';
      final ensured = <String>[];

      final course = <String, dynamic>{
        'id': courseId,
        'title': 'Course A',
        'description': '',
        'status': 'draft',
        'difficulty_level': 'beginner',
        'estimated_minutes': 0,
        'price_tier': 'free',
        'price': 0,
        'updated_at': DateTime.now().toIso8601String(),
      };

      await tester.pumpWidget(
        buildHost(
          t: t,
          isLoggedIn: true,
          isLoading: false,
          courses: [course],
          courseLessons: const {},
          sortOrder: 'time',
          onSortChanged: (_) {},
          onRefresh: () async {},
          onSignIn: () {},
          onCreateCourse: () {},
          onAiGenerate: () {},
          onOpenCourse: (_, __) {},
          onEditCourse: (_) {},
          onDeleteCourse: (_, __) {},
          onOpenLesson: (_, __, ___, ____) {},
          onDeleteLesson: (_, __, ___) {},
          onAddLesson: (_, __) {},
          onEnsureLessonsLoaded: (id) async => ensured.add(id),
          formatLessonTitle: (raw, _) => raw,
        ),
      );

      await tester.pump();

      expect(ensured, contains(courseId));
    });
  });
}
