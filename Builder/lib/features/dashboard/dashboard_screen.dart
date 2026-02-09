import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../services/supabase_service.dart';
import '../../widgets/auth_dialog.dart';
import '../../widgets/profile_dialog.dart';

// ─── Color tokens matching base.css variables ───
class _C {
  _C._();
  static const bg = Color(0xFFF6FBFF);
  static const surface = Color(0xFFFFFFFF);
  static const text = Color(0xFF1C2B33);
  static const muted = Color(0xFF607086);
  static const primary = Color(0xFF58CC02);
  static const accent = Color(0xFF4D7CFF);
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
        border: Border(
          right: BorderSide(color: Color(0x1A506E96)),
        ),
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

              // "Build Course" button
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
                onTap: () =>
                    setState(() => _currentTab = _NavTab.courseManage),
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
                onTap: () =>
                    setState(() => _currentTab = _NavTab.fansManage),
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
            Expanded(
              child: SingleChildScrollView(
                child: _buildPageContent(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopbar(BuildContext context) {
    if (_currentTab == _NavTab.courseManage) {
      return _buildCourseManageTopbar(context);
    }
    // Default dashboard topbar — Profile at right
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        _GhostButton(label: 'Profile', onTap: () => _showProfile(context)),
      ],
    );
  }

  Widget _buildCourseManageTopbar(BuildContext context) {
    return Column(
      children: [
        // Profile row
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            _GhostButton(
                label: 'Profile', onTap: () => _showProfile(context)),
          ],
        ),
        const SizedBox(height: 16),
        // Sort + Create row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _GhostButton(label: 'Sort By time', onTap: () {}),
            _GhostButton(
              label: 'Create Course',
              onTap: () => context.go('/builder'),
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
        return _buildHomePage(); // same as home, anchored to data
      case _NavTab.fansManage:
        return _buildHomePage(); // same as home, anchored to fans
    }
  }

  // ═══════════════════════════════════════════════
  //  Home Page content (dashboard)
  // ═══════════════════════════════════════════════
  Widget _buildHomePage() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Metrics row: Course Data + Income overview
        LayoutBuilder(builder: (context, constraints) {
          final wide = constraints.maxWidth > 700;
          if (wide) {
            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(flex: 3, child: _buildCourseDataCard()),
                  const SizedBox(width: 22),
                  Expanded(flex: 2, child: _buildIncomeCard()),
                ],
              ),
            );
          }
          return Column(
            children: [
              _buildCourseDataCard(),
              const SizedBox(height: 22),
              _buildIncomeCard(),
            ],
          );
        }),
        const SizedBox(height: 24),
        // Comments
        _buildCommentsCard(),
      ],
    );
  }

  Widget _buildCourseDataCard() {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFAFFFFFF), // rgba(255,255,255,0.98)
            Color(0xE6F0F6FF), // rgba(240,246,255,0.9)
          ],
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
          LayoutBuilder(builder: (context, constraints) {
            final crossCount = constraints.maxWidth > 500
                ? 4
                : constraints.maxWidth > 300
                    ? 2
                    : 1;
            return GridView.count(
              crossAxisCount: crossCount,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 18,
              crossAxisSpacing: 18,
              childAspectRatio: 1.2,
              children: const [
                _MetricTile(label: 'fans:', value: 'number'),
                _MetricTile(label: 'likes:', value: 'number'),
                _MetricTile(label: 'share:', value: 'number'),
                _MetricTile(label: 'fans:', value: 'number'),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildIncomeCard() {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFAFFFFFF), // rgba(255,255,255,0.98)
            Color(0xE6FFF7E8), // rgba(255,247,232,0.9)
          ],
        ),
        border: Border.all(
            color: const Color(0x40FFBA49)), // rgba(255,186,73,0.25)
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Income overview',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          SizedBox(height: 18),
          Text(
            'Hold The money:',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: _C.muted,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'number',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentsCard() {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFAFFFFFF), // rgba(255,255,255,0.98)
            Color(0xE6EBF8F0), // rgba(235,248,240,0.9)
          ],
        ),
        border:
            Border.all(color: _C.primary.withValues(alpha: 0.2)),
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
            'Comments',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 18),
          LayoutBuilder(builder: (context, constraints) {
            final crossCount = constraints.maxWidth > 800
                ? 4
                : constraints.maxWidth > 500
                    ? 2
                    : 1;
            return GridView.count(
              crossAxisCount: crossCount,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 18,
              crossAxisSpacing: 18,
              childAspectRatio: 1.4,
              children: List.generate(
                4,
                (_) => const _CommentBlock(),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════
  //  Course Manage content
  // ═══════════════════════════════════════════════
  Widget _buildCourseManage() {
    return _CourseCard(
      title: 'Python',
      updatedAgo: 'Updated 2 days ago',
      learnedTimes: 'Learned 45 times',
      lessonCount: 1,
      onEdit: () => context.go('/builder'),
      onDelete: () {},
      onAddLesson: () => context.go('/builder'),
    );
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
            }
          },
        ),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => const ProfileDialog(),
    );
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
          color: active ? _C.accent.withValues(alpha: 0.12) : Colors.transparent,
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
          border: Border.all(
            color: _C.accent.withValues(alpha: 0.35),
          ),
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
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
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

/// Comment block placeholder
class _CommentBlock extends StatelessWidget {
  const _CommentBlock();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x33506E96)),
      ),
      alignment: Alignment.center,
      child: const Text(
        'Comments Block',
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 14,
          color: _C.muted,
        ),
      ),
    );
  }
}

/// Course card (course-manage page)
class _CourseCard extends StatelessWidget {
  final String title;
  final String updatedAgo;
  final String learnedTimes;
  final int lessonCount;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onAddLesson;

  const _CourseCard({
    required this.title,
    required this.updatedAgo,
    required this.learnedTimes,
    required this.lessonCount,
    required this.onEdit,
    required this.onDelete,
    required this.onAddLesson,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 480),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFAFFFFFF),
            Color(0xE6EEF4FF),
          ],
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
          // Header row
          LayoutBuilder(builder: (context, constraints) {
            final wide = constraints.maxWidth > 500;
            if (wide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _buildSummary()),
                  _buildActions(),
                ],
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSummary(),
                const SizedBox(height: 16),
                _buildActions(),
              ],
            );
          }),
          const SizedBox(height: 24),
          // Lessons
          Wrap(
            spacing: 24,
            runSpacing: 24,
            children: [
              ...List.generate(
                lessonCount,
                (i) => _LessonBox(label: 'Lesson ${i + 1}'),
              ),
              _LessonBox(label: 'Add lesson', dashed: true, onTap: onAddLesson),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummary() {
    return Column(
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
        const SizedBox(height: 12),
        Text(updatedAgo, style: const TextStyle(color: _C.muted, fontSize: 14)),
        const SizedBox(height: 4),
        Text(learnedTimes,
            style: const TextStyle(color: _C.muted, fontSize: 14)),
      ],
    );
  }

  Widget _buildActions() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _GhostButton(label: 'Edit', onTap: onEdit),
        const SizedBox(width: 16),
        _GhostButton(label: 'Delete', onTap: onDelete),
      ],
    );
  }
}

/// Lesson box (200x200)
class _LessonBox extends StatelessWidget {
  final String label;
  final bool dashed;
  final VoidCallback? onTap;

  const _LessonBox({
    required this.label,
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
                  colors: [
                    Color(0x1F4D7CFF), // rgba(77,124,255,0.12)
                    Color(0x1F58CC02), // rgba(88,204,2,0.12)
                  ],
                ),
          color: dashed ? const Color(0x99FFFFFF) : null,
          border: Border.all(
            color: dashed
                ? const Color(0x66506E96) // rgba(80,110,150,0.4)
                : const Color(0x4D506E96), // rgba(80,110,150,0.3)
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
