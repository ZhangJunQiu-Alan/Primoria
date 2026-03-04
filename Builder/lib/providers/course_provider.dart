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

  /// Add block to a lesson
  void addBlock(int lessonIndex, BlockType type) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final newBlock =
        BlockRegistry.createBlock(type, order: lesson.blocks.length);
    final updatedLesson = lesson.addBlock(newBlock);
    state = state.updateLesson(updatedLesson);
  }

  /// Remove block
  void removeBlock(int lessonIndex, String blockId) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.removeBlock(blockId);
    state = state.updateLesson(updatedLesson);
  }

  /// Update block
  void updateBlock(int lessonIndex, Block updatedBlock) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.updateBlock(updatedBlock);
    state = state.updateLesson(updatedLesson);
  }

  /// Reorder blocks
  void reorderBlocks(int lessonIndex, int oldIndex, int newIndex) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    final updatedLesson = lesson.reorderBlocks(oldIndex, newIndex);
    state = state.updateLesson(updatedLesson);
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
    if (state.lessons.length <= 1) return; // Keep at least one lesson
    if (lessonIndex < 0 || lessonIndex >= state.lessons.length) return;

    final lessonId = state.lessons[lessonIndex].lessonId;
    state = state.removeLesson(lessonId);
  }

  /// Duplicate lesson
  void duplicateLesson(int lessonIndex) {
    final lesson = state.getLesson(lessonIndex);
    if (lesson == null) return;

    // Create a duplicate and generate new IDs
    final duplicatedLesson =
        CourseLesson.create(title: '${lesson.title} (Copy)').copyWith(
      blocks: lesson.blocks
          .map((block) => block.copyWith(id: IdGenerator.generate()))
          .toList(),
    );

    // Insert after the original lesson
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

/// Current lesson blocks provider
final currentLessonBlocksProvider = Provider.family<List<Block>, int>((
  ref,
  lessonIndex,
) {
  final course = ref.watch(courseProvider);
  return course.getLesson(lessonIndex)?.blocks ?? [];
});
