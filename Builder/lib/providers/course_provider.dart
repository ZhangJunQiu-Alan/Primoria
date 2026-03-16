import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/id_generator.dart';

/// Course state notifier
class CourseNotifier extends StateNotifier<Course> {
  CourseNotifier() : super(Course.create(title: 'Untitled Lesson'));

  /// Get current lesson
  CourseLesson? getCurrentLesson(int lessonIndex) {
    return state.getLesson(lessonIndex);
  }

  /// Add block to a specific page within a lesson
  void addBlock(int lessonIndex, BlockType type, {int pageIndex = 0}) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final page =
        (pageIndex >= 0 && pageIndex < lesson.pages.length)
            ? lesson.pages[pageIndex]
            : null;
    if (page == null) return;

    final newBlock = BlockRegistry.createBlock(type, order: page.blocks.length);
    final updatedLesson = lesson.addBlock(newBlock, pageIndex: pageIndex);
    state = state.updateLesson(updatedLesson);
  }

  /// Remove block from a specific page
  void removeBlock(int lessonIndex, String blockId, {int pageIndex = 0}) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.removeBlock(blockId, pageIndex: pageIndex);
    state = state.updateLesson(updatedLesson);
  }

  /// Update block in a specific page
  void updateBlock(int lessonIndex, Block updatedBlock, {int pageIndex = 0}) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.updateBlock(updatedBlock, pageIndex: pageIndex);
    state = state.updateLesson(updatedLesson);
  }

  /// Reorder blocks in a specific page
  void reorderBlocks(
    int lessonIndex,
    int oldIndex,
    int newIndex, {
    int pageIndex = 0,
  }) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.reorderBlocks(
      oldIndex,
      newIndex,
      pageIndex: pageIndex,
    );
    state = state.updateLesson(updatedLesson);
  }

  /// Add a new page to a lesson (only if current page has ≥1 block)
  /// Returns true if page was added, false if validation failed.
  bool addPage(int lessonIndex, int currentPageIndex) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return false;

    // Require at least one block on the current page
    final currentPage =
        (currentPageIndex >= 0 && currentPageIndex < lesson.pages.length)
            ? lesson.pages[currentPageIndex]
            : null;
    if (currentPage == null || currentPage.blocks.isEmpty) return false;

    state = state.updateLesson(lesson.addPage());
    return true;
  }

  /// Remove a page from a lesson
  void removePage(int lessonIndex, int pageIndex) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    state = state.updateLesson(lesson.removePage(pageIndex));
  }

  /// Update course title
  void updateTitle(String title) {
    state = state.updateMetadata((meta) => meta.copyWith(title: title));
  }

  /// Add new lesson
  void addLesson({String? title}) {
    final lessonTitle = title ?? 'Lesson ${state.lessons.length + 1}';
    state = state.addLesson(CourseLesson.create(title: lessonTitle));
  }

  /// Remove lesson (by index)
  void removeLesson(int lessonIndex) {
    if (state.lessons.length <= 1) return;
    if (lessonIndex < 0 || lessonIndex >= state.lessons.length) return;

    final lessonId = state.lessons[lessonIndex].lessonId;
    state = state.removeLesson(lessonId);
  }

  /// Duplicate lesson
  void duplicateLesson(int lessonIndex) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    // Duplicate all pages with new IDs
    final duplicatedPages = lesson.pages.map((page) {
      return page.copyWith(
        pageId: IdGenerator.pageId(),
        blocks: page.blocks
            .map((block) => block.copyWith(id: IdGenerator.generate()))
            .toList(),
      );
    }).toList();

    final duplicatedLesson = CourseLesson(
      lessonId: IdGenerator.lessonId(),
      title: '${lesson.title} (Copy)',
      pages: duplicatedPages,
    );

    final lessons = List<CourseLesson>.from(state.lessons);
    lessons.insert(lessonIndex + 1, duplicatedLesson);
    state = state.copyWith(lessons: lessons);
  }

  /// Update lesson title
  void updateLessonTitle(int lessonIndex, String title) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.copyWith(title: title);
    state = state.updateLesson(updatedLesson);
  }

  /// Load course
  void loadCourse(Course course) {
    state = course;
  }

  /// Create new course
  void createNewCourse({String title = 'Untitled Lesson'}) {
    state = Course.create(title: title);
  }
}

/// Course provider
final courseProvider = StateNotifierProvider<CourseNotifier, Course>((ref) {
  return CourseNotifier();
});

/// Blocks for a specific (lessonIndex, pageIndex) pair.
final currentPageBlocksProvider =
    Provider.family<List<Block>, (int, int)>((ref, args) {
      final (lessonIndex, pageIndex) = args;
      final course = ref.watch(courseProvider);
      final lesson = course.getLesson(lessonIndex);
      if (lesson == null) return [];
      if (pageIndex < 0 || pageIndex >= lesson.pages.length) return [];
      return lesson.pages[pageIndex].blocks;
    });

/// Sorted blocks for a specific (lessonIndex, pageIndex) pair.
final sortedPageBlocksProvider =
    Provider.family<List<Block>, (int, int)>((ref, args) {
      final blocks = ref.watch(currentPageBlocksProvider(args));
      final sorted = List<Block>.from(blocks)
        ..sort((a, b) => a.position.order.compareTo(b.position.order));
      return sorted;
    });

