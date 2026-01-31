import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../providers/builder_state.dart';
import '../../providers/course_provider.dart';
import '../../services/course_export.dart';
import '../../services/course_import.dart';
import '../../services/supabase_service.dart';
import '../../widgets/builder_layout.dart';
import '../../widgets/module_panel.dart';
import '../../widgets/property_panel.dart';
import '../../widgets/builder_canvas.dart';
import '../../widgets/ai_generate_dialog.dart';
import '../../widgets/auth_dialog.dart';
import '../../widgets/profile_dialog.dart';

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
    final isCompact = MediaQuery.of(context).size.width < 920;
    return AppBar(
      automaticallyImplyLeading: false,
      leading: isCompact
          ? null
          : Padding(
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
        // AI 生成按钮
        TextButton.icon(
          onPressed: () {
            _showAIGenerateDialog(context, ref);
          },
          icon: const Icon(Icons.auto_awesome, size: 20, color: AppColors.accent500),
          label: const Text('AI Generate', style: TextStyle(color: AppColors.accent600)),
          style: TextButton.styleFrom(
            backgroundColor: AppColors.accent50,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        // 预览按钮
        TextButton.icon(
          onPressed: () {
            context.go('/viewer');
          },
          icon: const Icon(Icons.play_arrow, size: 20),
          label: const Text('Preview'),
        ),
        // 导入按钮
        TextButton.icon(
          onPressed: () {
            _importCourse(context, ref);
          },
          icon: const Icon(Icons.file_upload_outlined, size: 20),
          label: const Text('Import'),
        ),
        // 导出按钮
        TextButton.icon(
          onPressed: () {
            _exportCourse(context, ref);
          },
          icon: const Icon(Icons.file_download_outlined, size: 20),
          label: const Text('Export'),
        ),
        // 云端保存按钮
        TextButton.icon(
          onPressed: () {
            _saveToCloud(context, ref);
          },
          icon: const Icon(Icons.cloud_upload_outlined, size: 20),
          label: const Text('Save'),
        ),
        // 发布按钮
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: ElevatedButton(
            onPressed: () {
              _publishCourse(context, ref);
            },
            child: const Text('Publish'),
          ),
        ),
        // 用户头像 - 点击登录/登出
        Padding(
          padding: const EdgeInsets.only(right: AppSpacing.md),
          child: _buildUserAvatar(context),
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
            'Pages:',
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
            tooltip: 'Add page',
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
        title: const Text('Edit course title'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter course title',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
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
            child: const Text('OK'),
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
        title: const Text('Edit page title'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter page title',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                ref.read(courseProvider.notifier).updatePageTitle(pageIndex, controller.text);
                ref.read(builderStateProvider.notifier).markAsUnsaved();
              }
              Navigator.pop(context);
            },
            child: const Text('OK'),
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
              title: const Text('Rename'),
              onTap: () {
                Navigator.pop(context);
                _editPageTitle(context, ref, pageIndex, page.title);
              },
            ),
            ListTile(
              leading: const Icon(Icons.content_copy),
              title: const Text('Duplicate page'),
              onTap: () {
                ref.read(courseProvider.notifier).duplicatePage(pageIndex);
                ref.read(builderStateProvider.notifier).markAsUnsaved();
                Navigator.pop(context);
              },
            ),
            if (course.pages.length > 1)
              ListTile(
                leading: const Icon(Icons.delete, color: AppColors.error),
                title: const Text('Delete page', style: TextStyle(color: AppColors.error)),
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
        title: const Text('Delete page'),
        content: const Text("Delete this page? This action can't be undone."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
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
            child: const Text('Delete'),
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
          title: const Text('Export failed'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Please fix the following:'),
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
              child: const Text('OK'),
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
          content: Text('Course JSON exported'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Export failed: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showAIGenerateDialog(BuildContext context, WidgetRef ref) async {
    // 检查是否有未保存的更改
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm generation'),
          content: const Text(
              'You have unsaved changes. The AI-generated course will replace the current content. Continue?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Continue'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    if (!context.mounted) return;

    // 显示 AI 生成对话框
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AIGenerateDialog(
        onCourseGenerated: (course) {
          // 加载生成的课程
          ref.read(courseProvider.notifier).loadCourse(course);
          ref.read(builderStateProvider.notifier).setCourseTitle(course.metadata.title);
          ref.read(builderStateProvider.notifier).setCurrentPage(0);
          ref.read(builderStateProvider.notifier).clearSelection();
          ref.read(builderStateProvider.notifier).markAsUnsaved();

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text('AI generated course: ${course.metadata.title}'),
                  ),
                ],
              ),
              backgroundColor: AppColors.success,
              duration: const Duration(seconds: 3),
            ),
          );
        },
      ),
    );
  }

  void _importCourse(BuildContext context, WidgetRef ref) async {
    // 检查是否有未保存的更改
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm import'),
          content: const Text(
              'You have unsaved changes. Importing a new course will replace the current content. Continue?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Import'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    // 执行导入
    final result = await CourseImport.importFromFile();

    if (!context.mounted) return;

    if (result.success && result.course != null) {
      // 加载课程到状态
      ref.read(courseProvider.notifier).loadCourse(result.course!);
      ref.read(builderStateProvider.notifier).setCourseTitle(result.course!.metadata.title);
      ref.read(builderStateProvider.notifier).setCurrentPage(0);
      ref.read(builderStateProvider.notifier).clearSelection();
      ref.read(builderStateProvider.notifier).markAsSaved();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Imported course: ${result.course!.metadata.title}'),
          duration: const Duration(seconds: 2),
        ),
      );
    } else if (result.message != 'Canceled') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Import failed: ${result.message}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Widget _buildUserAvatar(BuildContext context) {
    // 使用 StreamBuilder 监听认证状态变化
    return StreamBuilder(
      stream: SupabaseService.authStateChanges,
      builder: (context, snapshot) {
        final isLoggedIn = SupabaseService.isLoggedIn;
        final user = SupabaseService.currentUser;

        return PopupMenuButton<String>(
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
      ),
      child: CircleAvatar(
        radius: 16,
        backgroundColor: isLoggedIn ? AppColors.secondary100 : AppColors.primary100,
        child: Icon(
          isLoggedIn ? Icons.person : Icons.person_outline,
          size: 18,
          color: isLoggedIn ? AppColors.secondary600 : AppColors.primary600,
        ),
      ),
      itemBuilder: (context) {
        if (isLoggedIn) {
          return [
            PopupMenuItem(
              enabled: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.email ?? 'Signed in',
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral600,
                    ),
                  ),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'profile',
              child: Row(
                children: [
                  Icon(Icons.settings_outlined, size: 18),
                  SizedBox(width: AppSpacing.sm),
                  Text('Profile'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'my_courses',
              child: Row(
                children: [
                  Icon(Icons.folder_outlined, size: 18),
                  SizedBox(width: AppSpacing.sm),
                  Text('My courses'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout, size: 18, color: AppColors.error),
                  SizedBox(width: AppSpacing.sm),
                  Text('Sign out', style: TextStyle(color: AppColors.error)),
                ],
              ),
            ),
          ];
        } else {
          return [
            const PopupMenuItem(
              value: 'login',
              child: Row(
                children: [
                  Icon(Icons.login, size: 18),
                  SizedBox(width: AppSpacing.sm),
                  Text('Sign in / Sign up'),
                ],
              ),
            ),
          ];
        }
      },
      onSelected: (value) {
        switch (value) {
          case 'login':
            _showAuthDialog(context);
            break;
          case 'profile':
            _showProfileDialog(context);
            break;
          case 'logout':
            _logout(context);
            break;
          case 'my_courses':
            _showMyCourses(context);
            break;
        }
      },
    );
      },
    );
  }

  void _showAuthDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AuthDialog(
        onSuccess: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Signed in'),
              backgroundColor: AppColors.success,
            ),
          );
        },
      ),
    );
  }

  void _showProfileDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const ProfileDialog(),
    );
  }

  void _logout(BuildContext context) async {
    await SupabaseService.signOut();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Signed out')),
      );
    }
  }

  void _showMyCourses(BuildContext context) async {
    // TODO: 显示我的课程列表对话框
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('My courses is coming soon...')),
    );
  }

  void _saveToCloud(BuildContext context, WidgetRef ref) async {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (context) => AuthDialog(
          onSuccess: () {
            // 登录成功后重新尝试保存
            _saveToCloud(context, ref);
          },
        ),
      );
      return;
    }

    final course = ref.read(courseProvider);

    // 显示保存中提示
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.white),
              ),
            ),
            SizedBox(width: AppSpacing.sm),
            Text('Saving to cloud...'),
          ],
        ),
        duration: Duration(seconds: 30),
      ),
    );

    final result = await SupabaseService.saveCourse(course);

    if (!context.mounted) return;

    // 清除之前的 SnackBar
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (result.success) {
      ref.read(builderStateProvider.notifier).markAsSaved();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.cloud_done, color: Colors.white, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Text(result.message),
            ],
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _publishCourse(BuildContext context, WidgetRef ref) async {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (context) => AuthDialog(
          onSuccess: () {
            _publishCourse(context, ref);
          },
        ),
      );
      return;
    }

    // 先保存
    final course = ref.read(courseProvider);
    final saveResult = await SupabaseService.saveCourse(course);

    if (!saveResult.success || saveResult.courseId == null || saveResult.versionId == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Save failed: ${saveResult.message}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    // 确认发布
    if (!context.mounted) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish course'),
        content: const Text(
            'After publishing, everyone will be able to see this course. Publish now?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Publish'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // 执行发布
    final publishResult = await SupabaseService.publishCourse(
      saveResult.courseId!,
      saveResult.versionId!,
    );

    if (!context.mounted) return;

    if (publishResult.success) {
      ref.read(builderStateProvider.notifier).markAsSaved();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white, size: 20),
              SizedBox(width: AppSpacing.sm),
              Text('Course published!'),
            ],
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(publishResult.message),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }
}
