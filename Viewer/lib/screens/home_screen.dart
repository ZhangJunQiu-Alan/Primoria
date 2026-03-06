import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/bottom_nav_bar.dart';
import '../components/common/viewer_page_shell.dart';
import '../components/common/viewer_section_header.dart';
import '../components/common/viewer_surface_card.dart';
import '../providers/user_provider.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import '../models/daily_task_model.dart';
import '../services/supabase_service.dart';
import '../services/daily_task_service.dart';
import '../theme/theme.dart';
import '../widgets/star_chain_widget.dart';
import '../widgets/daily_task_card.dart';
import 'search_screen.dart';
import 'courses_screen.dart';
import 'profile_screen.dart';
import 'lesson_screen.dart';
import 'course_screen.dart';

/// Home page — ported from Figma HomeScreen template
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;

  // Active enrolled course data loaded from backend
  Map<String, dynamic>?
  _course; // row from courses table (nested in enrollment)
  List<Map<String, dynamic>> _chapters = [];
  Set<String> _completedLessonIds = {};
  bool _loadingHome = true;

  // Gamification data
  Set<String> _activeDates = {};
  List<DailyTask> _dailyTasks = [];

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  /// Called after the user enrolls in a course from the Library tab.
  /// Switches to the Home tab and refreshes enrolled-course data.
  void _onEnrolled() {
    setState(() => _currentNavIndex = 0);
    _loadHomeData();
  }

  Future<void> _loadHomeData() async {
    final userProvider = context.read<UserProvider>();
    final results = await Future.wait([
      SupabaseService.getEnrollments(),
      SupabaseService.getActiveDates(),
      DailyTaskService.loadOrCreateTodayTasks(),
    ]);
    await userProvider.refreshStats();

    if (!mounted) return;

    final enrollments = results[0] as List<Map<String, dynamic>>;
    final activeDates = results[1] as Set<String>;
    final tasks = results[2] as List<DailyTask>;

    Map<String, dynamic>? resolvedCourse;
    var resolvedChapters = <Map<String, dynamic>>[];
    var resolvedCompletedLessonIds = <String>{};

    if (enrollments.isNotEmpty) {
      final enrollment = enrollments.first;
      final courseMap = enrollment['courses'] as Map<String, dynamic>?;
      final courseId = (courseMap?['id'] ?? enrollment['course_id']) as String?;
      if (courseId != null) {
        final detail = await SupabaseService.getCourseDetail(courseId);
        if (!mounted) return;
        if (detail != null) {
          resolvedCourse =
              detail['course'] as Map<String, dynamic>? ?? courseMap;
          resolvedChapters = List<Map<String, dynamic>>.from(
            detail['chapters'] ?? [],
          );
          resolvedCompletedLessonIds = Set<String>.from(
            (detail['completed_lesson_ids'] as List? ?? []).cast<String>(),
          );
        } else {
          resolvedCourse = courseMap;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _course = resolvedCourse;
      _chapters = resolvedChapters;
      _completedLessonIds = resolvedCompletedLessonIds;
      _activeDates = activeDates;
      _dailyTasks = tasks;
      _loadingHome = false;
    });
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
        return true;
      case 'prerequisite_or_paid':
        return !prerequisiteDone;
      case 'prerequisite_and_paid':
        return true;
      case 'none':
      default:
        return true;
    }
  }

  Map<String, dynamic>? get _nextAvailableLesson {
    for (final ch in _chapters) {
      final lessons = (ch['lessons'] as List? ?? [])
          .cast<Map<String, dynamic>>();
      for (final lesson in lessons) {
        final id = lesson['id'] as String;
        if (_completedLessonIds.contains(id)) continue;
        if (_isLessonLocked(lesson)) continue;
        return lesson;
      }
    }
    return null;
  }

  /// Returns the first incomplete lesson ID from chapters, or null.
  String? get _nextLessonId => _nextAvailableLesson?['id'] as String?;

  String? get _nextLessonTitle => _nextAvailableLesson?['title'] as String?;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      body: IndexedStack(
        index: _currentNavIndex,
        children: [
          SafeArea(child: _buildHomeContent()),
          SafeArea(child: SearchScreen(onEnrolled: _onEnrolled)),
          SafeArea(child: const CoursesScreen()),
          // ProfileScreen manages its own safe area so the banner can bleed to top.
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentNavIndex,
        onTap: (index) => setState(() => _currentNavIndex = index),
      ),
    );
  }

  Widget _buildHomeContent() {
    final t = context.watch<LanguageProvider>().t;
    return ViewerPageShell(
      preset: ViewerContentWidthPreset.standard,
      child: Column(
        children: [
          _buildHeader(t),
          Expanded(
            child: _loadingHome
                ? const Center(child: CircularProgressIndicator())
                : CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(child: _buildOverviewStrip(t)),
                      SliverToBoxAdapter(
                        child: Column(
                          children: [
                            const SizedBox(height: 4),
                            _buildCourseHero(t),
                          ],
                        ),
                      ),
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: _buildDrawerPanel(t),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(AppLocalizations t) {
    return Consumer<UserProvider>(
      builder: (context, up, _) {
        final name = up.user?.name.trim();
        final subtitle = (name == null || name.isEmpty)
            ? t.homeStartLearning
            : name;

        return ViewerSectionHeader(
          title: _timeGreeting(t),
          subtitle: subtitle,
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 8),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x08000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.local_fire_department_rounded,
                  color: Color(0xFFF59E0B),
                  size: 18,
                ),
                const SizedBox(width: 6),
                Text(
                  '${up.streak}',
                  style: AppTypography.label.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildOverviewStrip(AppLocalizations t) {
    final totalLessons = _chapters
        .expand((ch) => (ch['lessons'] as List? ?? []))
        .length;
    final completedLessons = _completedLessonIds.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
      child: Consumer<UserProvider>(
        builder: (context, up, _) => ViewerSurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: _buildOverviewItem(
                  icon: Icons.menu_book_rounded,
                  value: totalLessons == 0
                      ? '--'
                      : '$completedLessons/$totalLessons',
                  label: t.homeContinueLearning,
                ),
              ),
              const SizedBox(
                height: 32,
                child: VerticalDivider(
                  width: 20,
                  thickness: 1,
                  color: Color(0xFFF1F5F9),
                ),
              ),
              Expanded(
                child: _buildOverviewItem(
                  icon: Icons.star_rounded,
                  value: _formatCompactNumber(up.totalXp),
                  label: t.profileTotalXp,
                ),
              ),
              const SizedBox(
                height: 32,
                child: VerticalDivider(
                  width: 20,
                  thickness: 1,
                  color: Color(0xFFF1F5F9),
                ),
              ),
              Expanded(
                child: _buildOverviewItem(
                  icon: Icons.local_fire_department_rounded,
                  value: '${up.streak}',
                  label: t.resultStreakLabel,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOverviewItem({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 17, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCourseHero(AppLocalizations t) {
    final courseTitle = _course?['title'] as String? ?? t.homeStartLearning;
    final subjectColor = _subjectColor(_course);
    final completedCount = _completedLessonIds.length;
    final totalLessons = _chapters
        .expand((ch) => (ch['lessons'] as List? ?? []))
        .length;
    final levelLabel = totalLessons == 0
        ? t.homeExploreCourses
        : t.homeLessonProgress(completedCount, totalLessons);

    return GestureDetector(
      onTap: _course == null
          ? null
          : () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CourseScreen(
                  courseId: _course!['id'] as String?,
                  title: courseTitle,
                  description: _course!['description'] as String?,
                ),
              ),
            ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Text(
            courseTitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: AppTypography.headline1.copyWith(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            levelLabel,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.indigo500,
              letterSpacing: 2.0,
            ),
          ),
          const SizedBox(height: 32),
          Transform.rotate(
            angle: 0.1,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    subjectColor,
                    subjectColor.withValues(alpha: 0.7),
                    AppColors.indigo,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(48),
                boxShadow: [
                  BoxShadow(
                    color: subjectColor.withValues(alpha: 0.3),
                    blurRadius: 40,
                    offset: const Offset(0, 20),
                  ),
                ],
                border: Border(
                  top: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                  left: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                ),
              ),
              child: Center(
                child: Text(
                  _courseInitials(courseTitle),
                  style: TextStyle(
                    fontSize: 64,
                    fontWeight: FontWeight.w800,
                    color: Colors.white.withValues(alpha: 0.4),
                    letterSpacing: -4,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerPanel(AppLocalizations t) {
    final chaptersToShow = _chapters.take(2).toList();
    final hasCourse = _course != null;
    final nextLessonId = _nextLessonId;
    final nextLessonTitle = _nextLessonTitle;
    final canContinue = hasCourse && nextLessonId != null;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 48),
      padding: const EdgeInsets.fromLTRB(32, 32, 32, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
        boxShadow: [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 40,
            offset: Offset(0, -10),
          ),
        ],
      ),
      child: Column(
        children: [
          // ── Gamification section ──────────────────────────────
          _buildStarChainSection(t),
          const SizedBox(height: 16),
          DailyTaskCard(tasks: _dailyTasks, t: t),
          const SizedBox(height: 24),
          // ── Course section ────────────────────────────────────
          if (!hasCourse)
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Text(
                t.homeEnrollPrompt,
                style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                textAlign: TextAlign.center,
              ),
            )
          else ...[
            _buildNextStepCard(
              t: t,
              nextLessonTitle: nextLessonTitle,
              canContinue: canContinue,
            ),
            const SizedBox(height: 20),
            for (int i = 0; i < chaptersToShow.length; i++) ...[
              _buildChapterItem(chaptersToShow[i], t),
              if (i < chaptersToShow.length - 1) const SizedBox(height: 24),
            ],
          ],
          const Spacer(),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: !hasCourse
                  ? () => setState(() => _currentNavIndex = 1)
                  : !canContinue
                  ? null
                  : () => _startLesson(
                      nextLessonId,
                      nextLessonTitle ?? t.lessonDefaultTitle,
                    ),
              style: ElevatedButton.styleFrom(
                backgroundColor: hasCourse
                    ? (canContinue
                          ? AppColors.indigo600
                          : AppColors.textDisabled)
                    : AppColors.indigo600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: Text(
                hasCourse
                    ? (canContinue ? t.homeContinueLearning : t.courseLocked)
                    : t.homeBrowseCourses,
                style: AppTypography.button.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildStarChainSection(AppLocalizations t) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t.starChainTitle,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 12),
        StarChainWidget(activeDates: _activeDates),
      ],
    );
  }

  Widget _buildNextStepCard({
    required AppLocalizations t,
    required String? nextLessonTitle,
    required bool canContinue,
  }) {
    return ViewerSurfaceCard(
      padding: const EdgeInsets.all(16),
      backgroundColor: const Color(0xFFF8FAFF),
      borderSide: const BorderSide(color: Color(0xFFE0E7FF)),
      shadows: const [],
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.indigo100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.play_lesson_rounded,
              color: AppColors.indigo600,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.courseUpNext,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  nextLessonTitle ?? t.homeExploreCourses,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.tonal(
            onPressed: !canContinue
                ? null
                : () => _startLesson(
                    _nextLessonId,
                    nextLessonTitle ?? t.lessonDefaultTitle,
                  ),
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              backgroundColor: AppColors.indigo100,
              foregroundColor: AppColors.indigo700,
            ),
            child: Text(t.lessonContinue),
          ),
        ],
      ),
    );
  }

  void _startLesson(String? lessonId, String lessonTitle) {
    if (lessonId == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LessonScreen(
          lessonId: lessonId,
          lessonTitle: lessonTitle,
          gradient: AppColors.indigoGradient,
        ),
      ),
    ).then((_) => _loadHomeData());
  }

  Widget _buildChapterItem(Map<String, dynamic> chapter, AppLocalizations t) {
    final title = chapter['title'] as String? ?? 'Chapter';
    final lessons = (chapter['lessons'] as List? ?? [])
        .cast<Map<String, dynamic>>();
    final lessonCount = lessons.length;
    final completedCount = lessons
        .where((l) => _completedLessonIds.contains(l['id'] as String))
        .length;
    final isCompleted = lessonCount > 0 && completedCount == lessonCount;
    final subtitle = isCompleted
        ? t.completed
        : lessonCount == 0
        ? t.homeNoLessons
        : t.homeLessonCount(lessonCount);

    return Opacity(
      opacity: isCompleted ? 1.0 : 0.7,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.title.copyWith(
                    color: const Color(0xFF1E293B),
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF94A3B8),
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: isCompleted
                  ? const Color(0xFFD1FAE5)
                  : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
              border: isCompleted
                  ? null
                  : Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: isCompleted
                ? Center(
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                  )
                : null,
          ),
        ],
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────

  String _timeGreeting(AppLocalizations t) {
    final hour = DateTime.now().hour;
    if (t.isZh) {
      if (hour < 12) return '早上好';
      if (hour < 18) return '下午好';
      return '晚上好';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  String _formatCompactNumber(int value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}K';
    return '$value';
  }

  Color _subjectColor(Map<String, dynamic>? course) {
    final subject = course?['subjects'] as Map<String, dynamic>?;
    final hex = subject?['color_hex'] as String?;
    if (hex == null) return const Color(0xFF3B82F6);
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return const Color(0xFF3B82F6);
    }
  }

  String _courseInitials(String title) {
    final words = title.trim().split(RegExp(r'\s+'));
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return title.substring(0, title.length.clamp(0, 2)).toUpperCase();
  }
}
