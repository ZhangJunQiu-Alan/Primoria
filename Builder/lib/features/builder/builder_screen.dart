import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../models/course.dart';
import '../../theme/design_tokens.dart';
import '../../providers/builder_state.dart';
import '../../providers/course_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/course_export.dart';
import '../../services/course_import.dart';
import '../../services/course_schema_validator.dart';
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
  String? _courseId;

  @override
  void initState() {
    super.initState();
    final routeCourseId = widget.courseId?.trim();
    _courseId = (routeCourseId == null || routeCourseId.isEmpty)
        ? null
        : routeCourseId;
    _bootstrapProtectedScreen();
  }

  Future<void> _bootstrapProtectedScreen() async {
    final hasAccess = await SupabaseService.ensureBuilderAccess(
      signOutIfDenied: true,
    );
    if (!mounted) return;
    if (!hasAccess) {
      context.go('/');
      return;
    }
    if (_courseId != null && _courseId!.isNotEmpty) {
      _loadCourse();
      return;
    }
    _initializeBlankCourse();
  }

  void _initializeBlankCourse() {
    ref.read(courseProvider.notifier).createNewCourse();
    final created = ref.read(courseProvider);
    _courseId = created.courseId;
    _draftAutoSaveEnabled = true;
    ref
        .read(builderStateProvider.notifier)
        .syncCourseTitle(created.metadata.title, hasUnsavedChanges: false);
    ref.read(builderStateProvider.notifier).setCurrentPage(0);
    ref.read(builderStateProvider.notifier).clearSelection();
    ref.read(builderStateProvider.notifier).markAsSaved();
  }

  Future<void> _loadCourse() async {
    if (_courseLoaded) return;
    _courseLoaded = true;
    final courseId = _courseId!;

    // Restore browser draft first to prevent unsaved edits from being
    // overwritten when navigating Builder -> Preview -> Builder.
    final draft = await StorageService.loadCourseDraft(courseId);
    if (!mounted) return;
    if (draft != null) {
      ref
          .read(courseProvider.notifier)
          .loadCourse(draft.copyWith(courseId: courseId));
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
      final t = BuilderLocalizations(ref.read(languageProvider));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t.draftRestored),
          duration: const Duration(seconds: 2),
        ),
      );
    });
  }

  Future<void> _saveBrowserDraft(WidgetRef ref) async {
    final courseId = _courseId;
    if (courseId == null || courseId.isEmpty) return;
    await StorageService.saveCourseDraft(courseId, ref.read(courseProvider));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(courseProvider, (previous, next) {
      if (!_draftAutoSaveEnabled) return;
      final courseId = _courseId;
      if (courseId == null || courseId.isEmpty) return;
      StorageService.saveCourseDraft(courseId, next);
    });

    final builderState = ref.watch(builderStateProvider);
    final t = BuilderLocalizations(ref.watch(languageProvider));

    return Scaffold(
      appBar: _buildAppBar(context, ref, builderState, t),
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
    BuilderLocalizations t,
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
                'assets/imgs/logo32.png',
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
            final previewCourseId = (_courseId ?? '').isNotEmpty
                ? _courseId!
                : ref.read(courseProvider).courseId;
            _courseId = previewCourseId;
            await _saveBrowserDraft(ref);
            if (!context.mounted) return;
            if (previewCourseId.isNotEmpty) {
              context.go('/viewer?courseId=$previewCourseId');
            } else {
              context.go('/viewer');
            }
          },
          style: pillOutlinedStyle,
          child: Text(t.builderPreview),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Import button
        OutlinedButton(
          onPressed: () {
            _importCourse(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderImport),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Export button
        OutlinedButton(
          onPressed: () {
            _exportCourse(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderExport),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Cloud save button
        OutlinedButton(
          onPressed: () {
            _saveToCloud(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderSave),
        ),
        const SizedBox(width: AppSpacing.sm),
        // Publish button
        ElevatedButton(
          onPressed: () {
            _publishCourse(context, ref, t);
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
          child: Text(t.builderPublish),
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
    final t = BuilderLocalizations(ref.read(languageProvider));
    final controller = TextEditingController(text: currentTitle);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.editCourseTitleLabel),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(hintText: t.enterCourseTitle),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.cancel),
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
            child: Text(t.ok),
          ),
        ],
      ),
    );
  }

  void _exportCourse(
    BuildContext context,
    WidgetRef ref,
    BuilderLocalizations t,
  ) {
    final course = ref.read(courseProvider);

    // Validate course
    final validation = CourseExport.validateForExport(course);
    if (!validation.isValid) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(t.exportFailed),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.exportPleasefix),
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
              child: Text(t.ok),
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
        SnackBar(
          content: Text(t.exportSuccess),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t.exportError('$e')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showAIGenerateDialog(BuildContext context, WidgetRef ref) async {
    final t = BuilderLocalizations(ref.read(languageProvider));
    // Check for unsaved changes
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(t.confirmGeneration),
          content: Text(t.aiUnsavedWarning),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.continueButton),
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

          final t2 = BuilderLocalizations(ref.read(languageProvider));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(t2.aiGeneratedCourse(course.metadata.title)),
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

  void _importCourse(
    BuildContext context,
    WidgetRef ref,
    BuilderLocalizations t,
  ) async {
    // Check for unsaved changes
    final hasUnsaved = ref.read(builderStateProvider).hasUnsavedChanges;

    if (hasUnsaved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(t.confirmImport),
          content: Text(t.importUnsavedWarning),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.importButton),
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
          content: Text(t.importedCourse(result.course!.metadata.title)),
          duration: const Duration(seconds: 2),
        ),
      );
    } else if (result.message != 'Canceled') {
      final validation = result.validation;
      if (validation?.hasBlockingErrors ?? false) {
        _showSchemaValidationDialog(
          context,
          title: 'Import blocked by schema validation',
          validation: validation!,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t.importFailed(result.message)),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _saveToCloud(
    BuildContext context,
    WidgetRef ref,
    BuilderLocalizations t,
  ) async {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (context) => AuthDialog(
          onSuccess: () {
            // After successful sign-in, retry saving
            final t2 = BuilderLocalizations(ref.read(languageProvider));
            _saveToCloud(context, ref, t2);
          },
        ),
      );
      return;
    }

    final course = _courseForPersist(ref.read(courseProvider));

    // Show saving indicator
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.white),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(t.savingToCloud),
          ],
        ),
        duration: const Duration(seconds: 30),
      ),
    );

    final result = await SupabaseService.saveCourse(course);

    if (!context.mounted) return;

    // Clear previous SnackBar
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (result.success) {
      await _adoptPersistedCourseId(result.courseId, ref);
      if (!context.mounted) return;
      ref.read(builderStateProvider.notifier).markAsSaved();
      final draftCourseId = _courseId;
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
      final validation = result.validation;
      if (validation?.hasBlockingErrors ?? false) {
        _showSchemaValidationDialog(
          context,
          title: 'Save blocked by schema validation',
          validation: validation!,
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
  }

  void _publishCourse(
    BuildContext context,
    WidgetRef ref,
    BuilderLocalizations t,
  ) async {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (context) => AuthDialog(
          onSuccess: () {
            final t2 = BuilderLocalizations(ref.read(languageProvider));
            _publishCourse(context, ref, t2);
          },
        ),
      );
      return;
    }

    // Save first
    final course = _courseForPersist(ref.read(courseProvider));
    final saveResult = await SupabaseService.saveCourse(course);

    if (!saveResult.success ||
        saveResult.courseId == null ||
        saveResult.versionId == null) {
      if (context.mounted) {
        final validation = saveResult.validation;
        if (validation?.hasBlockingErrors ?? false) {
          _showSchemaValidationDialog(
            context,
            title: 'Publish blocked (save validation failed)',
            validation: validation!,
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(t.saveFailed(saveResult.message)),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
      return;
    }

    await _adoptPersistedCourseId(saveResult.courseId, ref);
    if (!context.mounted) return;

    // Confirm publish
    if (!context.mounted) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.publishCourseTitle),
        content: Text(t.publishConfirmMsg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.builderPublish),
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
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Text(publishResult.message),
            ],
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      final validation = publishResult.validation;
      if (validation?.hasBlockingErrors ?? false) {
        _showSchemaValidationDialog(
          context,
          title: 'Publish blocked by schema validation',
          validation: validation!,
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

  Course _courseForPersist(Course course) {
    final id = _courseId;
    if (id == null || id.isEmpty || id == course.courseId) return course;
    return course.copyWith(courseId: id);
  }

  Future<void> _adoptPersistedCourseId(
    String? persistedId,
    WidgetRef ref,
  ) async {
    if (persistedId == null || persistedId.isEmpty) return;
    final previousId = _courseId;
    if (previousId == persistedId) return;

    final current = ref.read(courseProvider);
    if (current.courseId != persistedId) {
      ref
          .read(courseProvider.notifier)
          .loadCourse(current.copyWith(courseId: persistedId));
    }

    _draftAutoSaveEnabled = true;

    if (!mounted) {
      _courseId = persistedId;
      return;
    }

    setState(() => _courseId = persistedId);

    if (previousId != null && previousId.isNotEmpty) {
      await StorageService.clearCourseDraft(previousId);
    }
  }

  void _showSchemaValidationDialog(
    BuildContext context, {
    required String title,
    required CourseSchemaValidationResult validation,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SizedBox(
          width: 560,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 420),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (validation.errors.isNotEmpty) ...[
                    Builder(
                      builder: (ctx) {
                        final t = BuilderLocalizations(
                          ProviderScope.containerOf(ctx).read(languageProvider),
                        );
                        return Text(
                          t.blockingErrors(validation.errors.length),
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.error,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...validation.errors.map(_buildValidationFindingRow),
                  ],
                  if (validation.warnings.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    Builder(
                      builder: (ctx) {
                        final t = BuilderLocalizations(
                          ProviderScope.containerOf(ctx).read(languageProvider),
                        );
                        return Text(
                          t.warnings(validation.warnings.length),
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.warning,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...validation.warnings.map(_buildValidationFindingRow),
                  ],
                ],
              ),
            ),
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: Builder(
              builder: (ctx) {
                final t = BuilderLocalizations(
                  ProviderScope.containerOf(ctx).read(languageProvider),
                );
                return Text(t.ok);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildValidationFindingRow(CourseSchemaFinding finding) {
    final isError = finding.severity == CourseSchemaFindingSeverity.error;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isError ? Icons.error : Icons.warning_amber_rounded,
            size: 16,
            color: isError ? AppColors.error : AppColors.warning,
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(child: Text(finding.toDisplayMessage())),
        ],
      ),
    );
  }
}
