import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../components/course/chapter_node.dart';
import '../components/course/course_header.dart';
import '../services/supabase_service.dart';
import 'lesson_screen.dart';

/// Course detail page - Brilliant style learning path (live DB data)
class CourseScreen extends StatefulWidget {
  final String? courseId;
  final String? title;
  final String? description;
  final LinearGradient? gradient;
  final IconData? icon;

  const CourseScreen({
    super.key,
    this.courseId,
    this.title,
    this.description,
    this.gradient,
    this.icon,
  });

  @override
  State<CourseScreen> createState() => _CourseScreenState();
}

class _CourseScreenState extends State<CourseScreen> {
  Map<String, dynamic>? _courseData;
  List<Map<String, dynamic>> _chapters = [];
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
        _chapters =
            List<Map<String, dynamic>>.from(detail['chapters'] as List? ?? []);
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

  ChapterData _toChapterData(Map<String, dynamic> chapter, int index) {
    final lessons =
        (chapter['lessons'] as List? ?? []).cast<Map<String, dynamic>>();
    final total = lessons.length;
    final completed = lessons
        .where((l) => _completedLessonIds.contains(l['id'] as String))
        .length;
    final progress = total == 0 ? 0.0 : completed / total;

    final ChapterStatus status;
    if (total == 0 || completed == 0) {
      status = ChapterStatus.available;
    } else if (completed == total) {
      status = ChapterStatus.completed;
    } else {
      status = ChapterStatus.inProgress;
    }

    return ChapterData(
      id: chapter['id'] as String? ?? '$index',
      title: chapter['title'] as String? ?? 'Chapter ${index + 1}',
      subtitle: total == 0 ? 'No lessons' : '$total lesson${total == 1 ? '' : 's'}',
      progress: progress,
      status: status,
    );
  }

  // ── Actions ───────────────────────────────────────────────────

  Future<void> _enroll() async {
    if (widget.courseId == null) return;
    setState(() => _enrolling = true);
    final ok = await SupabaseService.enrollInCourse(widget.courseId!);
    if (!mounted) return;
    if (ok) await _loadCourseData();
    if (mounted) setState(() => _enrolling = false);
  }

  void _showChapterDetail(
      BuildContext context, Map<String, dynamic> rawChapter, ChapterData chapter) {
    final lessons =
        (rawChapter['lessons'] as List? ?? []).cast<Map<String, dynamic>>();

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        maxChildSize: 0.85,
        minChildSize: 0.35,
        builder: (_, scrollCtrl) => ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: AppRadius.borderRadiusFull,
                ),
              ),
            ),
            AppSpacing.verticalGapLg,
            Text(chapter.title, style: AppTypography.headline2),
            AppSpacing.verticalGapSm,
            Text(chapter.subtitle, style: AppTypography.body2),
            AppSpacing.verticalGapLg,

            // Lesson list
            if (lessons.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'No lessons in this chapter yet.',
                  style: AppTypography.body2
                      .copyWith(color: AppColors.textSecondary),
                ),
              )
            else
              ...lessons.map((lesson) {
                final lessonId = lesson['id'] as String? ?? '';
                final lessonTitle = lesson['title'] as String? ?? 'Lesson';
                final isDone = _completedLessonIds.contains(lessonId);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isDone ? AppColors.success : AppColors.border,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isDone ? Icons.check : Icons.play_arrow_rounded,
                      color: isDone ? Colors.white : AppColors.textSecondary,
                      size: 18,
                    ),
                  ),
                  title: Text(
                    lessonTitle,
                    style: AppTypography.body1.copyWith(
                      color: isDone
                          ? AppColors.textSecondary
                          : AppColors.textPrimary,
                      decoration:
                          isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right,
                      color: AppColors.textSecondary),
                  onTap: () {
                    Navigator.pop(ctx);
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
                  },
                );
              }),

            AppSpacing.verticalGapLg,

            // Continue / Review button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: lessons.isEmpty
                    ? null
                    : () {
                        Navigator.pop(ctx);
                        // First incomplete lesson in this chapter
                        Map<String, dynamic>? next;
                        for (final l in lessons) {
                          if (!_completedLessonIds
                              .contains(l['id'] as String)) {
                            next = l;
                            break;
                          }
                        }
                        // Fall back to first lesson if all complete (review)
                        final target = next ?? lessons.first;
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => LessonScreen(
                              lessonId: target['id'] as String?,
                              lessonTitle: target['title'] as String?,
                              gradient: _gradient,
                            ),
                          ),
                        ).then((_) => _loadCourseData());
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _gradient.colors.first,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  chapter.status == ChapterStatus.completed
                      ? 'Review Chapter'
                      : 'Continue Learning',
                  style: AppTypography.button,
                ),
              ),
            ),
            AppSpacing.verticalGapMd,
          ],
        ),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final chapters = _chapters
        .asMap()
        .entries
        .map((e) => _toChapterData(e.value, e.key))
        .toList();
    final completedChapters =
        chapters.where((c) => c.status == ChapterStatus.completed).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Course header
          SliverToBoxAdapter(
            child: CourseHeader(
              title: _title,
              description: _description,
              gradient: _gradient,
              icon: _icon,
              totalChapters: chapters.length,
              completedChapters: completedChapters,
              onBack: () => Navigator.pop(context),
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
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.add_circle_outline),
                    label: Text(_enrolling ? 'Enrolling…' : 'Enroll in Course'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.indigo600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                  ),
                ),
              ),
            ),

          // Section title
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text('Learning Path', style: AppTypography.headline3),
            ),
          ),

          // Chapter nodes
          if (chapters.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Text(
                  'No chapters available yet.',
                  style: AppTypography.body2
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final chapter = chapters[index];
                    return ChapterNode(
                      chapter: chapter,
                      index: index,
                      isLast: index == chapters.length - 1,
                      gradient: _gradient,
                      onTap: () => _showChapterDetail(
                          context, _chapters[index], chapter),
                    );
                  },
                  childCount: chapters.length,
                ),
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
        ],
      ),
    );
  }
}
