import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../providers/builder_state.dart';
import '../../providers/course_provider.dart';
import '../../services/course_export.dart';
import '../../services/course_import.dart';
import '../../services/storage_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/builder_layout.dart';
import '../../widgets/module_panel.dart';
import '../../widgets/property_panel.dart';
import '../../widgets/builder_canvas.dart';
import '../../widgets/ai_generate_dialog.dart';
import '../../widgets/auth_dialog.dart';
import '../../widgets/user_avatar.dart';

/// Builder main screen - course editor
class BuilderScreen extends ConsumerStatefulWidget {
  final String? courseId;

  const BuilderScreen({super.key, this.courseId});

  @override
  ConsumerState<BuilderScreen> createState() => _BuilderScreenState();
}

class _BuilderScreenState extends ConsumerState<BuilderScreen> {
  bool _courseLoaded = false;
  bool _draftAutoSaveEnabled = false;

  @override
  void initState() {
    super.initState();
    if (widget.courseId != null) {
      _loadCourse();
    }
  }

  Future<void> _loadCourse() async {
    if (_courseLoaded) return;
    _courseLoaded = true;
    final courseId = widget.courseId!;

    // Restore browser draft first to prevent unsaved edits from being
    // overwritten when navigating Builder -> Preview -> Builder.
    final draft = await StorageService.loadCourseDraft(courseId);
    if (!mounted) return;
    if (draft != null) {
      ref.read(courseProvider.notifier).loadCourse(draft);
      ref
          .read(builderStateProvider.notifier)
          .syncCourseTitle(draft.metadata.title, hasUnsavedChanges: true);
      _draftAutoSaveEnabled = true;
      _showDraftRestoredHint();
      return;
    }

    final course = await SupabaseService.getCourseContent(courseId);
    if (!mounted) return;
    if (course != null) {
      ref.read(courseProvider.notifier).loadCourse(course);
      ref
          .read(builderStateProvider.notifier)
          .syncCourseTitle(course.metadata.title, hasUnsavedChanges: false);
    }
    _draftAutoSaveEnabled = true;
  }

  void _showDraftRestoredHint() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recovered unsaved browser draft'),
          duration: Duration(seconds: 2),
        ),
      );
    });
  }

  Future<void> _saveBrowserDraft(WidgetRef ref) async {
    final courseId = widget.courseId;
    if (courseId == null || courseId.isEmpty) return;
    await StorageService.saveCourseDraft(courseId, ref.read(courseProvider));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(courseProvider, (previous, next) {
      if (!_draftAutoSaveEnabled) return;
      final courseId = widget.courseId;
      if (courseId == null || courseId.isEmpty) return;
      StorageService.saveCourseDraft(courseId, next);
    });

    final builderState = ref.watch(builderStateProvider);

    return Scaffold(
      appBar: _buildAppBar(context, ref, builderState),
      body: const BuilderLayout(
        leftPanel: ModulePanel(),
        canvas: BuilderCanvas(),
        rightPanel: PropertyPanel(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    WidgetRef ref,
    BuilderState state,
  ) {
    final isCompact = MediaQuery.of(context).size.width < 920;
    final pillOutlinedStyle = OutlinedButton.styleFrom(
      foregroundColor: AppColors.neutral700,
      side: const BorderSide(color: AppColors.neutral300),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.pill),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
    );

    return AppBar(
      automaticallyImplyLeading: false,
      leading: isCompact
          ? null
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Image.asset(
                'assets/images/logo.png',
                width: 32,
                height: 32,
                errorBuilder: (context, error, stackTrace) =>
                    const Icon(Icons.school, color: AppColors.primary500),
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
                  fontWeight: FontWeight.w600,
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
        // AI generate button
        OutlinedButton.icon(
          onPressed: () {
            _showAIGenerateDialog(context, ref);
          },
          icon: const Icon(Icons.auto_awesome, size: 16),
          label: const Text('AI'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.accent600,
            side: const BorderSide(color: AppColors.accent300),
            backgroundColor: AppColors.accent50,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.pill),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Preview button
        OutlinedButton(
          onPressed: () async {
            await _saveBrowserDraft(ref);
            if (!context.mounted) return;
            final id = widget.courseId ?? '';
            if (id.isNotEmpty) {
              context.go('/viewer?courseId=$id');
            } else {
              context.go('/viewer');
            }
          },
          style: pillOutlinedStyle,
          child: const Text('Preview'),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Import button
        OutlinedButton(
          onPressed: () {
            _importCourse(context, ref);
          },
          style: pillOutlinedStyle,
          child: const Text('Import'),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Export button
        OutlinedButton(
          onPressed: () {
            _exportCourse(context, ref);
          },
          style: pillOutlinedStyle,
          child: const Text('Export'),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Cloud save button
        OutlinedButton(
          onPressed: () {
            _saveToCloud(context, ref);
          },
          style: pillOutlinedStyle,
          child: const Text('Save'),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Publish button
        ElevatedButton(
          onPressed: () {
            _publishCourse(context, ref);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary500,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.pill),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
          ),
          child: const Text('Publish'),
        ),
        const SizedBox(width: AppSpacing.sm),
        // User avatar
        const Padding(
          padding: EdgeInsets.only(right: AppSpacing.md),
          child: UserAvatar(size: 36),
        ),
      ],
    );
  }

  void _editCourseTitle(
    BuildContext context,
    WidgetRef ref,
    String currentTitle,
  ) {
    final controller = TextEditingController(text: currentTitle);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit course title'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Enter course title'),
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

  void _exportCourse(BuildContext context, WidgetRef ref) {
    final course = ref.read(courseProvider);

    // Validate course
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
              ...validation.errors.map(
                (e) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                  child: Row(
                    children: [
                      const Icon(Icons.error, size: 16, color: AppColors.error),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(child: Text(e)),
                    ],
                  ),
                ),
              ),
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

    // Perform export
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
    // Check for unsaved changes
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm generation'),
          content: const Text(
            'You have unsaved changes. The AI-generated course will replace the current content. Continue?',
          ),
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

    // Show AI generation dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AIGenerateDialog(
        onCourseGenerated: (course) {
          // Load generated course
          ref.read(courseProvider.notifier).loadCourse(course);
          ref
              .read(builderStateProvider.notifier)
              .setCourseTitle(course.metadata.title);
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
                    child: Text(
                      'AI generated course: ${course.metadata.title}',
                    ),
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
    // Check for unsaved changes
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm import'),
          content: const Text(
            'You have unsaved changes. Importing a new course will replace the current content. Continue?',
          ),
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

    // Perform import
    final result = await CourseImport.importFromFile();

    if (!context.mounted) return;

    if (result.success && result.course != null) {
      // Load course into state
      ref.read(courseProvider.notifier).loadCourse(result.course!);
      ref
          .read(builderStateProvider.notifier)
          .setCourseTitle(result.course!.metadata.title);
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

  void _saveToCloud(BuildContext context, WidgetRef ref) async {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (context) => AuthDialog(
          onSuccess: () {
            // After successful sign-in, retry saving
            _saveToCloud(context, ref);
          },
        ),
      );
      return;
    }

    final course = ref.read(courseProvider);

    // Show saving indicator
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

    // Clear previous SnackBar
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (result.success) {
      ref.read(builderStateProvider.notifier).markAsSaved();
      final draftCourseId = widget.courseId;
      if (draftCourseId != null && draftCourseId.isNotEmpty) {
        await StorageService.clearCourseDraft(draftCourseId);
        if (!context.mounted) return;
      }
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

    // Save first
    final course = ref.read(courseProvider);
    final saveResult = await SupabaseService.saveCourse(course);

    if (!saveResult.success ||
        saveResult.courseId == null ||
        saveResult.versionId == null) {
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

    // Confirm publish
    if (!context.mounted) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish course'),
        content: const Text(
          'After publishing, everyone will be able to see this course. Publish now?',
        ),
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

    // Perform publish
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
