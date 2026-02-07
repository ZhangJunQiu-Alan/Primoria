import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/id_generator.dart';

/// Course state notifier
class CourseNotifier extends StateNotifier<Course> {
  CourseNotifier() : super(Course.create());

  /// Get current page
  CoursePage? getCurrentPage(int pageIndex) {
    return state.getPage(pageIndex);
  }

  /// Add block to a page
  void addBlock(int pageIndex, BlockType type) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final newBlock = BlockRegistry.createBlock(type, order: page.blocks.length);
    final updatedPage = page.addBlock(newBlock);
    state = state.updatePage(updatedPage);
  }

  /// Remove block
  void removeBlock(int pageIndex, String blockId) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.removeBlock(blockId);
    state = state.updatePage(updatedPage);
  }

  /// Update block
  void updateBlock(int pageIndex, Block updatedBlock) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.updateBlock(updatedBlock);
    state = state.updatePage(updatedPage);
  }

  /// Reorder blocks
  void reorderBlocks(int pageIndex, int oldIndex, int newIndex) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.reorderBlocks(oldIndex, newIndex);
    state = state.updatePage(updatedPage);
  }

  /// Update course title
  void updateTitle(String title) {
    state = state.updateMetadata((meta) => meta.copyWith(title: title));
  }

  /// Add new page
  void addPage({String? title}) {
    final pageTitle = title ?? 'Page ${state.pages.length + 1}';
    state = state.addPage(CoursePage.create(title: pageTitle));
  }

  /// Remove page (by index)
  void removePage(int pageIndex) {
    if (state.pages.length <= 1) return; // Keep at least one page
    if (pageIndex < 0 || pageIndex >= state.pages.length) return;

    final pageId = state.pages[pageIndex].pageId;
    state = state.removePage(pageId);
  }

  /// Duplicate page
  void duplicatePage(int pageIndex) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    // Create a duplicate and generate new IDs
    final duplicatedPage = CoursePage.create(
      title: '${page.title} (Copy)',
    ).copyWith(
      blocks: page.blocks.map((block) => block.copyWith(
        id: IdGenerator.generate(),
      )).toList(),
    );

    // Insert after the original page
    final pages = List<CoursePage>.from(state.pages);
    pages.insert(pageIndex + 1, duplicatedPage);
    state = state.copyWith(pages: pages);
  }

  /// Update page title
  void updatePageTitle(int pageIndex, String title) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.copyWith(title: title);
    state = state.updatePage(updatedPage);
  }

  /// Load course
  void loadCourse(Course course) {
    state = course;
  }

  /// Create new course
  void createNewCourse({String title = 'Untitled Course'}) {
    state = Course.create(title: title);
  }
}

/// Course provider
final courseProvider = StateNotifierProvider<CourseNotifier, Course>((ref) {
  return CourseNotifier();
});

/// Current page blocks provider
final currentPageBlocksProvider = Provider.family<List<Block>, int>((ref, pageIndex) {
  final course = ref.watch(courseProvider);
  return course.getPage(pageIndex)?.blocks ?? [];
});
