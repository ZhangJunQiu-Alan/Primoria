import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../theme/design_tokens.dart';
import '../../services/supabase_service.dart';
import '../../services/storage_service.dart';
import '../../services/ai_course_generator.dart';
import '../../services/file_picker_web.dart';
import '../../widgets/auth_dialog.dart';
import '../../widgets/profile_dialog.dart';
import '../../widgets/user_avatar.dart';

// ─── Color tokens matching base.css variables ───
class _C {
  _C._();
  static const bg = Color(0xFFF6FBFF);
  static const surface = Color(0xFFFFFFFF);
  static const text = Color(0xFF1C2B33);
  static const muted = Color(0xFF607086);
  static const primary = Color(0xFF58CC02);
  static const accent = Color(0xFF4D7CFF);
  static const danger = Color(0xFFE53E3E);
}

/// Sidebar navigation items
enum _NavTab { homePage, courseManage, dataCenter, fansManage }

/// Dashboard screen — sidebar + content area
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  _NavTab _currentTab = _NavTab.homePage;
  bool _sidebarOpen = false;

  // Course Manage state
  List<Map<String, dynamic>> _courses = [];
  bool _coursesLoading = false;
  String _sortOrder = 'time'; // 'time', 'student', 'comments'

  // Cache: courseId → list of page titles (lessons)
  final Map<String, List<String>> _courseLessons = {};

  // Dashboard metrics state
  Map<String, int> _metrics = {'fans': 0, 'likes': 0, 'shares': 0, 'income': 0};
  List<Map<String, dynamic>> _comments = [];
  bool _metricsLoading = false;

  @override
  void initState() {
    super.initState();
    _bootstrapProtectedScreen();
  }

  void _bootstrapProtectedScreen() {
    // Access is already guarded by BuilderAccessNotifier + GoRouter redirect.
    // Just kick off data loading.
    _loadCourses();
    _loadDashboardData();
  }

  Future<void> _loadCourses() async {
    if (!SupabaseService.isLoggedIn) return;
    setState(() => _coursesLoading = true);
    try {
      final courses = await SupabaseService.getMyCourses();
      if (mounted) {
        setState(() {
          _courses = courses;
          _coursesLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _coursesLoading = false);
      }
    }
  }

  Future<void> _loadDashboardData() async {
    if (!SupabaseService.isLoggedIn) return;
    setState(() => _metricsLoading = true);
    try {
      final results = await Future.wait([
        SupabaseService.getDashboardMetrics(),
        SupabaseService.getRecentComments(limit: 4),
      ]);
      if (mounted) {
        setState(() {
          _metrics = results[0] as Map<String, int>;
          _comments = results[1] as List<Map<String, dynamic>>;
          _metricsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _metricsLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 1024;

    return Scaffold(
      backgroundColor: _C.bg,
      body: Stack(
        children: [
          Row(
            children: [
              // Sidebar — fixed on wide, hidden on compact
              if (!isCompact) _buildSidebar(context, t),
              // Main content
              Expanded(child: _buildMain(context, t)),
            ],
          ),

          // Mobile sidebar overlay
          if (isCompact && _sidebarOpen) ...[
            GestureDetector(
              onTap: () => setState(() => _sidebarOpen = false),
              child: Container(color: const Color(0x590F1E2D)),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              child: _buildSidebar(context, t),
            ),
          ],
        ],
      ),
      // Mobile menu button
      floatingActionButton: isCompact && !_sidebarOpen
          ? FloatingActionButton.small(
              onPressed: () => setState(() => _sidebarOpen = true),
              backgroundColor: _C.accent,
              child: const Icon(Icons.menu, color: Colors.white),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
    );
  }

  // ═══════════════════════════════════════════════
  //  Sidebar
  // ═══════════════════════════════════════════════
  Widget _buildSidebar(BuildContext context, BuilderLocalizations t) {
    return Container(
      width: 260,
      decoration: const BoxDecoration(
        color: _C.surface,
        border: Border(right: BorderSide(color: Color(0x1A506E96))),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Brand
              Row(
                children: [
                  Image.asset(
                    'assets/imgs/logo32.png',
                    width: 32,
                    height: 32,
                    errorBuilder: (_, __, ___) =>
                        const Icon(Icons.school, color: _C.accent, size: 28),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Primoria',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                      color: _C.text,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // "Build Course" button → navigate to Builder
              _SideAction(
                label: t.sidebarBuildCourse,
                onTap: () => context.go('/builder'),
              ),
              const SizedBox(height: 18),

              // Nav items
              _NavItem(
                label: t.navHomePage,
                active: _currentTab == _NavTab.homePage,
                onTap: () => setState(() => _currentTab = _NavTab.homePage),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navCourseManage,
                active: _currentTab == _NavTab.courseManage,
                onTap: () {
                  setState(() => _currentTab = _NavTab.courseManage);
                  _loadCourses();
                },
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navDataCenter,
                active: _currentTab == _NavTab.dataCenter,
                onTap: () => setState(() => _currentTab = _NavTab.dataCenter),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navFansManage,
                active: _currentTab == _NavTab.fansManage,
                onTap: () => setState(() => _currentTab = _NavTab.fansManage),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════
  //  Main content area
  // ═══════════════════════════════════════════════
  Widget _buildMain(BuildContext context, BuilderLocalizations t) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
        child: Column(
          children: [
            // Topbar
            _buildTopbar(context, t),
            const SizedBox(height: 24),
            // Page content
            Expanded(child: SingleChildScrollView(child: _buildPageContent(t))),
          ],
        ),
      ),
    );
  }

  Widget _buildTopbar(BuildContext context, BuilderLocalizations t) {
    if (_currentTab == _NavTab.courseManage) {
      return _buildCourseManageTopbar(context, t);
    }
    // Default dashboard topbar — avatar at right
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        UserAvatar(
          size: 57,
          onSignedIn: () {
            _loadCourses();
            _loadDashboardData();
          },
        ),
      ],
    );
  }

  String _sortLabel(BuilderLocalizations t) {
    switch (_sortOrder) {
      case 'student':
        return t.sortByStudent;
      case 'comments':
        return t.sortByComments;
      default:
        return t.sortByTime;
    }
  }

  void _applySortOrder() {
    setState(() {
      switch (_sortOrder) {
        case 'student':
          // No real student data yet, keep current order
          break;
        case 'comments':
          // No real comments data yet, keep current order
          break;
        default:
          _courses.sort(
            (a, b) => (b['updated_at'] as String? ?? '').compareTo(
              a['updated_at'] as String? ?? '',
            ),
          );
      }
    });
  }

  Widget _buildCourseManageTopbar(
    BuildContext context,
    BuilderLocalizations t,
  ) {
    return Column(
      children: [
        // Avatar row
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [UserAvatar(size: 57, onSignedIn: _loadCourses)],
        ),
        const SizedBox(height: 16),
        // Sort + Create row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Sort dropdown
            PopupMenuButton<String>(
              onSelected: (value) {
                _sortOrder = value;
                _applySortOrder();
              },
              offset: const Offset(0, 40),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              itemBuilder: (_) => [
                PopupMenuItem(value: 'time', child: Text(t.sortByTime)),
                PopupMenuItem(value: 'student', child: Text(t.sortByStudent)),
                PopupMenuItem(value: 'comments', child: Text(t.sortByComments)),
              ],
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0x2E506E96)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _sortLabel(t),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: _C.text,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(
                      Icons.keyboard_arrow_down,
                      size: 18,
                      color: _C.muted,
                    ),
                  ],
                ),
              ),
            ),
            // Right-side actions: AI Generate (Beta) + Create Course
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _AiBetaButton(
                  label: t.aiGenerateBeta,
                  onTap: () => _showOneSentenceGenerateDialog(t),
                ),
                const SizedBox(width: 10),
                _GhostButton(
                  label: t.createCourse,
                  onTap: () => _showCreateCourseDialog(t),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPageContent(BuilderLocalizations t) {
    switch (_currentTab) {
      case _NavTab.homePage:
        return _buildHomePage(t);
      case _NavTab.courseManage:
        return _buildCourseManage(t);
      case _NavTab.dataCenter:
        return _buildHomePage(t);
      case _NavTab.fansManage:
        return _buildHomePage(t);
    }
  }

  // ═══════════════════════════════════════════════
  //  Home Page content (dashboard)
  // ═══════════════════════════════════════════════
  Widget _buildHomePage(BuilderLocalizations t) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth > 700;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Metrics row: Course Data + Income overview
            if (wide)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: _buildCourseDataCard(wide, t)),
                  const SizedBox(width: 22),
                  Expanded(flex: 2, child: _buildIncomeCard(t)),
                ],
              )
            else ...[
              _buildCourseDataCard(wide, t),
              const SizedBox(height: 22),
              _buildIncomeCard(t),
            ],
            const SizedBox(height: 24),
            // Comments
            _buildCommentsCard(wide, t),
          ],
        );
      },
    );
  }

  Widget _buildCourseDataCard(bool wide, BuilderLocalizations t) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6F0F6FF)],
        ),
        border: Border.all(color: _C.accent.withValues(alpha: 0.2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashCourseData,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 18),
          _metricsLoading
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: _C.accent,
                      ),
                    ),
                  ),
                )
              : Wrap(
                  spacing: 18,
                  runSpacing: 18,
                  children: [
                    _MetricTile(
                      label: t.dashFans,
                      value: '${_metrics['fans'] ?? 0}',
                    ),
                    _MetricTile(
                      label: t.dashLikes,
                      value: '${_metrics['likes'] ?? 0}',
                    ),
                    _MetricTile(
                      label: t.dashShares,
                      value: '${_metrics['shares'] ?? 0}',
                    ),
                  ],
                ),
        ],
      ),
    );
  }

  Widget _buildIncomeCard(BuilderLocalizations t) {
    final income = _metrics['income'] ?? 0;
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6FFF7E8)],
        ),
        border: Border.all(color: const Color(0x40FFBA49)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            t.dashIncomeOverview,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            t.dashHoldMoney,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: _C.muted,
            ),
          ),
          const SizedBox(height: 8),
          _metricsLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFFFBA49),
                  ),
                )
              : Text(
                  '\$$income',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: _C.text,
                  ),
                ),
        ],
      ),
    );
  }

  Widget _buildCommentsCard(bool wide, BuilderLocalizations t) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6EBF8F0)],
        ),
        border: Border.all(color: _C.primary.withValues(alpha: 0.2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with "more" link
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                t.dashComments,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: _C.text,
                ),
              ),
              MouseRegion(
                cursor: SystemMouseCursors.click,
                child: GestureDetector(
                  onTap: () {
                    setState(() => _currentTab = _NavTab.dataCenter);
                  },
                  child: Text(
                    t.dashMore,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _C.accent,
                      decoration: TextDecoration.underline,
                      decorationColor: _C.accent,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _metricsLoading
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: _C.primary,
                      ),
                    ),
                  ),
                )
              : _buildCommentsList(t),
        ],
      ),
    );
  }

  Widget _buildCommentsList(BuilderLocalizations t) {
    if (_comments.isEmpty) {
      return _CommentPlaceholder(label: t.dashNoComments);
    }

    final displayComments = _comments.take(4).toList();
    return Wrap(
      spacing: 18,
      runSpacing: 18,
      children: displayComments.map((c) => _CommentBlock(comment: c)).toList(),
    );
  }

  // ═══════════════════════════════════════════════
  //  Course Manage content
  // ═══════════════════════════════════════════════
  Widget _buildCourseManage(BuilderLocalizations t) {
    if (!SupabaseService.isLoggedIn) {
      return _buildSignInPrompt(t);
    }

    if (_coursesLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(60),
          child: CircularProgressIndicator(color: _C.accent),
        ),
      );
    }

    if (_courses.isEmpty) {
      return _buildEmptyCourses(t);
    }

    return Column(
      children: [
        for (int i = 0; i < _courses.length; i++) ...[
          if (i > 0) const SizedBox(height: 24),
          _buildCourseCard(_courses[i], t),
        ],
      ],
    );
  }

  Widget _buildSignInPrompt(BuilderLocalizations t) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6EEF4FF)],
        ),
        border: Border.all(color: _C.accent.withValues(alpha: 0.2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.lock_outline, size: 48, color: _C.muted),
          const SizedBox(height: 16),
          Text(
            t.signInToManage,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => _showProfile(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: Text(
              t.signIn,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCourses(BuilderLocalizations t) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6EEF4FF)],
        ),
        border: Border.all(color: _C.accent.withValues(alpha: 0.2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.school_outlined, size: 48, color: _C.muted),
          const SizedBox(height: 16),
          Text(
            t.noCoursesYet,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t.createFirstCourse,
            style: const TextStyle(fontSize: 14, color: _C.muted),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => _showCreateCourseDialog(t),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: Text(
              t.createCourse,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  /// Load lesson titles for a single course (async, cached).
  Future<void> _loadCourseLessons(String courseId) async {
    if (_courseLessons.containsKey(courseId)) return;
    try {
      final titles = await SupabaseService.getCourseLessonTitles(courseId);
      if (mounted) {
        setState(() => _courseLessons[courseId] = titles);
      }
    } catch (_) {
      if (mounted) setState(() => _courseLessons[courseId] = []);
    }
  }

  String _formatTimeAgo(String? updatedAt, BuilderLocalizations t) {
    if (updatedAt == null) return '';
    try {
      final dt = DateTime.parse(updatedAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inDays > 0) {
        return t.updatedDaysAgo(diff.inDays);
      } else if (diff.inHours > 0) {
        return t.updatedHoursAgo(diff.inHours);
      }
      return t.updatedJustNow;
    } catch (_) {
      return t.updatedRecently;
    }
  }

  Widget _buildCourseCard(Map<String, dynamic> course, BuilderLocalizations t) {
    final courseId = course['id'] as String;
    final title = course['title'] as String? ?? 'Untitled';
    final updatedAgo = _formatTimeAgo(course['updated_at'] as String?, t);

    // Trigger async lesson loading
    _loadCourseLessons(courseId);
    final lessons = _courseLessons[courseId] ?? [];

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFAFFFFFF), Color(0xE6EEF4FF)],
        ),
        border: Border.all(color: _C.accent.withValues(alpha: 0.2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header: summary + actions ──
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth > 500;

              final summary = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F2D3D),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (updatedAgo.isNotEmpty)
                    Text(
                      updatedAgo,
                      style: const TextStyle(color: _C.muted, fontSize: 14),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    t.learnedTimes(lessons.length),
                    style: const TextStyle(color: _C.muted, fontSize: 14),
                  ),
                ],
              );

              final actions = Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _GhostButton(
                    label: t.courseEdit,
                    onTap: () => _showEditCourseDialog(course, t),
                  ),
                  const SizedBox(width: 16),
                  _GhostButton(
                    label: t.courseDelete,
                    onTap: () => _confirmDeleteCourse(courseId, title, t),
                  ),
                ],
              );

              if (wide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: summary),
                    actions,
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [summary, const SizedBox(height: 16), actions],
              );
            },
          ),

          const SizedBox(height: 24),

          // ── Lesson boxes ──
          Wrap(
            spacing: 24,
            runSpacing: 24,
            children: [
              // Existing lessons
              for (int i = 0; i < lessons.length; i++)
                _LessonBox(
                  lessonLabel: t.lessonN(i + 1),
                  title: _formatLessonCardTitle(lessons[i], courseTitle: title),
                  onTap: () => context.go('/builder?courseId=$courseId'),
                ),
              // "Add lesson" dashed box → opens builder
              _LessonBox(
                title: t.addLesson,
                dashed: true,
                onTap: () => context.go('/builder?courseId=$courseId'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────
  //  AI one-sentence generate dialog (Beta)
  // ─────────────────────────────────────────────────────

  Future<void> _showOneSentenceGenerateDialog(BuilderLocalizations t) async {
    final messenger = ScaffoldMessenger.of(context);
    final descController = TextEditingController();
    String difficulty = 'beginner';
    String animationStyle = 'minimal';
    String audience = 'beginners';
    bool isGenerating = false;
    String? errorMessage;

    await showDialog<void>(
      context: context,
      barrierDismissible: !isGenerating,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final hasText = descController.text.trim().isNotEmpty;

          // ── helpers ──
          Widget _sectionLabel(String text) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _C.muted,
              ),
            ),
          );

          Widget _dropdown<T>({
            required T value,
            required List<DropdownMenuItem<T>> items,
            required ValueChanged<T?> onChanged,
          }) => DropdownButtonFormField<T>(
            value: value,
            items: items,
            onChanged: isGenerating ? null : onChanged,
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            titlePadding: const EdgeInsets.fromLTRB(24, 20, 16, 0),
            contentPadding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            actionsPadding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
            title: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            t.aiGenerateDialogTitle,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 18,
                              color: _C.text,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Orange "Beta" badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF8C00).withValues(
                                alpha: 0.12,
                              ),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: const Color(0xFFFF8C00).withValues(
                                  alpha: 0.5,
                                ),
                              ),
                            ),
                            child: const Text(
                              'Beta',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFCC6600),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        t.aiGenerateDialogSubtitle,
                        style: const TextStyle(
                          fontSize: 13,
                          color: _C.muted,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: isGenerating ? null : () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close, color: _C.muted, size: 20),
                ),
              ],
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Description textarea ──────────────────────────
                    TextField(
                      controller: descController,
                      enabled: !isGenerating,
                      autofocus: true,
                      minLines: 3,
                      maxLines: 6,
                      decoration: InputDecoration(
                        hintText: t.aiGeneratePlaceholder,
                        hintStyle: const TextStyle(
                          fontSize: 13,
                          color: _C.muted,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: _C.accent,
                            width: 1.5,
                          ),
                        ),
                        contentPadding: const EdgeInsets.all(14),
                      ),
                      onChanged: (_) => setDialogState(() {}),
                    ),

                    // ── Options (animate in when text is present) ─────
                    AnimatedSize(
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOut,
                      child: hasText
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const SizedBox(height: 20),
                                // Options header
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.tune_rounded,
                                      size: 15,
                                      color: _C.muted,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      t.aiGenerateOptionsLabel,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: _C.muted,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Difficulty
                                _sectionLabel(t.aiGenerateDifficulty),
                                _dropdown<String>(
                                  value: difficulty,
                                  onChanged: (v) =>
                                      setDialogState(() => difficulty = v!),
                                  items: [
                                    DropdownMenuItem(
                                      value: 'beginner',
                                      child: Text(t.aiGenerateDiffBeginner),
                                    ),
                                    DropdownMenuItem(
                                      value: 'intermediate',
                                      child: Text(
                                        t.aiGenerateDiffIntermediate,
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'advanced',
                                      child: Text(t.aiGenerateDiffAdvanced),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Animation style
                                _sectionLabel(t.aiGenerateStyle),
                                _dropdown<String>(
                                  value: animationStyle,
                                  onChanged: (v) =>
                                      setDialogState(
                                        () => animationStyle = v!,
                                      ),
                                  items: [
                                    DropdownMenuItem(
                                      value: 'minimal',
                                      child: Text(t.aiGenerateStyleMinimal),
                                    ),
                                    DropdownMenuItem(
                                      value: 'cartoon',
                                      child: Text(t.aiGenerateStyleCartoon),
                                    ),
                                    DropdownMenuItem(
                                      value: 'realistic',
                                      child: Text(t.aiGenerateStyleRealistic),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Target audience
                                _sectionLabel(t.aiGenerateAudience),
                                _dropdown<String>(
                                  value: audience,
                                  onChanged: (v) =>
                                      setDialogState(() => audience = v!),
                                  items: [
                                    DropdownMenuItem(
                                      value: 'beginners',
                                      child: Text(
                                        t.aiGenerateAudienceBeginner,
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'intermediate',
                                      child: Text(
                                        t.aiGenerateAudienceIntermediate,
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'advanced',
                                      child: Text(
                                        t.aiGenerateAudienceAdvanced,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            )
                          : const SizedBox.shrink(),
                    ),

                    // ── Error message ─────────────────────────────────
                    if (errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.error.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              size: 16,
                              color: AppColors.error,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                errorMessage!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.error,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isGenerating ? null : () => Navigator.pop(ctx),
                child: Text(
                  t.cancel,
                  style: const TextStyle(color: _C.muted),
                ),
              ),
              ElevatedButton.icon(
                onPressed: isGenerating
                    ? null
                    : () async {
                        final desc = descController.text.trim();
                        if (desc.isEmpty) {
                          setDialogState(
                            () => errorMessage = t.aiGenerateEmptyHint,
                          );
                          return;
                        }
                        setDialogState(() {
                          isGenerating = true;
                          errorMessage = null;
                        });

                        final result =
                            await AICourseGenerator.generateFromDescription(
                          description: desc,
                          difficulty: difficulty,
                          animationStyle: animationStyle,
                          audience: audience,
                        );

                        if (!ctx.mounted) return;

                        if (!result.success || result.course == null) {
                          setDialogState(() {
                            isGenerating = false;
                            errorMessage =
                                result.message.isNotEmpty
                                    ? result.message
                                    : t.aiGenerateFailed;
                          });
                          return;
                        }

                        // Save to Supabase and open in Builder
                        final course = result.course!;
                        final createResult =
                            await SupabaseService.createCourseRow(
                          title: course.metadata.title,
                          description: course.metadata.description,
                          difficultyLevel: course.metadata.difficulty,
                          estimatedMinutes: course.metadata.estimatedMinutes,
                          priceTier: 'free',
                          price: 0,
                        );

                        if (!ctx.mounted) return;

                        if (!createResult.success ||
                            createResult.courseId == null) {
                          setDialogState(() {
                            isGenerating = false;
                            errorMessage = createResult.message;
                          });
                          return;
                        }

                        // Dismiss dialog then navigate
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (messenger.mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(t.aiGenerateSuccess),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        }

                        if (mounted) {
                          // Store the AI-generated content as a local draft so
                          // the Builder can restore it immediately on load.
                          await StorageService.saveCourseDraft(
                            createResult.courseId!,
                            course,
                          );
                          context.go(
                            '/builder?courseId=${createResult.courseId}',
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF8C00),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFFF8C00).withValues(
                    alpha: 0.5,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
                icon: isGenerating
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Icon(Icons.auto_awesome, size: 16),
                label: Text(
                  isGenerating ? t.aiGenerating : t.aiGenerateBtn,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showCreateCourseDialog(BuilderLocalizations t) async {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    final thumbnailController = TextEditingController();
    final hoursController = TextEditingController();
    final priceController = TextEditingController();
    String? titleError;
    String? hoursError;
    String? priceError;
    String difficulty = 'beginner';
    String priceTier = 'free';
    bool isCreating = false;
    // Thumbnail upload state
    String thumbnailMode = 'url'; // 'url' | 'upload'
    Uint8List? pickedImageBytes;
    bool isUploadingImage = false;
    String? imageUploadError;

    final courseId = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final canCreate =
              nameController.text.trim().isNotEmpty &&
              !isCreating &&
              !isUploadingImage;

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Text(
              t.createCourseDialogTitle,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: _C.text,
              ),
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Title ──────────────────────────────────
                    TextField(
                      controller: nameController,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: '${t.courseName} *',
                        hintText: t.courseNameHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: titleError,
                      ),
                      onChanged: (_) => setDialogState(() => titleError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Description ────────────────────────────
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: t.courseDescription,
                        hintText: t.courseDescriptionHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // ── Cover Image ────────────────────────────
                    Row(
                      children: [
                        _ThumbnailModeChip(
                          label: t.uploadImage,
                          icon: Icons.upload_rounded,
                          active: thumbnailMode == 'upload',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'upload'),
                        ),
                        const SizedBox(width: 8),
                        _ThumbnailModeChip(
                          label: t.imageUrl,
                          icon: Icons.link_rounded,
                          active: thumbnailMode == 'url',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'url'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (thumbnailMode == 'upload') ...[
                      GestureDetector(
                        onTap: isUploadingImage
                            ? null
                            : () async {
                                // Read image bytes from browser file picker
                                final result = await pickImageFileBytes();
                                if (!result.success || result.bytes == null) {
                                  setDialogState(
                                    () => imageUploadError = result.message,
                                  );
                                  return;
                                }
                                setDialogState(() {
                                  isUploadingImage = true;
                                  imageUploadError = null;
                                });
                                final (
                                  url,
                                  uploadErr,
                                ) = await SupabaseService.uploadCourseThumbnail(
                                  bytes: result.bytes!,
                                  fileName: result.fileName ?? 'thumbnail.jpg',
                                );
                                setDialogState(() {
                                  isUploadingImage = false;
                                  if (url != null) {
                                    pickedImageBytes = result.bytes;
                                    thumbnailController.text = url;
                                  } else {
                                    imageUploadError =
                                        uploadErr ?? t.imageUploadFailed;
                                  }
                                });
                              },
                        child: _UploadPreviewBox(
                          bytes: pickedImageBytes,
                          isUploading: isUploadingImage,
                          uploadLabel: t.clickToUpload,
                          uploadingLabel: t.uploadingImage,
                          changeLabel: t.changeImage,
                        ),
                      ),
                      if (imageUploadError != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          imageUploadError!,
                          style: const TextStyle(
                            color: _C.danger,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ] else ...[
                      TextField(
                        controller: thumbnailController,
                        decoration: InputDecoration(
                          labelText: t.courseThumbnailUrl,
                          hintText: t.courseThumbnailUrlHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          prefixIcon: const Icon(
                            Icons.image_outlined,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // ── Difficulty ─────────────────────────────
                    DropdownButtonFormField<String>(
                      value: difficulty,
                      decoration: InputDecoration(
                        labelText: '${t.courseDifficulty} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'beginner',
                          child: Text(t.difficultyBeginner),
                        ),
                        DropdownMenuItem(
                          value: 'intermediate',
                          child: Text(t.difficultyIntermediate),
                        ),
                        DropdownMenuItem(
                          value: 'advanced',
                          child: Text(t.difficultyAdvanced),
                        ),
                      ],
                      onChanged: (v) =>
                          setDialogState(() => difficulty = v ?? 'beginner'),
                    ),
                    const SizedBox(height: 16),
                    // ── Estimated Hours ────────────────────────
                    TextField(
                      controller: hoursController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: t.courseEstimatedHours,
                        hintText: t.courseEstimatedHoursHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: hoursError,
                      ),
                      onChanged: (_) => setDialogState(() => hoursError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Price Tier ─────────────────────────────
                    DropdownButtonFormField<String>(
                      value: priceTier,
                      decoration: InputDecoration(
                        labelText: '${t.coursePriceTier} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'free',
                          child: Text(t.priceFree),
                        ),
                        DropdownMenuItem(
                          value: 'premium',
                          child: Text(t.pricePremium),
                        ),
                      ],
                      onChanged: (v) => setDialogState(() {
                        priceTier = v ?? 'free';
                        if (priceTier == 'free') priceError = null;
                      }),
                    ),
                    // ── Price (visible only when premium) ──────
                    AnimatedSize(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeInOut,
                      alignment: Alignment.topCenter,
                      child: priceTier == 'premium'
                          ? Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: TextField(
                                controller: priceController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: '${t.coursePrice} *',
                                  hintText: t.coursePriceHint,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  prefixIcon: const Icon(
                                    Icons.attach_money,
                                    size: 20,
                                  ),
                                  errorText: priceError,
                                ),
                                onChanged: (_) =>
                                    setDialogState(() => priceError = null),
                              ),
                            )
                          : const SizedBox(width: double.infinity),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isCreating ? null : () => Navigator.pop(ctx),
                child: Text(t.cancel),
              ),
              ElevatedButton(
                onPressed: canCreate
                    ? () async {
                        // Validate hours
                        final hoursText = hoursController.text.trim();
                        int? minutes;
                        if (hoursText.isNotEmpty) {
                          final hours = double.tryParse(hoursText);
                          if (hours == null || hours < 0) {
                            setDialogState(
                              () => hoursError = t.isZh
                                  ? '请输入有效数字'
                                  : 'Enter a valid number',
                            );
                            return;
                          }
                          minutes = (hours * 60).round();
                        }
                        // Validate price
                        double parsedPrice = 0;
                        if (priceTier == 'premium') {
                          final priceText = priceController.text.trim();
                          final p = double.tryParse(priceText);
                          if (p == null || p <= 0) {
                            setDialogState(
                              () => priceError = t.isZh
                                  ? '请输入有效价格'
                                  : 'Enter a valid price',
                            );
                            return;
                          }
                          parsedPrice = p;
                        }
                        await _createCourse(
                          title: nameController.text.trim(),
                          description: descController.text.trim(),
                          thumbnailUrl: thumbnailController.text.trim(),
                          difficultyLevel: difficulty,
                          estimatedMinutes: minutes,
                          priceTier: priceTier,
                          price: parsedPrice,
                          ctx: ctx,
                          setDialogState: setDialogState,
                          setTitleError: (e) => titleError = e,
                          setCreating: (v) => isCreating = v,
                        );
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _C.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: isCreating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        t.create,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
              ),
            ],
          );
        },
      ),
    );

    if (courseId != null && mounted) {
      _loadCourses();
    }
  }

  Future<void> _createCourse({
    required String title,
    required String description,
    required String thumbnailUrl,
    required String difficultyLevel,
    required int? estimatedMinutes,
    required String priceTier,
    required double price,
    required BuildContext ctx,
    required void Function(void Function()) setDialogState,
    required void Function(String?) setTitleError,
    required void Function(bool) setCreating,
  }) async {
    setDialogState(() {
      setCreating(true);
      setTitleError(null);
    });

    final result = await SupabaseService.createCourseRow(
      title: title,
      description: description.isNotEmpty ? description : null,
      thumbnailUrl: thumbnailUrl.isNotEmpty ? thumbnailUrl : null,
      difficultyLevel: difficultyLevel,
      estimatedMinutes: estimatedMinutes,
      priceTier: priceTier,
      price: price,
    );

    if (!ctx.mounted) return;

    if (result.success) {
      Navigator.pop(ctx, result.courseId);
    } else {
      setDialogState(() {
        setCreating(false);
        setTitleError(result.message);
      });
    }
  }

  Future<void> _confirmDeleteCourse(
    String courseId,
    String title,
    BuilderLocalizations t,
  ) async {
    // Capture messenger before any async gap so it remains safe to use
    // even if this widget is deactivated while the dialog / network call runs.
    final messenger = ScaffoldMessenger.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(t.deleteCourseTitle),
        content: Text(t.deleteConfirm(title)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.danger,
              foregroundColor: Colors.white,
            ),
            child: Text(t.delete),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final result = await SupabaseService.deleteCourse(courseId);
      if (!messenger.mounted) return;
      if (result.success) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(t.courseDeleted),
            backgroundColor: AppColors.success,
          ),
        );
        if (mounted) _loadCourses(); // refresh list
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  String _formatLessonCardTitle(
    String rawTitle, {
    required String courseTitle,
  }) {
    final cleaned = rawTitle.trim();
    if (cleaned.isEmpty) return 'Untitled lesson';

    final base = courseTitle.trim();
    if (base.isEmpty) return cleaned;

    final cleanedLower = cleaned.toLowerCase();
    final baseLower = base.toLowerCase();
    if (!cleanedLower.startsWith(baseLower)) return cleaned;

    var suffix = cleaned.substring(base.length).trimLeft();
    if (suffix.startsWith(':') ||
        suffix.startsWith('-') ||
        suffix.startsWith('—')) {
      suffix = suffix.substring(1).trimLeft();
    }

    return suffix.isNotEmpty ? suffix : cleaned;
  }

  Future<void> _showEditCourseDialog(
    Map<String, dynamic> course,
    BuilderLocalizations t,
  ) async {
    final courseId = course['id'] as String;
    // Capture before async gap (showDialog completes asynchronously).
    final messenger = ScaffoldMessenger.of(context);
    final titleController = TextEditingController(
      text: course['title'] as String? ?? '',
    );
    final descController = TextEditingController(
      text: course['description'] as String? ?? '',
    );
    final thumbnailController = TextEditingController(
      text: course['thumbnail_url'] as String? ?? '',
    );
    final existingMinutes = course['estimated_minutes'] as int? ?? 0;
    final hoursController = TextEditingController(
      text: existingMinutes > 0
          ? (existingMinutes / 60.0).toStringAsFixed(
              existingMinutes % 60 == 0 ? 0 : 1,
            )
          : '',
    );
    final existingPrice = (course['price'] as num?)?.toDouble() ?? 0.0;
    final priceController = TextEditingController(
      text: existingPrice > 0 ? existingPrice.toStringAsFixed(2) : '',
    );
    String difficulty = (course['difficulty_level'] as String?) ?? 'beginner';
    String priceTier = (course['price_tier'] as String?) ?? 'free';
    String? titleError;
    String? hoursError;
    String? priceError;
    bool isSaving = false;
    // Thumbnail upload state
    String thumbnailMode = 'url';
    Uint8List? pickedImageBytes;
    bool isUploadingImage = false;
    String? imageUploadError;

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final canSave =
              titleController.text.trim().isNotEmpty &&
              !isSaving &&
              !isUploadingImage;

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Text(
              t.editCourseDialogTitle,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: _C.text,
              ),
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Title ──────────────────────────────────
                    TextField(
                      controller: titleController,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: '${t.courseName} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: titleError,
                      ),
                      onChanged: (_) => setDialogState(() => titleError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Description ────────────────────────────
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: t.courseDescription,
                        hintText: t.courseDescriptionHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // ── Cover Image ────────────────────────────
                    Row(
                      children: [
                        _ThumbnailModeChip(
                          label: t.uploadImage,
                          icon: Icons.upload_rounded,
                          active: thumbnailMode == 'upload',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'upload'),
                        ),
                        const SizedBox(width: 8),
                        _ThumbnailModeChip(
                          label: t.imageUrl,
                          icon: Icons.link_rounded,
                          active: thumbnailMode == 'url',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'url'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (thumbnailMode == 'upload') ...[
                      GestureDetector(
                        onTap: isUploadingImage
                            ? null
                            : () async {
                                // Read image bytes from browser file picker
                                final result = await pickImageFileBytes();
                                if (!result.success || result.bytes == null) {
                                  setDialogState(
                                    () => imageUploadError = result.message,
                                  );
                                  return;
                                }
                                setDialogState(() {
                                  isUploadingImage = true;
                                  imageUploadError = null;
                                });
                                final (
                                  url,
                                  uploadErr,
                                ) = await SupabaseService.uploadCourseThumbnail(
                                  bytes: result.bytes!,
                                  fileName: result.fileName ?? 'thumbnail.jpg',
                                );
                                setDialogState(() {
                                  isUploadingImage = false;
                                  if (url != null) {
                                    pickedImageBytes = result.bytes;
                                    thumbnailController.text = url;
                                  } else {
                                    imageUploadError =
                                        uploadErr ?? t.imageUploadFailed;
                                  }
                                });
                              },
                        child: _UploadPreviewBox(
                          bytes: pickedImageBytes,
                          isUploading: isUploadingImage,
                          uploadLabel: t.clickToUpload,
                          uploadingLabel: t.uploadingImage,
                          changeLabel: t.changeImage,
                        ),
                      ),
                      if (imageUploadError != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          imageUploadError!,
                          style: const TextStyle(
                            color: _C.danger,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ] else ...[
                      TextField(
                        controller: thumbnailController,
                        decoration: InputDecoration(
                          labelText: t.courseThumbnailUrl,
                          hintText: t.courseThumbnailUrlHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          prefixIcon: const Icon(
                            Icons.image_outlined,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // ── Difficulty ─────────────────────────────
                    DropdownButtonFormField<String>(
                      value: difficulty,
                      decoration: InputDecoration(
                        labelText: '${t.courseDifficulty} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'beginner',
                          child: Text(t.difficultyBeginner),
                        ),
                        DropdownMenuItem(
                          value: 'intermediate',
                          child: Text(t.difficultyIntermediate),
                        ),
                        DropdownMenuItem(
                          value: 'advanced',
                          child: Text(t.difficultyAdvanced),
                        ),
                      ],
                      onChanged: (v) =>
                          setDialogState(() => difficulty = v ?? 'beginner'),
                    ),
                    const SizedBox(height: 16),
                    // ── Estimated Hours ────────────────────────
                    TextField(
                      controller: hoursController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: t.courseEstimatedHours,
                        hintText: t.courseEstimatedHoursHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: hoursError,
                      ),
                      onChanged: (_) => setDialogState(() => hoursError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Price Tier ─────────────────────────────
                    DropdownButtonFormField<String>(
                      value: priceTier,
                      decoration: InputDecoration(
                        labelText: '${t.coursePriceTier} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'free',
                          child: Text(t.priceFree),
                        ),
                        DropdownMenuItem(
                          value: 'premium',
                          child: Text(t.pricePremium),
                        ),
                      ],
                      onChanged: (v) => setDialogState(() {
                        priceTier = v ?? 'free';
                        if (priceTier == 'free') priceError = null;
                      }),
                    ),
                    // ── Price (visible only when premium) ──────
                    AnimatedSize(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeInOut,
                      alignment: Alignment.topCenter,
                      child: priceTier == 'premium'
                          ? Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: TextField(
                                controller: priceController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: '${t.coursePrice} *',
                                  hintText: t.coursePriceHint,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  prefixIcon: const Icon(
                                    Icons.attach_money,
                                    size: 20,
                                  ),
                                  errorText: priceError,
                                ),
                                onChanged: (_) =>
                                    setDialogState(() => priceError = null),
                              ),
                            )
                          : const SizedBox(width: double.infinity),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.pop(ctx, false),
                child: Text(t.cancel),
              ),
              ElevatedButton(
                onPressed: canSave
                    ? () async {
                        // Validate hours
                        final hoursText = hoursController.text.trim();
                        int? minutes;
                        if (hoursText.isNotEmpty) {
                          final hours = double.tryParse(hoursText);
                          if (hours == null || hours < 0) {
                            setDialogState(
                              () => hoursError = t.isZh
                                  ? '请输入有效数字'
                                  : 'Enter a valid number',
                            );
                            return;
                          }
                          minutes = (hours * 60).round();
                        }
                        // Validate price
                        double parsedPrice = 0;
                        if (priceTier == 'premium') {
                          final priceText = priceController.text.trim();
                          final p = double.tryParse(priceText);
                          if (p == null || p <= 0) {
                            setDialogState(
                              () => priceError = t.isZh
                                  ? '请输入有效价格'
                                  : 'Enter a valid price',
                            );
                            return;
                          }
                          parsedPrice = p;
                        }
                        setDialogState(() {
                          isSaving = true;
                          titleError = null;
                        });
                        final result = await SupabaseService.updateCourseInfo(
                          courseId: courseId,
                          title: titleController.text.trim(),
                          description: descController.text.trim(),
                          thumbnailUrl: thumbnailController.text.trim(),
                          difficultyLevel: difficulty,
                          estimatedMinutes: minutes,
                          priceTier: priceTier,
                          price: parsedPrice,
                        );
                        if (!ctx.mounted) return;
                        if (result.success) {
                          Navigator.pop(ctx, true);
                          return;
                        }
                        setDialogState(() {
                          isSaving = false;
                          titleError = result.message;
                        });
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _C.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        t.save,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
              ),
            ],
          );
        },
      ),
    );

    if (updated == true && messenger.mounted) {
      final t2 = BuilderLocalizations(ref.read(languageProvider));
      messenger.showSnackBar(
        SnackBar(
          content: Text(t2.courseInfoUpdated),
          backgroundColor: AppColors.success,
        ),
      );
      if (mounted) _loadCourses();
    }
  }

  void _showProfile(BuildContext context) {
    if (!SupabaseService.isLoggedIn) {
      // Capture messenger before the dialog opens (async boundary).
      final messenger = ScaffoldMessenger.of(context);
      showDialog(
        context: context,
        builder: (ctx) => AuthDialog(
          onSuccess: () {
            if (messenger.mounted) {
              final t = BuilderLocalizations(ref.read(languageProvider));
              messenger.showSnackBar(
                SnackBar(
                  content: Text(t.signedIn),
                  backgroundColor: AppColors.success,
                ),
              );
              if (mounted) {
                _loadCourses();
                _loadDashboardData();
              }
            }
          },
        ),
      );
      return;
    }
    showDialog(context: context, builder: (ctx) => const ProfileDialog());
  }
}

// ═══════════════════════════════════════════════════
//  Reusable widgets
// ═══════════════════════════════════════════════════

/// Sidebar nav item
class _NavItem extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _NavItem({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: active
              ? _C.accent.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: active ? _C.accent : _C.muted,
          ),
        ),
      ),
    );
  }
}

/// "Build Course" side action button
class _SideAction extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _SideAction({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: LinearGradient(
            colors: [
              _C.primary.withValues(alpha: 0.18),
              _C.accent.withValues(alpha: 0.18),
            ],
          ),
          border: Border.all(color: _C.accent.withValues(alpha: 0.35)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: _C.text,
          ),
        ),
      ),
    );
  }
}

/// Ghost-style button (outlined, no fill)
class _GhostButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _GhostButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: _C.text,
        side: const BorderSide(color: Color(0x2E506E96)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
      ),
      child: Text(label),
    );
  }
}

/// Single metric tile
class _MetricTile extends StatelessWidget {
  final String label;
  final String value;

  const _MetricTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 90,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x2E506E96)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: _C.muted,
            ),
          ),
        ],
      ),
    );
  }
}

/// Dashed placeholder when no comments exist
class _CommentPlaceholder extends StatelessWidget {
  final String label;
  const _CommentPlaceholder({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 100,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0x66506E96),
          width: 2,
          strokeAlign: BorderSide.strokeAlignInside,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
          color: _C.muted,
        ),
      ),
    );
  }
}

/// Comment block showing real feedback data
class _CommentBlock extends StatelessWidget {
  final Map<String, dynamic> comment;

  const _CommentBlock({required this.comment});

  @override
  Widget build(BuildContext context) {
    final username = comment['username'] as String? ?? 'User';
    final text = comment['comment'] as String? ?? '';
    final rating = comment['rating'] as int? ?? 0;
    final createdAt = comment['created_at'] as String?;
    final avatarUrl = comment['avatar_url'] as String?;

    String timeAgo = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt);
        final diff = DateTime.now().difference(dt);
        if (diff.inDays > 0) {
          timeAgo = '${diff.inDays}d ago';
        } else if (diff.inHours > 0) {
          timeAgo = '${diff.inHours}h ago';
        } else {
          timeAgo = 'just now';
        }
      } catch (_) {}
    }

    return Container(
      width: 260,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x33506E96)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // User row
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: _C.accent.withValues(alpha: 0.15),
                backgroundImage: avatarUrl != null
                    ? NetworkImage(avatarUrl)
                    : null,
                child: avatarUrl == null
                    ? Text(
                        username.isNotEmpty ? username[0].toUpperCase() : '?',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _C.accent,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  username,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _C.text,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (timeAgo.isNotEmpty)
                Text(
                  timeAgo,
                  style: const TextStyle(fontSize: 11, color: _C.muted),
                ),
            ],
          ),
          const SizedBox(height: 8),
          // Rating stars
          Row(
            children: List.generate(
              5,
              (i) => Icon(
                i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                size: 14,
                color: i < rating
                    ? const Color(0xFFFFBA49)
                    : const Color(0xFFCCD3DD),
              ),
            ),
          ),
          if (text.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              text,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: _C.muted),
            ),
          ],
        ],
      ),
    );
  }
}

/// Lesson box (200x200)
class _LessonBox extends StatelessWidget {
  final String title;
  final String? lessonLabel;
  final bool dashed;
  final VoidCallback? onTap;

  const _LessonBox({
    required this.title,
    this.lessonLabel,
    this.dashed = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 200,
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: dashed
              ? null
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0x1F4D7CFF), Color(0x1F58CC02)],
                ),
          color: dashed ? const Color(0x99FFFFFF) : null,
          border: Border.all(
            color: dashed ? const Color(0x66506E96) : const Color(0x4D506E96),
            width: dashed ? 2 : 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          child: Center(
            child: dashed
                ? Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: _C.muted,
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (lessonLabel != null) ...[
                        Text(
                          lessonLabel!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: _C.muted,
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          height: 1.35,
                          color: _C.text,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

// ─── Thumbnail mode toggle chip ────────────────────────────────────────────
class _ThumbnailModeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ThumbnailModeChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? _C.accent : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? _C.accent : _C.muted.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: active ? Colors.white : _C.muted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : _C.muted,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Upload preview box ────────────────────────────────────────────────────
class _UploadPreviewBox extends StatelessWidget {
  final Uint8List? bytes;
  final bool isUploading;
  final String uploadLabel;
  final String uploadingLabel;
  final String changeLabel;

  const _UploadPreviewBox({
    required this.bytes,
    required this.isUploading,
    required this.uploadLabel,
    required this.uploadingLabel,
    required this.changeLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF6F8FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _C.accent.withValues(alpha: 0.25),
          width: 1.5,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: isUploading
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(
                  color: _C.accent,
                  strokeWidth: 2.5,
                ),
                const SizedBox(height: 12),
                Text(
                  uploadingLabel,
                  style: const TextStyle(color: _C.muted, fontSize: 13),
                ),
              ],
            )
          : bytes != null
          ? Stack(
              fit: StackFit.expand,
              children: [
                Image.memory(bytes!, fit: BoxFit.cover),
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.swap_horiz_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          changeLabel,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.add_photo_alternate_outlined,
                  size: 36,
                  color: _C.muted.withValues(alpha: 0.7),
                ),
                const SizedBox(height: 8),
                Text(
                  uploadLabel,
                  style: const TextStyle(color: _C.muted, fontSize: 13),
                ),
              ],
            ),
    );
  }
}

/// Orange pill button with a β badge — entry point for AI one-sentence generation.
class _AiBetaButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _AiBetaButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: const LinearGradient(
            colors: [Color(0xFFFF8C00), Color(0xFFFFAA33)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF8C00).withValues(alpha: 0.28),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome, size: 14, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
