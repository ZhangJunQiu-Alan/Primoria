import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/id_generator.dart';

/// 课程状态 Notifier
class CourseNotifier extends StateNotifier<Course> {
  CourseNotifier() : super(Course.create());

  /// 获取当前页面
  CoursePage? getCurrentPage(int pageIndex) {
    return state.getPage(pageIndex);
  }

  /// 添加 Block 到指定页面
  void addBlock(int pageIndex, BlockType type) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final newBlock = BlockRegistry.createBlock(type, order: page.blocks.length);
    final updatedPage = page.addBlock(newBlock);
    state = state.updatePage(updatedPage);
  }

  /// 删除 Block
  void removeBlock(int pageIndex, String blockId) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.removeBlock(blockId);
    state = state.updatePage(updatedPage);
  }

  /// 更新 Block
  void updateBlock(int pageIndex, Block updatedBlock) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.updateBlock(updatedBlock);
    state = state.updatePage(updatedPage);
  }

  /// 重排 Block 顺序
  void reorderBlocks(int pageIndex, int oldIndex, int newIndex) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.reorderBlocks(oldIndex, newIndex);
    state = state.updatePage(updatedPage);
  }

  /// 更新课程标题
  void updateTitle(String title) {
    state = state.updateMetadata((meta) => meta.copyWith(title: title));
  }

  /// 添加新页面
  void addPage({String? title}) {
    final pageTitle = title ?? '第 ${state.pages.length + 1} 页';
    state = state.addPage(CoursePage.create(title: pageTitle));
  }

  /// 删除页面（通过索引）
  void removePage(int pageIndex) {
    if (state.pages.length <= 1) return; // 至少保留一页
    if (pageIndex < 0 || pageIndex >= state.pages.length) return;

    final pageId = state.pages[pageIndex].pageId;
    state = state.removePage(pageId);
  }

  /// 复制页面
  void duplicatePage(int pageIndex) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    // 创建副本，生成新 ID
    final duplicatedPage = CoursePage.create(
      title: '${page.title} (副本)',
    ).copyWith(
      blocks: page.blocks.map((block) => block.copyWith(
        id: IdGenerator.generate(),
      )).toList(),
    );

    // 插入到原页面之后
    final pages = List<CoursePage>.from(state.pages);
    pages.insert(pageIndex + 1, duplicatedPage);
    state = state.copyWith(pages: pages);
  }

  /// 更新页面标题
  void updatePageTitle(int pageIndex, String title) {
    final page = state.getPage(pageIndex);
    if (page == null) return;

    final updatedPage = page.copyWith(title: title);
    state = state.updatePage(updatedPage);
  }

  /// 加载课程
  void loadCourse(Course course) {
    state = course;
  }

  /// 创建新课程
  void createNewCourse({String title = '未命名课程'}) {
    state = Course.create(title: title);
  }
}

/// 课程 Provider
final courseProvider = StateNotifierProvider<CourseNotifier, Course>((ref) {
  return CourseNotifier();
});

/// 当前页面 Blocks Provider
final currentPageBlocksProvider = Provider.family<List<Block>, int>((ref, pageIndex) {
  final course = ref.watch(courseProvider);
  return course.getPage(pageIndex)?.blocks ?? [];
});
