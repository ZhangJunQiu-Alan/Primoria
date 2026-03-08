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
  final bool addLesson;
  final String? draftId;
  final int? lessonIndex;
  final String? lessonTitle;
  final String? parentCourseTitle;

  const BuilderScreen({
    super.key,
    this.courseId,
    this.addLesson = false,
    this.draftId,
    this.lessonIndex,
    this.lessonTitle,
    this.parentCourseTitle,
  });

  @override
  ConsumerState<BuilderScreen> createState() => _BuilderScreenState();
}

class _BuilderScreenState extends ConsumerState<BuilderScreen> {
  bool _courseLoaded = false;
  bool _draftAutoSaveEnabled = false;
  String? _courseId;
  String? _draftId;
  String? _addFlowLessonId;
  int? _entryLessonIndex;
  String? _entryLessonTitle;
  String? _parentCourseTitle;

  @override
  void initState() {
    super.initState();
    final routeCourseId = widget.courseId?.trim();
    _courseId = (routeCourseId == null || routeCourseId.isEmpty)
        ? null
        : routeCourseId;
    final routeDraftId = widget.draftId?.trim();
    _draftId = (routeDraftId == null || routeDraftId.isEmpty)
        ? null
        : routeDraftId;
    final routeLessonIndex = widget.lessonIndex;
    _entryLessonIndex = (routeLessonIndex != null && routeLessonIndex >= 0)
        ? routeLessonIndex
        : null;
    final routeLessonTitle = widget.lessonTitle?.trim();
    _entryLessonTitle = (routeLessonTitle == null || routeLessonTitle.isEmpty)
        ? null
        : routeLessonTitle;
    final routeParentCourseTitle = widget.parentCourseTitle?.trim();
    _parentCourseTitle =
        (routeParentCourseTitle == null || routeParentCourseTitle.isEmpty)
        ? null
        : routeParentCourseTitle;
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
    if (_isAddLessonFlow) {
      await _loadOrInitAddLessonCourse();
      return;
    }

    if (_courseId != null && _courseId!.isNotEmpty) {
      _loadCourse();
      return;
    }
    _initializeBlankCourse();
  }

  bool get _isAddLessonFlow =>
      widget.addLesson && _courseId != null && _courseId!.isNotEmpty;

  String? get _activeDraftStorageId {
    if (_isAddLessonFlow) {
      final id = _draftId;
      if (id != null && id.isNotEmpty) return id;
    }
    final id = _courseId;
    if (id != null && id.isNotEmpty) return id;
    return null;
  }

  int _resolveEntryLessonIndex(Course course) {
    final target = _entryLessonIndex;
    if (target == null || target < 0) return 0;
    if (course.lessons.isEmpty) return 0;
    if (target >= course.lessons.length) return course.lessons.length - 1;
    return target;
  }

  Future<void> _hydrateParentCourseTitleIfNeeded() async {
    if (!_isAddLessonFlow) return;
    final existing = _parentCourseTitle?.trim();
    if (existing != null && existing.isNotEmpty) return;
    final courseId = _courseId;
    if (courseId == null || courseId.isEmpty) return;

    try {
      final course = await SupabaseService.client
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .maybeSingle();
      final title = (course?['title'] as String?)?.trim();
      if (title != null && title.isNotEmpty) {
        _parentCourseTitle = title;
      }
    } catch (_) {}
  }

  Future<void> _loadOrInitAddLessonCourse() async {
    await _hydrateParentCourseTitleIfNeeded();
    if (!mounted) return;

    if (_draftId != null && _draftId!.isNotEmpty) {
      final draft = await StorageService.loadCourseDraft(_draftId!);
      if (!mounted) return;
      if (draft != null) {
        ref.read(courseProvider.notifier).loadCourse(draft);
        ref
            .read(builderStateProvider.notifier)
            .syncCourseTitle(draft.metadata.title, hasUnsavedChanges: true);
        ref.read(builderStateProvider.notifier).setCurrentLesson(0);
        ref.read(builderStateProvider.notifier).clearSelection();
        _draftAutoSaveEnabled = true;
        return;
      }
    }

    _initializeBlankCourse(preserveCourseId: true);
  }

  void _initializeBlankCourse({bool preserveCourseId = false}) {
    ref.read(courseProvider.notifier).createNewCourse();
    final created = ref.read(courseProvider);

    if (!preserveCourseId) {
      _courseId = created.courseId;
      _draftId = null;
    } else {
      _draftId = created.courseId;
    }

    _draftAutoSaveEnabled = true;
    ref
        .read(builderStateProvider.notifier)
        .syncCourseTitle(created.metadata.title, hasUnsavedChanges: false);
    ref.read(builderStateProvider.notifier).setCurrentLesson(0);
    ref.read(builderStateProvider.notifier).clearSelection();
    ref.read(builderStateProvider.notifier).markAsSaved();
  }

  Future<void> _loadCourse() async {
    if (_courseLoaded) return;
    _courseLoaded = true;
    final courseId = _courseId!;

    // Restore browser draft first to prevent unsaved edits from being
    // overwritten when navigating Builder -> Preview -> Builder.
    final draftKey = _activeDraftStorageId ?? courseId;
    final draft = await StorageService.loadCourseDraft(draftKey);
    if (!mounted) return;
    // Only restore draft if it actually contains content. An empty draft is a
    // stale artefact from a previously failed DB load and should be discarded
    // so the fresh DB content (e.g. agentic-generated lessons) can be shown.
    final draftHasContent =
        draft != null && draft.lessons.any((l) => l.blocks.isNotEmpty);
    if (draftHasContent) {
      final hydratedDraft = draft.copyWith(courseId: courseId);
      ref.read(courseProvider.notifier).loadCourse(hydratedDraft);
      ref
          .read(builderStateProvider.notifier)
          .syncCourseTitle(draft.metadata.title, hasUnsavedChanges: true);
      final entryLessonIndex = _resolveEntryLessonIndex(hydratedDraft);
      _entryLessonIndex = entryLessonIndex;
      ref
          .read(builderStateProvider.notifier)
          .setCurrentLesson(entryLessonIndex);
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
      final entryLessonIndex = _resolveEntryLessonIndex(course);
      _entryLessonIndex = entryLessonIndex;
      ref
          .read(builderStateProvider.notifier)
          .setCurrentLesson(entryLessonIndex);
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
    final draftStorageId = _activeDraftStorageId;
    if (draftStorageId == null || draftStorageId.isEmpty) return;
    await StorageService.saveCourseDraft(
      draftStorageId,
      ref.read(courseProvider),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(courseProvider, (previous, next) {
      if (!_draftAutoSaveEnabled) return;
      final draftStorageId = _activeDraftStorageId;
      if (draftStorageId == null || draftStorageId.isEmpty) return;
      StorageService.saveCourseDraft(draftStorageId, next);
    });

    final builderState = ref.watch(builderStateProvider);
    final course = ref.watch(courseProvider);
    final t = BuilderLocalizations(ref.watch(languageProvider));

    return Scaffold(
      appBar: _buildAppBar(context, ref, builderState, course, t),
      body: BuilderLayout(
        leftPanel: ModulePanel(t: t),
        canvas: BuilderCanvas(t: t),
        rightPanel: PropertyPanel(t: t),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    WidgetRef ref,
    BuilderState state,
    Course course,
    BuilderLocalizations t,
  ) {
    final isCompact = MediaQuery.of(context).size.width < 920;
    final currentLessonTitle = _resolveCurrentLessonTitle(
      course,
      state.currentLessonIndex,
      t,
    );
    final displayCourseTitle = _resolveDisplayCourseTitle(state.courseTitle);
    final appBarTitle = '$displayCourseTitle / $currentLessonTitle';
    final pillOutlinedStyle = OutlinedButton.styleFrom(
      foregroundColor: AppColors.neutral700,
      side: const BorderSide(color: AppColors.neutral200),
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.pill),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
    );

    return AppBar(
      toolbarHeight: 76,
      backgroundColor: const Color(0xFFF7FAFC),
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      automaticallyImplyLeading: false,
      leading: isCompact
          ? null
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: InkWell(
                onTap: () => context.go('/dashboard'),
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                child: Image.asset(
                  'assets/imgs/logo32.png',
                  width: 32,
                  height: 32,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.school, color: AppColors.primary500),
                ),
              ),
            ),
      titleSpacing: AppSpacing.sm,
      title: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => _editLessonTitle(
                context,
                ref,
                course,
                state.currentLessonIndex,
                currentLessonTitle,
              ),
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppBorderRadius.md),
                  border: Border.all(color: AppColors.neutral200),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.primary50,
                        borderRadius: BorderRadius.circular(AppBorderRadius.md),
                      ),
                      child: const Icon(
                        Icons.dashboard_customize_outlined,
                        color: AppColors.primary600,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _tr(t, '课程编辑器', 'Course Builder'),
                            style: const TextStyle(
                              fontSize: AppFontSize.xs,
                              fontWeight: FontWeight.w600,
                              color: AppColors.neutral500,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  appBarTitle,
                                  style: const TextStyle(
                                    fontSize: AppFontSize.md,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.neutral900,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              const Icon(
                                Icons.edit_outlined,
                                size: 16,
                                color: AppColors.neutral400,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: state.hasUnsavedChanges
                            ? AppColors.accent50
                            : AppColors.secondary50,
                        borderRadius: BorderRadius.circular(
                          AppBorderRadius.pill,
                        ),
                        border: Border.all(
                          color: state.hasUnsavedChanges
                              ? AppColors.accent200
                              : AppColors.secondary200,
                        ),
                      ),
                      child: Text(
                        state.hasUnsavedChanges
                            ? _tr(t, '草稿未保存', 'Draft changes')
                            : _tr(t, '已保存', 'Saved'),
                        style: TextStyle(
                          fontSize: AppFontSize.xs,
                          fontWeight: FontWeight.w700,
                          color: state.hasUnsavedChanges
                              ? AppColors.accent700
                              : AppColors.secondary700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      actions: [
        OutlinedButton.icon(
          onPressed: () {
            _showAIGenerateDialog(context, ref);
          },
          icon: const Icon(Icons.auto_awesome, size: 16),
          label: Text(_tr(t, 'AI 生成', 'AI')),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.accent600,
            side: const BorderSide(color: AppColors.accent300),
            backgroundColor: Colors.white,
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
        OutlinedButton(
          onPressed: () async {
            final previewCourseId = (_courseId ?? '').isNotEmpty
                ? _courseId!
                : ref.read(courseProvider).courseId;
            final previewLessonIndex = state.currentLessonIndex;
            _courseId = previewCourseId;
            if (_isAddLessonFlow && (_draftId == null || _draftId!.isEmpty)) {
              _draftId = ref.read(courseProvider).courseId;
            }
            await _saveBrowserDraft(ref);
            if (!context.mounted) return;
            if (previewCourseId.isNotEmpty) {
              if (_isAddLessonFlow) {
                final draftPart = (_draftId != null && _draftId!.isNotEmpty)
                    ? '&draftId=${Uri.encodeQueryComponent(_draftId!)}'
                    : '';
                context.go(
                  '/viewer?courseId=$previewCourseId&singlePage=1&lessonIndex=$previewLessonIndex&addLesson=1$draftPart',
                );
              } else {
                context.go(
                  '/viewer?courseId=$previewCourseId&singlePage=1&lessonIndex=$previewLessonIndex',
                );
              }
            } else {
              context.go(
                '/viewer?singlePage=1&lessonIndex=$previewLessonIndex',
              );
            }
          },
          style: pillOutlinedStyle,
          child: Text(t.builderPreview),
        ),
        const SizedBox(width: AppSpacing.sm),
        OutlinedButton(
          onPressed: () {
            _importCourse(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderImport),
        ),
        const SizedBox(width: AppSpacing.sm),
        OutlinedButton(
          onPressed: () {
            _exportCourse(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderExport),
        ),
        const SizedBox(width: AppSpacing.sm),
        OutlinedButton(
          onPressed: () {
            _saveToCloud(context, ref, t);
          },
          style: pillOutlinedStyle,
          child: Text(t.builderSave),
        ),
        const SizedBox(width: AppSpacing.sm),
        ElevatedButton(
          onPressed: () {
            _publishCourse(context, ref, t);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary500,
            foregroundColor: Colors.white,
            elevation: 0,
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
        Padding(
          padding: EdgeInsets.only(right: AppSpacing.md),
          child: UserAvatar(t: t, size: 36),
        ),
      ],
    );
  }

  String _resolveCurrentLessonTitle(
    Course course,
    int lessonIndex,
    BuilderLocalizations t,
  ) {
    final lesson = course.getLesson(lessonIndex);
    final title = lesson?.title.trim() ?? '';
    final entryIndex = _entryLessonIndex;
    final entryTitle = _entryLessonTitle;

    final resolvedEntryTitle = (entryIndex != null && lessonIndex == entryIndex)
        ? (entryTitle?.trim() ?? '')
        : '';
    final hasEntryTitle = resolvedEntryTitle.isNotEmpty;

    if (title.isNotEmpty && !_looksLikePlaceholderLessonTitle(title)) {
      return title;
    }
    if (hasEntryTitle) return resolvedEntryTitle;
    if (_isAddLessonFlow &&
        (title.isEmpty || _looksLikePlaceholderLessonTitle(title))) {
      return _untitledLessonLabel(t);
    }
    if (title.isNotEmpty) return title;
    final displayIndex = lessonIndex >= 0 ? lessonIndex + 1 : 1;
    return t.lessonN(displayIndex);
  }

  String _resolveDisplayCourseTitle(String fallback) {
    if (!_isAddLessonFlow) return fallback;
    final title = _parentCourseTitle?.trim();
    if (title != null && title.isNotEmpty) return title;
    return fallback;
  }

  String _untitledLessonLabel(BuilderLocalizations t) {
    return _tr(t, '未命名课时', 'Untitled Lesson');
  }

  bool _looksLikePlaceholderLessonTitle(String title) {
    final normalized = title.trim().toLowerCase();
    if (normalized.isEmpty) return true;
    if (normalized == 'untitled lesson' || normalized == 'untitled course') {
      return true;
    }
    return RegExp(r'^(page|lesson)\s+\d+$').hasMatch(normalized);
  }

  void _editLessonTitle(
    BuildContext context,
    WidgetRef ref,
    Course course,
    int lessonIndex,
    String currentTitle,
  ) {
    final t = BuilderLocalizations(ref.read(languageProvider));
    final lesson = course.getLesson(lessonIndex);
    final initialTitle = (lesson?.title.trim().isNotEmpty ?? false)
        ? lesson!.title.trim()
        : currentTitle;
    final controller = TextEditingController(text: initialTitle);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.editLessonTitleLabel),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(hintText: t.enterLessonTitle),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              final nextTitle = controller.text.trim();
              if (nextTitle.isNotEmpty) {
                ref
                    .read(courseProvider.notifier)
                    .updateLessonTitle(lessonIndex, nextTitle);
                ref.read(builderStateProvider.notifier).markAsUnsaved();
                if (_entryLessonIndex == lessonIndex) {
                  _entryLessonTitle = nextTitle;
                }
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
        t: t,
        onCourseGenerated: (course) {
          // Load generated course
          ref.read(courseProvider.notifier).loadCourse(course);
          ref
              .read(builderStateProvider.notifier)
              .setCourseTitle(course.metadata.title);
          ref.read(builderStateProvider.notifier).setCurrentLesson(0);
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
      ref.read(builderStateProvider.notifier).setCurrentLesson(0);
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
          title: _tr(t, '导入被结构校验阻止', 'Import blocked by schema validation'),
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

    final sourceCourse = ref.read(courseProvider);
    final course = _courseForPersist(sourceCourse);

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

    final result = _isAddLessonFlow
        ? await SupabaseService.saveLessonToCourse(
            courseId: _courseId!,
            lessonCourse: sourceCourse,
            lessonId: _addFlowLessonId,
          )
        : await SupabaseService.saveCourse(course);

    if (!context.mounted) return;

    // Clear previous SnackBar
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (result.success) {
      if (_isAddLessonFlow) {
        _addFlowLessonId = result.lessonId ?? _addFlowLessonId;
      }
      await _adoptPersistedCourseId(result.courseId, ref);
      if (!context.mounted) return;
      ref.read(builderStateProvider.notifier).markAsSaved();
      final draftStorageId = _activeDraftStorageId;
      if (draftStorageId != null && draftStorageId.isNotEmpty) {
        await StorageService.clearCourseDraft(draftStorageId);
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
          title: _tr(t, '保存被结构校验阻止', 'Save blocked by schema validation'),
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
            title: _tr(
              t,
              '发布被阻止（保存校验失败）',
              'Publish blocked (save validation failed)',
            ),
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
          title: _tr(t, '发布被结构校验阻止', 'Publish blocked by schema validation'),
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
    if (_isAddLessonFlow) return;

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

  String _tr(BuilderLocalizations t, String zh, String en) {
    return t.isZh ? zh : en;
  }
}
