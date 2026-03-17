import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/course/course_header.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import '../services/supabase_service.dart';
import 'lesson_screen.dart';

/// Course detail page - Brilliant style learning path (live DB data)
class CourseScreen extends StatefulWidget {
  final String? courseId;
  final String? title;
  final String? description;
  final LinearGradient? gradient;
  final IconData? icon;

  /// Called after a successful enrollment so the caller (HomeScreen) can
  /// switch to the Home tab and reload enrolled-course data.
  final VoidCallback? onEnrolled;

  const CourseScreen({
    super.key,
    this.courseId,
    this.title,
    this.description,
    this.gradient,
    this.icon,
    this.onEnrolled,
  });

  @override
  State<CourseScreen> createState() => _CourseScreenState();
}

class _CourseScreenState extends State<CourseScreen> {
  Map<String, dynamic>? _courseData;
  List<Map<String, dynamic>> _lessons = [];
  Set<String> _completedLessonIds = {};
  Map<String, dynamic>? _enrollment;
  bool _loading = true;
  bool _enrolling = false;

  // ── Derived values ────────────────────────────────────────────

  String get _title =>
      widget.title ?? (_courseData?['title'] as String?) ?? 'Course';

  String get _description =>
      widget.description ?? (_courseData?['description'] as String?) ?? '';

  LinearGradient get _gradient {
    if (widget.gradient != null) return widget.gradient!;
    final subject = _courseData?['subjects'] as Map<String, dynamic>?;
    final color = _parseColor(subject?['color_hex'] as String?);
    return LinearGradient(
      colors: [color, color.withValues(alpha: 0.7)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  IconData get _icon => widget.icon ?? Icons.school_rounded;

  // ── Lifecycle ─────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _loadCourseData();
  }

  Future<void> _loadCourseData() async {
    if (widget.courseId == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final detail = await SupabaseService.getCourseDetail(widget.courseId!);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (detail != null) {
        _courseData = detail['course'] as Map<String, dynamic>?;
        _lessons = List<Map<String, dynamic>>.from(
          detail['lessons'] as List? ?? [],
        );
        _completedLessonIds = Set<String>.from(
          (detail['completed_lesson_ids'] as List? ?? []).cast<String>(),
        );
        _enrollment = detail['enrollment'] as Map<String, dynamic>?;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  Color _parseColor(String? hex) {
    if (hex == null) return AppColors.indigo;
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return AppColors.indigo;
    }
  }

  bool _isLessonLocked(Map<String, dynamic> lesson) {
    final locked = lesson['is_locked'] == true;
    if (!locked) return false;

    final unlockType = (lesson['unlock_type'] as String? ?? 'none')
        .trim()
        .toLowerCase();
    final prerequisiteId = lesson['prerequisite_lesson_id'] as String?;
    final prerequisiteDone =
        prerequisiteId != null && _completedLessonIds.contains(prerequisiteId);

    switch (unlockType) {
      case 'prerequisite':
        return !prerequisiteDone;
      case 'paid':
        // Entitlement check will be integrated later.
        return true;
      case 'prerequisite_or_paid':
        // Paid unlock not integrated yet; prerequisite path remains valid.
        return !prerequisiteDone;
      case 'prerequisite_and_paid':
        // Paid unlock not integrated yet.
        return true;
      case 'none':
      default:
        return true;
    }
  }

  String? _lockHintForLesson(Map<String, dynamic> lesson, AppLocalizations t) {
    final unlockType = (lesson['unlock_type'] as String? ?? 'none')
        .trim()
        .toLowerCase();

    switch (unlockType) {
      case 'prerequisite':
        return t.courseLockedPrerequisite;
      case 'paid':
        return t.courseLockedPaid;
      case 'prerequisite_or_paid':
        return t.courseLockedPrerequisiteOrPaid;
      case 'prerequisite_and_paid':
        return t.courseLockedPrerequisiteAndPaid;
      default:
        return t.courseLocked;
    }
  }

  // ── Actions ───────────────────────────────────────────────────

  Future<void> _enroll() async {
    if (widget.courseId == null) return;
    setState(() => _enrolling = true);
    final ok = await SupabaseService.enrollInCourse(widget.courseId!);
    if (!mounted) return;
    setState(() => _enrolling = false);
    if (ok) {
      // Pop back to home screen, then notify HomeScreen to switch to home tab.
      Navigator.pop(context);
      widget.onEnrolled?.call();
    }
  }

  // ── Next lesson helper ────────────────────────────────────────

  /// Returns the first unlocked, incomplete lesson.
  Map<String, dynamic>? get _nextLesson {
    for (final l in _lessons) {
      if (!_completedLessonIds.contains(l['id'] as String) &&
          !_isLessonLocked(l)) {
        return l;
      }
    }
    return null;
  }

  // ── Lesson list ───────────────────────────────────────────────

  Widget _buildLessonList(AppLocalizations t) {
    if (_lessons.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Text(
          t.courseNoChapters,
          style: AppTypography.body2.copyWith(color: AppColors.textSecondary),
        ),
      );
    }

    final nextLessonId = _nextLesson?['id'] as String?;

    return Column(
      children: _lessons.asMap().entries.map((entry) {
        final idx = entry.key;
        final l = entry.value;
        final lessonId = l['id'] as String;
        final lessonTitle = l['title'] as String? ?? 'Lesson';
        return _buildLessonNode(
          lessonId: lessonId,
          lessonTitle: lessonTitle,
          isDone: _completedLessonIds.contains(lessonId),
          isNext: lessonId == nextLessonId,
          isLocked: _isLessonLocked(l),
          lockHint: _lockHintForLesson(l, t) ?? t.courseLocked,
          isLast: idx == _lessons.length - 1,
          t: t,
        );
      }).toList(),
    );
  }

  Widget _buildLessonNode({
    required String lessonId,
    required String lessonTitle,
    required bool isDone,
    required bool isNext,
    required bool isLocked,
    required String lockHint,
    required bool isLast,
    required AppLocalizations t,
  }) {
    final nodeColor = isDone
        ? AppColors.success
        : isLocked
        ? AppColors.surfaceVariant
        : isNext
        ? AppColors.primary
        : AppColors.surface;
    final nodeBorderColor = isDone
        ? AppColors.success
        : isLocked
        ? AppColors.border
        : isNext
        ? AppColors.primary
        : AppColors.border;

    void onTap() {
      if (isLocked) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(lockHint)));
        return;
      }
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LessonScreen(
            lessonId: lessonId,
            lessonTitle: lessonTitle,
            gradient: _gradient,
          ),
        ),
      ).then((_) => _loadCourseData());
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left: circle node + vertical connector
          SizedBox(
            width: 56,
            child: Column(
              children: [
                GestureDetector(
                  onTap: onTap,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: nodeColor,
                      border: Border.all(
                        color: nodeBorderColor,
                        width: isNext ? 3 : 2,
                      ),
                      boxShadow: (isDone || isNext)
                          ? [
                              BoxShadow(
                                color: nodeBorderColor.withValues(alpha: 0.25),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : null,
                    ),
                    child: Center(
                      child: Icon(
                        isDone
                            ? Icons.check_rounded
                            : isLocked
                            ? Icons.lock_outline_rounded
                            : isNext
                            ? Icons.play_arrow_rounded
                            : Icons.radio_button_unchecked,
                        color: (isDone || isNext)
                            ? Colors.white
                            : isLocked
                            ? AppColors.textDisabled
                            : AppColors.textDisabled,
                        size: 22,
                      ),
                    ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 3,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      decoration: BoxDecoration(
                        color: isDone
                            ? AppColors.success.withValues(alpha: 0.35)
                            : AppColors.border,
                        borderRadius: AppRadius.borderRadiusFull,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Right: lesson card
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.md),
              child: GestureDetector(
                onTap: onTap,
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isLocked
                        ? AppColors.surfaceVariant
                        : isNext
                        ? AppColors.primary.withValues(alpha: 0.04)
                        : AppColors.surface,
                    borderRadius: AppRadius.borderRadiusXl,
                    border: isLocked
                        ? Border.all(color: AppColors.border)
                        : isNext
                        ? Border.all(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            width: 1.5,
                          )
                        : Border.all(color: AppColors.border),
                    boxShadow: (isDone || isNext) && !isLocked
                        ? AppShadows.sm
                        : null,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (isLocked) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.textDisabled.withValues(
                                    alpha: 0.12,
                                  ),
                                  borderRadius: AppRadius.borderRadiusSm,
                                ),
                                child: Text(
                                  t.courseLocked,
                                  style: AppTypography.labelSmall.copyWith(
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                            ] else if (isDone) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.success.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: AppRadius.borderRadiusSm,
                                ),
                                child: Text(
                                  t.completed,
                                  style: AppTypography.labelSmall.copyWith(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                            ] else if (isNext) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: AppRadius.borderRadiusSm,
                                ),
                                child: Text(
                                  t.courseUpNext,
                                  style: AppTypography.labelSmall.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                            ],
                            Text(
                              lessonTitle,
                              style: AppTypography.title.copyWith(
                                color: isLocked
                                    ? AppColors.textDisabled
                                    : AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (isLocked) ...[
                              const SizedBox(height: 4),
                              Text(
                                lockHint,
                                style: AppTypography.body2.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Icon(
                        isLocked ? Icons.lock_outline : Icons.chevron_right,
                        color: isLocked
                            ? AppColors.textDisabled
                            : AppColors.textSecondary,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;

    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final completedLessons = _completedLessonIds.length;

    final nextLesson = _nextLesson;
    final subject = _courseData?['subjects'] as Map<String, dynamic>?;
    final difficulty = _courseData?['difficulty_level'] as String?;
    final tags = <String>[];
    if (subject?['name'] != null) tags.add(subject!['name'] as String);
    if (difficulty != null && difficulty.isNotEmpty) tags.add(difficulty);

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: nextLesson != null
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LessonScreen(
                      lessonId: nextLesson['id'] as String,
                      lessonTitle: nextLesson['title'] as String? ?? '',
                      gradient: _gradient,
                    ),
                  ),
                ).then((_) => _loadCourseData());
              },
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 4,
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text(
                t.isZh ? '继续学习' : 'Continue',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            )
          : null,
      body: CustomScrollView(
        slivers: [
          // Course header
          SliverToBoxAdapter(
            child: CourseHeader(
              title: _title,
              description: _description,
              gradient: _gradient,
              icon: _icon,
              totalChapters: _lessons.length,
              completedChapters: completedLessons,
              onBack: () => Navigator.pop(context),
            ),
          ),

          // Tag chips (subject + difficulty)
          if (tags.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Wrap(
                  spacing: 8,
                  children: tags.map((tag) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: AppRadius.borderRadiusFull,
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        tag,
                        style: AppTypography.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

          // Overall progress bar
          if (_lessons.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          t.isZh ? '课程进度' : 'Course Progress',
                          style: AppTypography.body2.copyWith(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '$completedLessons / ${_lessons.length} ${t.isZh ? '节' : 'lessons'}',
                          style: AppTypography.body2.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final total = _lessons.length;
                        final progress =
                            total > 0 ? completedLessons / total : 0.0;
                        return Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: AppColors.border,
                            borderRadius: AppRadius.borderRadiusFull,
                          ),
                          child: Stack(
                            children: [
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 600),
                                curve: Curves.easeInOut,
                                width: constraints.maxWidth * progress,
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: AppRadius.borderRadiusFull,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

          // Enroll button (shown only if not enrolled and courseId is known)
          if (_enrollment == null && widget.courseId != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _enrolling ? null : _enroll,
                    icon: _enrolling
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.add_circle_outline),
                    label: Text(
                      _enrolling ? t.courseEnrolling : t.courseEnroll,
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.indigo600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ),
            ),

          // Section title
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.lg,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              child: Text(t.courseLearningPath, style: AppTypography.headline3),
            ),
          ),

          // Lesson list
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            sliver: SliverToBoxAdapter(
              child: _buildLessonList(t),
            ),
          ),

          // Extra bottom padding for FAB clearance
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
