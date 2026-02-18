import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/common/bottom_nav_bar.dart';
import '../providers/user_provider.dart';
import '../services/supabase_service.dart';
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
  Map<String, dynamic>? _course; // row from courses table (nested in enrollment)
  List<Map<String, dynamic>> _chapters = [];
  Set<String> _completedLessonIds = {};
  bool _loadingHome = true;

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  Future<void> _loadHomeData() async {
    final enrollments = await SupabaseService.getEnrollments();
    if (!mounted) return;

    if (enrollments.isNotEmpty) {
      final enrollment = enrollments.first;
      final courseMap = enrollment['courses'] as Map<String, dynamic>?;
      final courseId = (courseMap?['id'] ?? enrollment['course_id']) as String?;
      if (courseId != null) {
        final detail = await SupabaseService.getCourseDetail(courseId);
        if (detail != null && mounted) {
          setState(() {
            _course = courseMap;
            _chapters = List<Map<String, dynamic>>.from(detail['chapters'] ?? []);
            _completedLessonIds = Set<String>.from(
              (detail['completed_lesson_ids'] as List? ?? []).cast<String>(),
            );
          });
        }
      }
    }

    if (mounted) setState(() => _loadingHome = false);
  }

  /// Returns the first incomplete lesson ID from chapters, or null.
  String? get _nextLessonId {
    for (final ch in _chapters) {
      final lessons = (ch['lessons'] as List? ?? []).cast<Map<String, dynamic>>();
      for (final lesson in lessons) {
        final id = lesson['id'] as String;
        if (!_completedLessonIds.contains(id)) return id;
      }
    }
    return null;
  }

  String? get _nextLessonTitle {
    for (final ch in _chapters) {
      final lessons = (ch['lessons'] as List? ?? []).cast<Map<String, dynamic>>();
      for (final lesson in lessons) {
        final id = lesson['id'] as String;
        if (!_completedLessonIds.contains(id)) {
          return lesson['title'] as String?;
        }
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      body: SafeArea(child: _buildContent()),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentNavIndex,
        onTap: (index) => setState(() => _currentNavIndex = index),
      ),
    );
  }

  Widget _buildContent() {
    switch (_currentNavIndex) {
      case 0:
        return _buildHomeContent();
      case 1:
        return const SearchScreen();
      case 2:
        return const CoursesScreen();
      case 3:
        return const ProfileScreen();
      default:
        return _buildHomeContent();
    }
  }

  Widget _buildHomeContent() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _loadingHome
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      child: Column(
                        children: [
                          const SizedBox(height: 8),
                          _buildCourseHero(),
                          _buildDrawerPanel(),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Row(
        children: [
          const Spacer(),
          // XP counter from backend
          Consumer<UserProvider>(
            builder: (context, up, _) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                    Icons.star_rounded,
                    color: Color(0xFFFBBF24),
                    size: 20,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${up.totalXp}',
                    style: AppTypography.label.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF334155),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseHero() {
    final courseTitle = _course?['title'] as String? ?? 'Start Learning';
    final subjectColor = _subjectColor(_course);
    final completedCount = _completedLessonIds.length;
    final totalLessons = _chapters
        .expand((ch) => (ch['lessons'] as List? ?? []))
        .length;
    final levelLabel = totalLessons == 0
        ? 'EXPLORE COURSES'
        : 'LESSON $completedCount / $totalLessons';

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

  Widget _buildDrawerPanel() {
    final chaptersToShow = _chapters.take(2).toList();
    final hasCourse = _course != null;

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
          if (!hasCourse)
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Text(
                'Enroll in a course to start learning!',
                style: TextStyle(
                  fontSize: 14,
                  color: const Color(0xFF94A3B8),
                ),
                textAlign: TextAlign.center,
              ),
            )
          else
            for (int i = 0; i < chaptersToShow.length; i++) ...[
              _buildChapterItem(chaptersToShow[i]),
              if (i < chaptersToShow.length - 1) const SizedBox(height: 24),
            ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: hasCourse
                  ? () {
                      final lessonId = _nextLessonId;
                      final lessonTitle = _nextLessonTitle;
                      if (lessonId != null) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => LessonScreen(
                              lessonId: lessonId,
                              lessonTitle: lessonTitle ?? 'Lesson',
                              gradient: AppColors.indigoGradient,
                            ),
                          ),
                        ).then((_) => _loadHomeData());
                      }
                    }
                  : () => setState(() => _currentNavIndex = 1),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.indigo600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: Text(
                hasCourse ? 'Continue Learning' : 'Browse Courses',
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

  Widget _buildChapterItem(Map<String, dynamic> chapter) {
    final title = chapter['title'] as String? ?? 'Chapter';
    final lessons = (chapter['lessons'] as List? ?? []).cast<Map<String, dynamic>>();
    final lessonCount = lessons.length;
    final completedCount = lessons
        .where((l) => _completedLessonIds.contains(l['id'] as String))
        .length;
    final isCompleted = lessonCount > 0 && completedCount == lessonCount;
    final subtitle = isCompleted
        ? 'Completed'
        : lessonCount == 0
            ? 'No lessons'
            : '$lessonCount lessons';

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
