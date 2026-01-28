import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../providers/builder_state.dart';
import '../../providers/course_provider.dart';
import '../../services/course_export.dart';
import '../../widgets/builder_layout.dart';
import '../../widgets/module_panel.dart';
import '../../widgets/property_panel.dart';
import '../../widgets/builder_canvas.dart';

/// Builder 主屏幕 - 课程编辑器
class BuilderScreen extends ConsumerWidget {
  const BuilderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);

    return Scaffold(
      appBar: _buildAppBar(context, ref, builderState),
      body: const BuilderLayout(
        leftPanel: ModulePanel(),
        canvas: BuilderCanvas(),
        rightPanel: PropertyPanel(),
      ),
      bottomNavigationBar: _buildPageBar(context, ref, builderState),
    );
  }

  PreferredSizeWidget _buildAppBar(
      BuildContext context, WidgetRef ref, BuilderState state) {
    return AppBar(
      leading: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Image.network(
          'https://via.placeholder.com/32x32?text=P',
          errorBuilder: (context, error, stackTrace) => const Icon(
            Icons.school,
            color: AppColors.primary500,
          ),
        ),
      ),
      title: InkWell(
        onTap: () => _editCourseTitle(context, ref, state.courseTitle),
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: AppSpacing.xs,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                state.courseTitle,
                style: const TextStyle(
                  fontSize: AppFontSize.md,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              const Icon(Icons.edit, size: 16, color: AppColors.neutral400),
              if (state.hasUnsavedChanges) ...[
                const SizedBox(width: AppSpacing.sm),
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.warning,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        // 预览按钮
        TextButton.icon(
          onPressed: () {
            context.go('/viewer');
          },
          icon: const Icon(Icons.play_arrow, size: 20),
          label: const Text('预览'),
        ),
        // 导出按钮
        TextButton.icon(
          onPressed: () {
            _exportCourse(context, ref);
          },
          icon: const Icon(Icons.download, size: 20),
          label: const Text('导出'),
        ),
        // 发布按钮
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: ElevatedButton.icon(
            onPressed: () {
              // TODO: 发布功能
            },
            icon: const Icon(Icons.publish, size: 18),
            label: const Text('发布'),
          ),
        ),
        // 用户头像占位
        const Padding(
          padding: EdgeInsets.only(right: AppSpacing.md),
          child: CircleAvatar(
            radius: 16,
            backgroundColor: AppColors.primary100,
            child: Icon(
              Icons.person,
              size: 18,
              color: AppColors.primary600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPageBar(
      BuildContext context, WidgetRef ref, BuilderState state) {
    final course = ref.watch(courseProvider);
    final pages = course.pages;

    return Container(
      height: 48,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.neutral200),
        ),
      ),
      child: Row(
        children: [
          const SizedBox(width: AppSpacing.md),
          const Text(
            '页面:',
            style: TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral500,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          // 页面切换 tabs
          ...List.generate(pages.length, (index) {
            final isSelected = index == state.currentPageIndex;
            final page = pages[index];
            return Padding(
              padding: const EdgeInsets.only(right: AppSpacing.xs),
              child: GestureDetector(
                onDoubleTap: () => _editPageTitle(context, ref, index, page.title),
                onLongPress: () => _showPageMenu(context, ref, index),
                child: InkWell(
                  onTap: () {
                    ref.read(builderStateProvider.notifier).setCurrentPage(index);
                  },
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary100
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary500
                            : AppColors.neutral300,
                      ),
                    ),
                    child: Text(
                      '${index + 1}',
                      style: TextStyle(
                        fontSize: AppFontSize.sm,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected
                            ? AppColors.primary700
                            : AppColors.neutral600,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
          // 添加页面按钮
          IconButton(
            onPressed: () {
              ref.read(courseProvider.notifier).addPage();
              final newIndex = ref.read(courseProvider).pages.length - 1;
              ref.read(builderStateProvider.notifier).setCurrentPage(newIndex);
              ref.read(builderStateProvider.notifier).markAsUnsaved();
            },
            icon: const Icon(Icons.add, size: 20),
            tooltip: '添加页面',
            style: IconButton.styleFrom(
              foregroundColor: AppColors.neutral500,
            ),
          ),
          const Spacer(),
          // 缩放控制（可选）
          Text(
            '100%',
            style: TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral400,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
        ],
      ),
    );
  }

  void _editCourseTitle(BuildContext context, WidgetRef ref, String currentTitle) {
    final controller = TextEditingController(text: currentTitle);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('编辑课程名称'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: '输入课程名称',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                ref
                    .read(builderStateProvider.notifier)
                    .setCourseTitle(controller.text);
                ref.read(courseProvider.notifier).updateTitle(controller.text);
              }
              Navigator.pop(context);
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _editPageTitle(BuildContext context, WidgetRef ref, int pageIndex, String currentTitle) {
    final controller = TextEditingController(text: currentTitle);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('编辑页面标题'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: '输入页面标题',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                ref.read(courseProvider.notifier).updatePageTitle(pageIndex, controller.text);
                ref.read(builderStateProvider.notifier).markAsUnsaved();
              }
              Navigator.pop(context);
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _showPageMenu(BuildContext context, WidgetRef ref, int pageIndex) {
    final course = ref.read(courseProvider);
    final page = course.pages[pageIndex];

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('重命名'),
              onTap: () {
                Navigator.pop(context);
                _editPageTitle(context, ref, pageIndex, page.title);
              },
            ),
            ListTile(
              leading: const Icon(Icons.content_copy),
              title: const Text('复制页面'),
              onTap: () {
                ref.read(courseProvider.notifier).duplicatePage(pageIndex);
                ref.read(builderStateProvider.notifier).markAsUnsaved();
                Navigator.pop(context);
              },
            ),
            if (course.pages.length > 1)
              ListTile(
                leading: const Icon(Icons.delete, color: AppColors.error),
                title: const Text('删除页面', style: TextStyle(color: AppColors.error)),
                onTap: () {
                  Navigator.pop(context);
                  _confirmDeletePage(context, ref, pageIndex);
                },
              ),
          ],
        ),
      ),
    );
  }

  void _confirmDeletePage(BuildContext context, WidgetRef ref, int pageIndex) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除页面'),
        content: const Text('确定要删除此页面吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            onPressed: () {
              final currentIndex = ref.read(builderStateProvider).currentPageIndex;
              ref.read(courseProvider.notifier).removePage(pageIndex);

              // 如果删除的是当前页面，调整索引
              if (currentIndex >= pageIndex && currentIndex > 0) {
                ref.read(builderStateProvider.notifier).setCurrentPage(currentIndex - 1);
              }

              ref.read(builderStateProvider.notifier).markAsUnsaved();
              Navigator.pop(context);
            },
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  void _exportCourse(BuildContext context, WidgetRef ref) {
    final course = ref.read(courseProvider);

    // 验证课程
    final validation = CourseExport.validateForExport(course);
    if (!validation.isValid) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('导出失败'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('请修复以下问题：'),
              const SizedBox(height: AppSpacing.sm),
              ...validation.errors.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                    child: Row(
                      children: [
                        const Icon(Icons.error, size: 16, color: AppColors.error),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(child: Text(e)),
                      ],
                    ),
                  )),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('确定'),
            ),
          ],
        ),
      );
      return;
    }

    // 执行导出
    try {
      CourseExport.downloadJson(course);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('课程 JSON 已导出'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('导出失败: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }
}
