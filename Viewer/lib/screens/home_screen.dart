import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../components/common/bottom_nav_bar.dart';
import 'search_screen.dart';
import 'courses_screen.dart';
import 'profile_screen.dart';
import 'level_map_screen.dart';
import 'lesson_screen.dart';

/// Home page — ported from Figma HomeScreen template
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;

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
            // Header with star counter
            _buildHeader(),

            // Main content area
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    // Clickable area → LevelMap
                    _buildCourseHero(),

                    // Bottom drawer panel
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
          // Star counter
          Container(
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
                  '5',
                  style: AppTypography.label.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseHero() {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LevelMapScreen()),
        );
      },
      child: Column(
        children: [
          const SizedBox(height: 8),
          // Course title
          Text(
            'Data Structures',
            style: AppTypography.headline1.copyWith(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          // Level badge
          Text(
            'LEVEL 4',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.indigo500,
              letterSpacing: 3.0,
            ),
          ),
          const SizedBox(height: 32),
          // Course logo — blue→indigo gradient block with Python shapes
          Transform.rotate(
            angle: 0.1, // ~6 degrees
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF2563EB),
                    Color(0xFF3B82F6),
                    Color(0xFF4F46E5),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(48),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF4F46E5).withValues(alpha: 0.3),
                    blurRadius: 40,
                    offset: const Offset(0, 20),
                  ),
                ],
                border: Border(
                  top: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                  left: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                ),
              ),
              child: Stack(
                children: [
                  // Internal glow
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(48),
                        gradient: LinearGradient(
                          colors: [
                            Colors.white.withValues(alpha: 0.2),
                            Colors.transparent,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                    ),
                  ),
                  // Python-style geometric shapes
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFBBF24),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(16),
                                  topRight: Radius.circular(16),
                                  bottomLeft: Radius.circular(16),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFFFBBF24,
                                ).withValues(alpha: 0.8),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(16),
                                  topRight: Radius.circular(16),
                                  bottomRight: Radius.circular(16),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFF93C5FD,
                                ).withValues(alpha: 0.8),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(16),
                                  bottomLeft: Radius.circular(16),
                                  bottomRight: Radius.circular(16),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: const Color(0xFF93C5FD),
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(16),
                                  bottomLeft: Radius.circular(16),
                                  bottomRight: Radius.circular(16),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // "Py" overlay text
                  Center(
                    child: Text(
                      'Py',
                      style: TextStyle(
                        fontSize: 72,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.4),
                        letterSpacing: -4,
                      ),
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

  Widget _buildDrawerPanel() {
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
          // Course list items
          _buildCourseListItem(
            title: 'The Dot Product',
            subtitle: '3 Lessons',
            isCompleted: true,
          ),
          const SizedBox(height: 24),
          _buildCourseListItem(
            title: 'Cross Product',
            subtitle: 'Locked',
            isCompleted: false,
          ),
          const SizedBox(height: 24),
          // Learning button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const LessonScreen(
                      lessonId: 'daily',
                      lessonTitle: 'The Dot Product',
                      gradient: AppColors.indigoGradient,
                    ),
                  ),
                );
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
                'Learning',
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

  Widget _buildCourseListItem({
    required String title,
    required String subtitle,
    required bool isCompleted,
  }) {
    return Opacity(
      opacity: isCompleted ? 1.0 : 0.6,
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
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF94A3B8),
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
          ),
          // Status dot
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
}
