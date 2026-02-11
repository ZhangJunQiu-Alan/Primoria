import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../services/supabase_service.dart';
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
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
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
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 1024;

    return Scaffold(
      backgroundColor: _C.bg,
      body: Stack(
        children: [
          Row(
            children: [
              // Sidebar — fixed on wide, hidden on compact
              if (!isCompact) _buildSidebar(context),
              // Main content
              Expanded(child: _buildMain(context)),
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
              child: _buildSidebar(context),
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
  Widget _buildSidebar(BuildContext context) {
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
                    'assets/images/logo.png',
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
                label: 'Build Course',
                onTap: () => context.go('/builder'),
              ),
              const SizedBox(height: 18),

              // Nav items
              _NavItem(
                label: 'Home Page',
                active: _currentTab == _NavTab.homePage,
                onTap: () => setState(() => _currentTab = _NavTab.homePage),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: 'Course Manage',
                active: _currentTab == _NavTab.courseManage,
                onTap: () {
                  setState(() => _currentTab = _NavTab.courseManage);
                  _loadCourses();
                },
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: 'Data Center',
                active: _currentTab == _NavTab.dataCenter,
                onTap: () => setState(() => _currentTab = _NavTab.dataCenter),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: 'Fans Manage',
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
  Widget _buildMain(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
        child: Column(
          children: [
            // Topbar
            _buildTopbar(context),
            const SizedBox(height: 24),
            // Page content
            Expanded(child: SingleChildScrollView(child: _buildPageContent())),
          ],
        ),
      ),
    );
  }

  Widget _buildTopbar(BuildContext context) {
    if (_currentTab == _NavTab.courseManage) {
      return _buildCourseManageTopbar(context);
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

  String get _sortLabel {
    switch (_sortOrder) {
      case 'student':
        return 'Sort By student';
      case 'comments':
        return 'Sort By comments';
      default:
        return 'Sort By time';
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

  Widget _buildCourseManageTopbar(BuildContext context) {
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
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'time', child: Text('Sort By time')),
                PopupMenuItem(value: 'student', child: Text('Sort By student')),
                PopupMenuItem(
                  value: 'comments',
                  child: Text('Sort By comments'),
                ),
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
                      _sortLabel,
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
            _GhostButton(
              label: 'Create Course',
              onTap: _showCreateCourseDialog,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPageContent() {
    switch (_currentTab) {
      case _NavTab.homePage:
        return _buildHomePage();
      case _NavTab.courseManage:
        return _buildCourseManage();
      case _NavTab.dataCenter:
        return _buildHomePage();
      case _NavTab.fansManage:
        return _buildHomePage();
    }
  }

  // ═══════════════════════════════════════════════
  //  Home Page content (dashboard)
  // ═══════════════════════════════════════════════
  Widget _buildHomePage() {
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
                  Expanded(flex: 3, child: _buildCourseDataCard(wide)),
                  const SizedBox(width: 22),
                  Expanded(flex: 2, child: _buildIncomeCard()),
                ],
              )
            else ...[
              _buildCourseDataCard(wide),
              const SizedBox(height: 22),
              _buildIncomeCard(),
            ],
            const SizedBox(height: 24),
            // Comments
            _buildCommentsCard(wide),
          ],
        );
      },
    );
  }

  Widget _buildCourseDataCard(bool wide) {
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
          const Text(
            'Course Data',
            style: TextStyle(
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
                      label: 'fans:',
                      value: '${_metrics['fans'] ?? 0}',
                    ),
                    _MetricTile(
                      label: 'likes:',
                      value: '${_metrics['likes'] ?? 0}',
                    ),
                    _MetricTile(
                      label: 'shares:',
                      value: '${_metrics['shares'] ?? 0}',
                    ),
                  ],
                ),
        ],
      ),
    );
  }

  Widget _buildIncomeCard() {
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
          const Text(
            'Income overview',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Hold The money:',
            style: TextStyle(
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

  Widget _buildCommentsCard(bool wide) {
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
              const Text(
                'Comments',
                style: TextStyle(
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
                  child: const Text(
                    'more',
                    style: TextStyle(
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
              : _buildCommentsList(),
        ],
      ),
    );
  }

  Widget _buildCommentsList() {
    if (_comments.isEmpty) {
      // No comments: one dashed placeholder
      return const _CommentPlaceholder();
    }

    // Show up to 4 comments
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
  Widget _buildCourseManage() {
    if (!SupabaseService.isLoggedIn) {
      return _buildSignInPrompt();
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
      return _buildEmptyCourses();
    }

    return Column(
      children: [
        for (int i = 0; i < _courses.length; i++) ...[
          if (i > 0) const SizedBox(height: 24),
          _buildCourseCard(_courses[i]),
        ],
      ],
    );
  }

  Widget _buildSignInPrompt() {
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
          const Text(
            'Sign in to manage your courses',
            style: TextStyle(
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
            child: const Text(
              'Sign In',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCourses() {
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
          const Text(
            'No courses yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Create your first course to get started',
            style: TextStyle(fontSize: 14, color: _C.muted),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _showCreateCourseDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: const Text(
              'Create Course',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  /// Load lesson titles for a single course (async, cached).
  /// Queries DB directly so courses with no saved content show 0 lessons.
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

  String _formatTimeAgo(String? updatedAt) {
    if (updatedAt == null) return '';
    try {
      final dt = DateTime.parse(updatedAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inDays > 0) {
        return 'Updated ${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
      } else if (diff.inHours > 0) {
        return 'Updated ${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
      }
      return 'Updated just now';
    } catch (_) {
      return 'Updated recently';
    }
  }

  Widget _buildCourseCard(Map<String, dynamic> course) {
    final courseId = course['id'] as String;
    final title = course['title'] as String? ?? 'Untitled';
    final updatedAgo = _formatTimeAgo(course['updated_at'] as String?);

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
                    'Learned ${lessons.length} times',
                    style: const TextStyle(color: _C.muted, fontSize: 14),
                  ),
                ],
              );

              final actions = Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _GhostButton(
                    label: 'Edit',
                    onTap: () => context.go('/builder?courseId=$courseId'),
                  ),
                  const SizedBox(width: 16),
                  _GhostButton(
                    label: 'Delete',
                    onTap: () => _confirmDeleteCourse(courseId, title),
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
                  label: 'Lesson ${i + 1}',
                  onTap: () => context.go('/builder?courseId=$courseId'),
                ),
              // "Add lesson" dashed box → opens builder
              _LessonBox(
                label: 'Add lesson',
                dashed: true,
                onTap: () => context.go('/builder?courseId=$courseId'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showCreateCourseDialog() async {
    final nameController = TextEditingController();
    String? errorText;
    bool isCreating = false;

    final courseId = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final canCreate =
              nameController.text.trim().isNotEmpty && !isCreating;
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: const Text(
              'Create Course',
              style: TextStyle(fontWeight: FontWeight.w700, color: _C.text),
            ),
            content: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameController,
                    autofocus: true,
                    decoration: InputDecoration(
                      labelText: 'Course Name',
                      hintText: 'e.g. Intro to Python',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      errorText: errorText,
                    ),
                    onChanged: (_) => setDialogState(() {
                      errorText = null;
                    }),
                    onSubmitted: canCreate
                        ? (_) async {
                            await _createCourse(
                              nameController.text.trim(),
                              ctx,
                              setDialogState,
                              (e) => errorText = e,
                              (v) => isCreating = v,
                            );
                          }
                        : null,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isCreating ? null : () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: canCreate
                    ? () async {
                        await _createCourse(
                          nameController.text.trim(),
                          ctx,
                          setDialogState,
                          (e) => errorText = e,
                          (v) => isCreating = v,
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
                    : const Text(
                        'Create',
                        style: TextStyle(fontWeight: FontWeight.w700),
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

  Future<void> _createCourse(
    String name,
    BuildContext ctx,
    void Function(void Function()) setDialogState,
    void Function(String?) setError,
    void Function(bool) setCreating,
  ) async {
    setDialogState(() {
      setCreating(true);
      setError(null);
    });

    final result = await SupabaseService.createCourseRow(title: name);

    if (!ctx.mounted) return;

    if (result.success) {
      Navigator.pop(ctx, result.courseId);
    } else {
      setDialogState(() {
        setCreating(false);
        setError(result.message);
      });
    }
  }

  Future<void> _confirmDeleteCourse(String courseId, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Course'),
        content: Text(
          'Are you sure you want to delete "$title"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final result = await SupabaseService.deleteCourse(courseId);
      if (mounted) {
        if (result.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Course deleted'),
              backgroundColor: AppColors.success,
            ),
          );
          _loadCourses(); // refresh list
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
  }

  void _showProfile(BuildContext context) {
    if (!SupabaseService.isLoggedIn) {
      showDialog(
        context: context,
        builder: (ctx) => AuthDialog(
          onSuccess: () {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Signed in'),
                  backgroundColor: AppColors.success,
                ),
              );
              // Reload data after sign in
              _loadCourses();
              _loadDashboardData();
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
  const _CommentPlaceholder();

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
      child: const Text(
        'No comments yet',
        style: TextStyle(
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
  final String label;
  final bool dashed;
  final VoidCallback? onTap;

  const _LessonBox({required this.label, this.dashed = false, this.onTap});

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
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 15,
            color: dashed ? _C.muted : _C.text,
          ),
        ),
      ),
    );
  }
}
