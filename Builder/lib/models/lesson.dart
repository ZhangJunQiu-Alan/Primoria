import 'block.dart';
import 'lesson_page.dart';
import '../services/id_generator.dart';

/// Course lesson model — contains ordered pages, each holding blocks.
class CourseLesson {
  final String lessonId;
  final String title;
  final List<LessonPage> pages;

  const CourseLesson({
    required this.lessonId,
    required this.title,
    required this.pages,
  });

  /// Whether any page inside this lesson actually has blocks.
  bool get hasContent => pages.any((page) => page.blocks.isNotEmpty);

  /// Returns the first page index that contains blocks, or 0 if all are empty.
  int get firstNonEmptyPageIndex {
    final index = pages.indexWhere((page) => page.blocks.isNotEmpty);
    return index >= 0 ? index : 0;
  }

  /// Create a lesson with one empty page.
  factory CourseLesson.create({String title = 'New Lesson'}) {
    return CourseLesson(
      lessonId: IdGenerator.lessonId(),
      title: title,
      pages: [LessonPage.create(order: 0)],
    );
  }

  factory CourseLesson.fromJson(Map<String, dynamic> json) {
    final lessonId = (json['lessonId'] ?? json['pageId']) as String;
    final title = json['title'] as String? ?? '';

    // New format: has 'pages' key
    if (json.containsKey('pages') && json['pages'] is List) {
      final pages = (json['pages'] as List<dynamic>)
          .map((e) => LessonPage.fromJson(e as Map<String, dynamic>))
          .toList();
      return CourseLesson(
        lessonId: lessonId,
        title: title,
        pages: pages.isEmpty ? [LessonPage.create(order: 0)] : pages,
      );
    }

    // Legacy format: has 'blocks' key → wrap into first page
    final blocks =
        (json['blocks'] as List<dynamic>?)
            ?.map((e) => Block.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    return CourseLesson(
      lessonId: lessonId,
      title: title,
      pages: [
        LessonPage(pageId: IdGenerator.pageId(), order: 0, blocks: blocks),
      ],
    );
  }

  Map<String, dynamic> toJson() => {
    'lessonId': lessonId,
    'title': title,
    'pages': pages.map((p) => p.toJson()).toList(),
  };

  CourseLesson copyWith({
    String? lessonId,
    String? title,
    List<LessonPage>? pages,
  }) {
    return CourseLesson(
      lessonId: lessonId ?? this.lessonId,
      title: title ?? this.title,
      pages: pages ?? this.pages,
    );
  }

  // ---------------------------------------------------------------------------
  // Page-aware block operations
  // ---------------------------------------------------------------------------

  CourseLesson addBlock(Block block, {int pageIndex = 0}) {
    if (pageIndex < 0 || pageIndex >= pages.length) return this;
    final updated = [...pages];
    updated[pageIndex] = pages[pageIndex].addBlock(block);
    return copyWith(pages: updated);
  }

  CourseLesson removeBlock(String blockId, {int pageIndex = 0}) {
    if (pageIndex < 0 || pageIndex >= pages.length) return this;
    final updated = [...pages];
    updated[pageIndex] = pages[pageIndex].removeBlock(blockId);
    return copyWith(pages: updated);
  }

  CourseLesson updateBlock(Block updatedBlock, {int pageIndex = 0}) {
    if (pageIndex < 0 || pageIndex >= pages.length) return this;
    final updated = [...pages];
    updated[pageIndex] = pages[pageIndex].updateBlock(updatedBlock);
    return copyWith(pages: updated);
  }

  CourseLesson reorderBlocks(int oldIndex, int newIndex, {int pageIndex = 0}) {
    if (pageIndex < 0 || pageIndex >= pages.length) return this;
    final updated = [...pages];
    updated[pageIndex] = pages[pageIndex].reorderBlocks(oldIndex, newIndex);
    return copyWith(pages: updated);
  }

  // ---------------------------------------------------------------------------
  // Page management
  // ---------------------------------------------------------------------------

  CourseLesson addPage() {
    return copyWith(
      pages: [
        ...pages,
        LessonPage.create(order: pages.length),
      ],
    );
  }

  CourseLesson removePage(int pageIndex) {
    if (pages.length <= 1) return this;
    if (pageIndex < 0 || pageIndex >= pages.length) return this;
    final updated = [...pages]..removeAt(pageIndex);
    final reordered = updated.asMap().entries.map((e) {
      return e.value.copyWith(order: e.key);
    }).toList();
    return copyWith(pages: reordered);
  }
}
