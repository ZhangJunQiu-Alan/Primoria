import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/bottom_nav_bar.dart';
import '../components/common/viewer_page_shell.dart';
import '../components/common/viewer_section_header.dart';
import '../components/common/viewer_surface_card.dart';
import '../providers/user_provider.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import 'search_screen.dart';
import 'courses_screen.dart';
import 'profile_screen.dart';
import 'ai_tutor_screen.dart';
import 'lesson_screen.dart';
import 'course_screen.dart';

/// Home page — ported from Figma HomeScreen template
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const int _tabCount = 5;
  static const int _profileTabIndex = 4;
  int _currentNavIndex = 0;
  final List<GlobalKey<NavigatorState>> _navigatorKeys =
      List<GlobalKey<NavigatorState>>.generate(
        _tabCount,
        (_) => GlobalKey<NavigatorState>(),
      );
  final Set<int> _loadedTabs = <int>{0};
  final ValueNotifier<int> _homeRebuildTick = ValueNotifier<int>(0);

  // Active enrolled course data loaded from backend
  Map<String, dynamic>?
  _course; // row from courses table (nested in enrollment)
  List<Map<String, dynamic>> _chapters = [];
  Set<String> _completedLessonIds = {};
  bool _loadingHome = true;

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  @override
  void dispose() {
    _homeRebuildTick.dispose();
    super.dispose();
  }

  /// Called after the user enrolls in a course from the Library tab.
  /// Switches to the Home tab and refreshes enrolled-course data.
  void _onEnrolled() {
    _switchToTab(0);
    _loadHomeData();
  }

  Widget _buildTabRoot(int index) {
    switch (index) {
      case 0:
        return SafeArea(
          child: ValueListenableBuilder<int>(
            valueListenable: _homeRebuildTick,
            builder: (_, __, ___) => _buildHomeContent(),
          ),
        );
      case 1:
        return SafeArea(child: SearchScreen(onEnrolled: _onEnrolled));
      case 2:
        return const SafeArea(child: CoursesScreen());
      case 3:
        return const SafeArea(child: AiTutorScreen());
      case 4:
        // ProfileScreen manages its own safe area so the banner can bleed to top.
        return const ProfileScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTabNavigator(int index) {
    if (!_loadedTabs.contains(index)) {
      return const SizedBox.shrink();
    }
    return Offstage(
      offstage: _currentNavIndex != index,
      child: TickerMode(
        enabled: _currentNavIndex == index,
        child: Navigator(
          key: _navigatorKeys[index],
          onGenerateRoute: (settings) => MaterialPageRoute<void>(
            builder: (_) => _buildTabRoot(index),
            settings: settings,
          ),
        ),
      ),
    );
  }

  void _handleSystemBackNavigation() {
    final currentNavigator = _navigatorKeys[_currentNavIndex].currentState;
    if (currentNavigator != null && currentNavigator.canPop()) {
      currentNavigator.pop();
      return;
    }
    Navigator.of(context).maybePop();
  }

  void _popTabToRoot(int index) {
    _navigatorKeys[index].currentState?.popUntil((route) => route.isFirst);
  }

  void _switchToTab(int index) {
    if (index == _currentNavIndex) {
      _popTabToRoot(index);
      return;
    }

    if (_currentNavIndex == _profileTabIndex) {
      _popTabToRoot(_profileTabIndex);
    }

    setState(() {
      _currentNavIndex = index;
      _loadedTabs.add(index);
    });
  }

  void _onNavTap(int index) {
    _switchToTab(index);
  }

  Future<T?> _pushOnHomeTab<T>(Route<T> route) {
    final homeNavigator = _navigatorKeys[0].currentState;
    if (homeNavigator != null) {
      return homeNavigator.push(route);
    }
    return Navigator.of(context).push(route);
  }

  Future<void> _loadHomeData() async {
    final userProvider = context.read<UserProvider>();
    try {
      final enrollments = await SupabaseService.getEnrollments().timeout(
        const Duration(seconds: 8),
        onTimeout: () => <Map<String, dynamic>>[],
      );
      await userProvider.refreshStats().timeout(
        const Duration(seconds: 8),
        onTimeout: () {},
      );

      if (!mounted) return;

      Map<String, dynamic>? resolvedCourse;
      var resolvedChapters = <Map<String, dynamic>>[];
      var resolvedCompletedLessonIds = <String>{};

      if (enrollments.isNotEmpty) {
        final enrollment = _toMap(enrollments.first) ?? <String, dynamic>{};
        final courseMap = _toMap(enrollment['courses']);
        final courseId =
            _readString(courseMap?['id']) ??
            _readString(enrollment['course_id']);
        if (courseId != null) {
          final detail = await SupabaseService.getCourseDetail(courseId);
          if (!mounted) return;
          if (detail != null) {
            resolvedCourse = _toMap(detail['course']) ?? courseMap;
            resolvedChapters = _toMapList(detail['chapters']);
            resolvedCompletedLessonIds = _toStringSet(
              detail['completed_lesson_ids'],
            );
          } else {
            resolvedCourse = courseMap;
          }
        } else {
          resolvedCourse = courseMap;
        }
      }

      if (!mounted) return;
      setState(() {
        _course = resolvedCourse;
        _chapters = resolvedChapters;
        _completedLessonIds = resolvedCompletedLessonIds;
        _loadingHome = false;
      });
    } catch (error) {
      debugPrint('[HomeScreen] _loadHomeData failed: $error');
      if (!mounted) return;
      setState(() {
        _course = null;
        _chapters = <Map<String, dynamic>>[];
        _completedLessonIds = <String>{};
        _loadingHome = false;
      });
    } finally {
      if (mounted) {
        _homeRebuildTick.value++;
      }
    }
  }

  bool _isLessonLocked(Map<String, dynamic> lesson) {
    final locked = lesson['is_locked'] == true;
    if (!locked) return false;

    final unlockType = (_readString(lesson['unlock_type']) ?? 'none')
        .trim()
        .toLowerCase();
    final prerequisiteId = _readString(lesson['prerequisite_lesson_id']);
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
      final lessons = _toRawList(ch['lessons']);
      for (final rawLesson in lessons) {
        final lesson = _toMap(rawLesson);
        if (lesson == null) continue;
        final id = _readString(lesson['id']);
        if (id == null) continue;
        if (_completedLessonIds.contains(id)) continue;
        if (_isLessonLocked(lesson)) continue;
        return lesson;
      }
    }
    return null;
  }

  /// Returns the first incomplete lesson ID from chapters, or null.
  String? get _nextLessonId => _readString(_nextAvailableLesson?['id']);

  String? get _nextLessonTitle => _readString(_nextAvailableLesson?['title']);

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _handleSystemBackNavigation();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FC),
        body: Stack(
          fit: StackFit.expand,
          children: List<Widget>.generate(_tabCount, _buildTabNavigator),
        ),
        bottomNavigationBar: BottomNavBar(
          currentIndex: _currentNavIndex,
          onTap: _onNavTap,
        ),
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
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(
                          strokeWidth: 2.8,
                          color: AppColors.indigo600,
                        ),
                        SizedBox(height: 12),
                        Text(
                          'Loading...',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )
                : LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              children: [
                                const SizedBox(height: 4),
                                _buildCourseHero(t),
                              ],
                            ),
                            _buildDrawerPanel(t),
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
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
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF64748B),
                  size: 22,
                ),
                const SizedBox(width: 8),
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

  Widget _buildCourseHero(AppLocalizations t) {
    final courseTitle = _readString(_course?['title']) ?? t.homeStartLearning;
    final subjectColor = _subjectColor(_course);
    final thumbnailUrl = _courseThumbnailUrl(_course);
    final completedCount = _completedLessonIds.length;
    final totalLessons = _chapters
        .expand((ch) => _toRawList(ch['lessons']))
        .length;
    final levelLabel = totalLessons == 0
        ? t.homeExploreCourses
        : t.homeLessonProgress(completedCount, totalLessons);

    return GestureDetector(
      onTap: _course == null
          ? null
          : () => _pushOnHomeTab<void>(
              MaterialPageRoute<void>(
                builder: (_) => CourseScreen(
                  courseId: _readString(_course?['id']),
                  title: courseTitle,
                  description: _readString(_course?['description']),
                ),
              ),
            ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
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
          _buildCourseArtwork(
            thumbnailUrl: thumbnailUrl,
            title: courseTitle,
            subjectColor: subjectColor,
          ),
        ],
      ),
    );
  }

  Widget _buildCourseArtwork({
    required String? thumbnailUrl,
    required String title,
    required Color subjectColor,
  }) {
    if (thumbnailUrl == null) {
      return _buildDefaultCourseArtwork(
        title: title,
        subjectColor: subjectColor,
      );
    }

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: AspectRatio(
        aspectRatio: 16 / 10,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: subjectColor.withValues(alpha: 0.22),
                  blurRadius: 28,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: Image.network(
              thumbnailUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _buildCourseCoverFallbackFill(
                title: title,
                subjectColor: subjectColor,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultCourseArtwork({
    required String title,
    required Color subjectColor,
  }) {
    return Transform.rotate(
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
            _courseInitials(title),
            style: TextStyle(
              fontSize: 64,
              fontWeight: FontWeight.w800,
              color: Colors.white.withValues(alpha: 0.4),
              letterSpacing: -4,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCourseCoverFallbackFill({
    required String title,
    required Color subjectColor,
  }) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            subjectColor.withValues(alpha: 0.94),
            subjectColor.withValues(alpha: 0.78),
            AppColors.indigo,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          _courseInitials(title),
          style: TextStyle(
            fontSize: 68,
            fontWeight: FontWeight.w800,
            color: Colors.white.withValues(alpha: 0.46),
            letterSpacing: -4,
          ),
        ),
      ),
    );
  }

  Widget _buildDrawerPanel(AppLocalizations t) {
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
              continueLabel: canContinue
                  ? t.homeContinueLearning
                  : t.courseLocked,
              onContinue: canContinue
                  ? () => _startLesson(
                      nextLessonId,
                      nextLessonTitle ?? t.lessonDefaultTitle,
                    )
                  : null,
            ),
            const SizedBox(height: 8),
          ],
          if (!hasCourse) ...[
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  _switchToTab(1);
                },
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
                  t.homeBrowseCourses,
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
        ],
      ),
    );
  }

  Widget _buildNextStepCard({
    required AppLocalizations t,
    required String? nextLessonTitle,
    required String continueLabel,
    required VoidCallback? onContinue,
  }) {
    return ViewerSurfaceCard(
      padding: const EdgeInsets.all(16),
      backgroundColor: const Color(0xFFF8FAFF),
      borderSide: const BorderSide(color: Color(0xFFE0E7FF)),
      shadows: const [],
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 760;

          Widget lessonInfo = Row(
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
            ],
          );

          Widget continueButton = ElevatedButton(
            onPressed: onContinue,
            style: ElevatedButton.styleFrom(
              backgroundColor: onContinue != null
                  ? AppColors.indigo600
                  : AppColors.textDisabled,
              foregroundColor: Colors.white,
              minimumSize: const Size(108, 42),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 0,
            ),
            child: Text(
              continueLabel,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.2,
              ),
            ),
          );

          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                lessonInfo,
                const SizedBox(height: 12),
                Align(alignment: Alignment.centerRight, child: continueButton),
              ],
            );
          }

          return Row(
            children: [
              Expanded(child: lessonInfo),
              const SizedBox(width: 14),
              continueButton,
            ],
          );
        },
      ),
    );
  }

  void _startLesson(String? lessonId, String lessonTitle) {
    if (lessonId == null) return;
    _pushOnHomeTab<void>(
      MaterialPageRoute<void>(
        builder: (_) => LessonScreen(
          lessonId: lessonId,
          lessonTitle: lessonTitle,
          gradient: AppColors.indigoGradient,
        ),
      ),
    ).then((_) => _loadHomeData());
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

  Color _subjectColor(Map<String, dynamic>? course) {
    final subject = _normalizeSubject(course?['subjects']);
    final hex = _readString(subject?['color_hex']);
    if (hex == null) return const Color(0xFF3B82F6);
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return const Color(0xFF3B82F6);
    }
  }

  String? _courseThumbnailUrl(Map<String, dynamic>? course) {
    final url = _readString(course?['thumbnail_url']);
    if (url == null) return null;
    return url.isEmpty ? null : url;
  }

  String? _readString(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  Map<String, dynamic>? _toMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      try {
        return Map<String, dynamic>.from(value);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  List<dynamic> _toRawList(dynamic value) {
    if (value is List) return value;
    return const <dynamic>[];
  }

  List<Map<String, dynamic>> _toMapList(dynamic value) {
    if (value is! List) return <Map<String, dynamic>>[];
    return value.map(_toMap).whereType<Map<String, dynamic>>().toList();
  }

  Set<String> _toStringSet(dynamic value) {
    if (value is! List) return <String>{};
    final out = <String>{};
    for (final item in value) {
      final v = _readString(item);
      if (v != null) out.add(v);
    }
    return out;
  }

  Map<String, dynamic>? _normalizeSubject(dynamic value) {
    if (value is List && value.isNotEmpty) {
      return _toMap(value.first);
    }
    return _toMap(value);
  }

  String _courseInitials(String title) {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return 'PR';

    final words = trimmed
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }

    final upperBound = trimmed.length >= 2 ? 2 : 1;
    return trimmed.substring(0, upperBound).toUpperCase();
  }
}
