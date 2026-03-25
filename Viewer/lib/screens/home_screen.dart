import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/bottom_nav_bar.dart';
import '../components/common/viewer_page_shell.dart';
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

/// Home page — ported from Figma HomeScreen template
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const int _tabCount = 5;
  static const int _profileTabIndex = 4;
  static const List<_HomeShowcaseTopic> _homeShowcaseTopics = [
    _HomeShowcaseTopic(
      title: 'Physics Lab',
      meta: '12 lessons · STEM',
      shortLabel: 'Physics',
      icon: Icons.science_rounded,
      startColor: Color(0xFF38BDF8),
      endColor: Color(0xFF2563EB),
    ),
    _HomeShowcaseTopic(
      title: 'Python Foundations',
      meta: '18 lessons · Coding',
      shortLabel: 'Python',
      icon: Icons.code_rounded,
      startColor: Color(0xFF60A5FA),
      endColor: Color(0xFF4338CA),
    ),
    _HomeShowcaseTopic(
      title: 'Circuit Design',
      meta: '10 lessons · Engineering',
      shortLabel: 'Circuits',
      icon: Icons.memory_rounded,
      startColor: Color(0xFF22D3EE),
      endColor: Color(0xFF1D4ED8),
    ),
    _HomeShowcaseTopic(
      title: 'Data Systems',
      meta: '14 lessons · Technology',
      shortLabel: 'Data',
      icon: Icons.dataset_linked_rounded,
      startColor: Color(0xFF818CF8),
      endColor: Color(0xFF2563EB),
    ),
    _HomeShowcaseTopic(
      title: 'Calculus Core',
      meta: '16 lessons · Maths',
      shortLabel: 'Calculus',
      icon: Icons.functions_rounded,
      startColor: Color(0xFF93C5FD),
      endColor: Color(0xFF2563EB),
    ),
    _HomeShowcaseTopic(
      title: 'Robotics Studio',
      meta: '11 lessons · Build',
      shortLabel: 'Robotics',
      icon: Icons.precision_manufacturing_rounded,
      startColor: Color(0xFF7DD3FC),
      endColor: Color(0xFF1E40AF),
    ),
    _HomeShowcaseTopic(
      title: 'Astronomy',
      meta: '9 lessons · Space',
      shortLabel: 'Space',
      icon: Icons.travel_explore_rounded,
      startColor: Color(0xFF38BDF8),
      endColor: Color(0xFF1E3A8A),
    ),
    _HomeShowcaseTopic(
      title: 'Web Systems',
      meta: '15 lessons · Programming',
      shortLabel: 'Web',
      icon: Icons.web_rounded,
      startColor: Color(0xFF60A5FA),
      endColor: Color(0xFF1D4ED8),
    ),
  ];

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
      preset: ViewerContentWidthPreset.fullWidth,
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
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildCourseHero(t),
                            if (_course != null) ...[
                              const SizedBox(height: 22),
                              _buildDrawerPanel(t),
                            ],
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

        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _timeGreeting(t),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEEF4FF), Color(0xFFD9E9FF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFC7DCFF)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0D2563EB),
                      blurRadius: 14,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      color: Color(0xFF2563EB),
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${up.streak}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E3A8A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCourseHero(AppLocalizations t) {
    final courseTitle = _readString(_course?['title']);
    final completedCount = _completedLessonIds.length;
    final totalLessons = _chapters
        .expand((ch) => _toRawList(ch['lessons']))
        .length;
    final progressLabel = courseTitle == null || totalLessons == 0
        ? null
        : t.homeLessonProgress(completedCount, totalLessons);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 1180;
        final desktopHeroHeight = courseTitle == null ? 820.0 : 772.0;
        final heroRadius = BorderRadius.circular(40);
        final heroPadding = EdgeInsets.all(isWide ? 28 : 20);

        return ClipRRect(
          borderRadius: heroRadius,
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF12214F),
                  Color(0xFF1D4ED8),
                  Color(0xFF60A5FA),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: heroRadius,
              border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A1D4ED8),
                  blurRadius: 40,
                  offset: Offset(0, 22),
                ),
              ],
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  top: -120,
                  left: -60,
                  child: _buildHeroGlow(
                    size: 320,
                    color: const Color(0xFF7DD3FC).withValues(alpha: 0.20),
                  ),
                ),
                Positioned(
                  right: -110,
                  top: 64,
                  child: _buildHeroGlow(
                    size: 260,
                    color: const Color(0xFFBFDBFE).withValues(alpha: 0.16),
                  ),
                ),
                Positioned(
                  bottom: -150,
                  left: constraints.maxWidth * 0.22,
                  child: _buildHeroGlow(
                    size: 420,
                    color: const Color(0xFFDBEAFE).withValues(alpha: 0.12),
                  ),
                ),
                Positioned(
                  top: 76,
                  right: 82,
                  child: _buildHeroRing(
                    width: constraints.maxWidth * (isWide ? 0.34 : 0.46),
                    height: isWide ? 160 : 120,
                  ),
                ),
                Positioned(
                  bottom: 44,
                  left: 48,
                  child: _buildHeroRing(
                    width: constraints.maxWidth * (isWide ? 0.28 : 0.38),
                    height: isWide ? 140 : 108,
                  ),
                ),
                Padding(
                  padding: heroPadding,
                  child: isWide
                      ? SizedBox(
                          height: desktopHeroHeight,
                          child: Column(
                            children: [
                              Expanded(
                                child: Center(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      48,
                                      18,
                                      48,
                                      12,
                                    ),
                                    child: _buildHeroCenterContent(
                                      t,
                                      courseTitle: courseTitle,
                                      progressLabel: progressLabel,
                                    ),
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(8, 0, 8, 10),
                                child: _buildShowcaseCardGrid(
                                  topics: _homeShowcaseTopics,
                                  availableWidth:
                                      constraints.maxWidth -
                                      heroPadding.horizontal -
                                      16,
                                ),
                              ),
                            ],
                          ),
                        )
                      : Padding(
                          padding: const EdgeInsets.fromLTRB(6, 12, 6, 6),
                          child: Column(
                            children: [
                              _buildHeroCenterContent(
                                t,
                                courseTitle: courseTitle,
                                progressLabel: progressLabel,
                              ),
                              const SizedBox(height: 28),
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 16,
                                runSpacing: 16,
                                children: _homeShowcaseTopics
                                    .map(
                                      (topic) => SizedBox(
                                        width: constraints.maxWidth < 720
                                            ? constraints.maxWidth - 64
                                            : ((constraints.maxWidth - 64) / 2)
                                                  .clamp(180.0, 240.0),
                                        child: _buildShowcaseCard(topic),
                                      ),
                                    )
                                    .toList(),
                              ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
          ),
        );
      },
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
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width >= 1200 ? 680 : 520,
      ),
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
    final courseTitle = _readString(_course?['title']) ?? t.homeStartLearning;
    final courseDescription =
        _readString(_course?['description']) ?? _homeShowcaseSubtitle(t);
    final subjectColor = _subjectColor(_course);
    final thumbnailUrl = _courseThumbnailUrl(_course);
    final completedCount = _completedLessonIds.length;
    final totalLessons = _chapters
        .expand((ch) => _toRawList(ch['lessons']))
        .length;
    final progressValue = totalLessons == 0
        ? 0.0
        : (completedCount / totalLessons).clamp(0.0, 1.0);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFFD9E8FF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A1D4ED8),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: hasCourse
          ? LayoutBuilder(
              builder: (context, constraints) {
                final isStacked = constraints.maxWidth < 1080;

                final summary = Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF3F8FF), Color(0xFFEEF4FF)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFD7E7FF)),
                  ),
                  child: isStacked
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildCourseArtwork(
                              thumbnailUrl: thumbnailUrl,
                              title: courseTitle,
                              subjectColor: subjectColor,
                            ),
                            const SizedBox(height: 18),
                            _buildCourseSummaryCopy(
                              t,
                              courseTitle: courseTitle,
                              courseDescription: courseDescription,
                              completedCount: completedCount,
                              totalLessons: totalLessons,
                              progressValue: progressValue,
                            ),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              flex: 5,
                              child: _buildCourseArtwork(
                                thumbnailUrl: thumbnailUrl,
                                title: courseTitle,
                                subjectColor: subjectColor,
                              ),
                            ),
                            const SizedBox(width: 18),
                            Expanded(
                              flex: 6,
                              child: _buildCourseSummaryCopy(
                                t,
                                courseTitle: courseTitle,
                                courseDescription: courseDescription,
                                completedCount: completedCount,
                                totalLessons: totalLessons,
                                progressValue: progressValue,
                              ),
                            ),
                          ],
                        ),
                );

                final nextStep = _buildNextStepCard(
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
                );

                if (isStacked) {
                  return Column(
                    children: [summary, const SizedBox(height: 16), nextStep],
                  );
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 7, child: summary),
                    const SizedBox(width: 18),
                    Expanded(flex: 5, child: nextStep),
                  ],
                );
              },
            )
          : const SizedBox.shrink(),
    );
  }

  Widget _buildHeroCenterContent(
    AppLocalizations t, {
    required String? courseTitle,
    required String? progressLabel,
  }) {
    final showEnrollAction = courseTitle == null;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 620),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (courseTitle != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
              ),
              child: Text(
                progressLabel == null
                    ? courseTitle
                    : '$courseTitle · $progressLabel',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Text(
            _homeShowcaseTitle(t),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 62,
              height: 1.02,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -2.4,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            _homeShowcaseSubtitle(t),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              height: 1.45,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.82),
            ),
          ),
          const SizedBox(height: 28),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 14,
            runSpacing: 14,
            children: [
              _buildHeroActionButton(
                label: t.homeBrowseCourses,
                icon: Icons.travel_explore_rounded,
                foregroundColor: const Color(0xFF1D4ED8),
                backgroundColor: Colors.white,
                shadowColor: const Color(0x260F172A),
                onPressed: () => _switchToTab(1),
              ),
              if (showEnrollAction)
                _buildHeroActionButton(
                  label: 'Enroll in a Course',
                  icon: Icons.school_rounded,
                  foregroundColor: Colors.white,
                  backgroundColor: Colors.white.withValues(alpha: 0.12),
                  borderColor: Colors.white.withValues(alpha: 0.22),
                  shadowColor: Colors.transparent,
                  onPressed: () => _switchToTab(1),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroGlow({required double size, required Color color}) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
            stops: const [0, 1],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroRing({required double width, required double height}) {
    return IgnorePointer(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(height),
          border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
        ),
      ),
    );
  }

  Widget _buildShowcaseCardGrid({
    required List<_HomeShowcaseTopic> topics,
    required double availableWidth,
  }) {
    final topRow = topics.take(4).toList();
    final bottomRow = topics.skip(4).take(4).toList();

    return Column(
      children: [
        _buildShowcaseCardGridRow(
          topics: topRow,
          availableWidth: availableWidth,
        ),
        const SizedBox(height: 18),
        _buildShowcaseCardGridRow(
          topics: bottomRow,
          availableWidth: availableWidth,
        ),
      ],
    );
  }

  Widget _buildShowcaseCardGridRow({
    required List<_HomeShowcaseTopic> topics,
    required double availableWidth,
  }) {
    const gap = 18.0;
    final totalGap = gap * (topics.length - 1);
    final cardWidth = ((availableWidth - totalGap) / topics.length)
        .clamp(150.0, 205.0)
        .toDouble();

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List<Widget>.generate(topics.length, (index) {
        return Padding(
          padding: EdgeInsets.only(left: index == 0 ? 0 : gap),
          child: SizedBox(
            width: cardWidth,
            child: _buildShowcaseCard(topics[index]),
          ),
        );
      }),
    );
  }

  Widget _buildShowcaseCard(_HomeShowcaseTopic topic) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.90),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.42)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140F172A),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 112,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [topic.startColor, topic.endColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Stack(
              children: [
                Positioned(
                  top: -18,
                  right: -12,
                  child: Container(
                    width: 78,
                    height: 78,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.14),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -12,
                  left: -8,
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.10),
                    ),
                  ),
                ),
                Positioned(
                  top: 14,
                  left: 14,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.22),
                      ),
                    ),
                  ),
                ),
                Center(
                  child: Icon(
                    topic.icon,
                    size: 42,
                    color: Colors.white.withValues(alpha: 0.96),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.24),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            topic.icon,
                            size: 14,
                            color: Colors.white.withValues(alpha: 0.96),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            topic.shortLabel,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            topic.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            topic.meta,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroActionButton({
    required String label,
    required IconData icon,
    required Color foregroundColor,
    required Color backgroundColor,
    required Color shadowColor,
    Color? borderColor,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(228, 58),
        backgroundColor: backgroundColor,
        foregroundColor: foregroundColor,
        padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        side: borderColor == null ? null : BorderSide(color: borderColor),
        shadowColor: shadowColor,
        elevation: shadowColor == Colors.transparent ? 0 : 4,
      ),
      icon: Icon(icon, size: 22),
      label: Text(
        label,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  Widget _buildCourseSummaryCopy(
    AppLocalizations t, {
    required String courseTitle,
    required String courseDescription,
    required int completedCount,
    required int totalLessons,
    required double progressValue,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Active track',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF2563EB),
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          courseTitle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 24,
            height: 1.1,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            letterSpacing: -0.6,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          courseDescription,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 14,
            height: 1.45,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _buildCourseChip(
              icon: Icons.play_circle_outline_rounded,
              label: totalLessons == 0
                  ? t.homeExploreCourses
                  : '$completedCount / $totalLessons lessons',
            ),
            _buildCourseChip(
              icon: Icons.bolt_rounded,
              label: totalLessons == 0
                  ? 'Ready to begin'
                  : '${(progressValue * 100).round()}% complete',
            ),
          ],
        ),
        const SizedBox(height: 18),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 10,
            value: progressValue,
            backgroundColor: const Color(0xFFDCE8FF),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
          ),
        ),
      ],
    );
  }

  Widget _buildCourseChip({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFD7E7FF)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF2563EB)),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E3A8A),
            ),
          ),
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

  String _homeShowcaseTitle(AppLocalizations t) {
    return t.isZh ? '今天开始学习' : 'Start Learning Today';
  }

  String _homeShowcaseSubtitle(AppLocalizations t) {
    return t.isZh
        ? '探索 STEM、编程与工程课程，在蓝色主题的互动学习路径中持续前进。'
        : 'Explore STEM, coding, and engineering tracks in a cleaner blue learning space built for momentum.';
  }
}

class _HomeShowcaseTopic {
  final String title;
  final String meta;
  final String shortLabel;
  final IconData icon;
  final Color startColor;
  final Color endColor;

  const _HomeShowcaseTopic({
    required this.title,
    required this.meta,
    required this.shortLabel,
    required this.icon,
    required this.startColor,
    required this.endColor,
  });
}
