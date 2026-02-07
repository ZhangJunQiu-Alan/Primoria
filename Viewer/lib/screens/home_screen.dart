import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../components/home/course_card.dart';
import '../components/home/daily_challenge_card.dart';
import '../components/home/streak_widget.dart';
import '../components/common/bottom_nav_bar.dart';
import 'course_screen.dart';
import 'profile_screen.dart';
import 'search_screen.dart';
import 'courses_screen.dart';
import 'lesson_screen.dart';

/// Home page - Duolingo + Brilliant style
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;

  void _navigateToCourse(
    BuildContext context,
    String courseId,
    String title,
    String description,
    LinearGradient gradient,
    IconData icon,
  ) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CourseScreen(
          courseId: courseId,
          title: title,
          description: description,
          gradient: gradient,
          icon: icon,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: _buildContent(),
      ),
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
    return CustomScrollView(
      slivers: [
        // Top app bar
        SliverToBoxAdapter(
          child: _buildAppBar(),
        ),

        // Daily challenge card
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: DailyChallengeCard(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const LessonScreen(
                      lessonId: 'daily',
                      lessonTitle: 'Daily Challenge',
                      gradient: AppColors.primaryGradient,
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // Continue learning title
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Continue Learning',
                  style: AppTypography.headline3,
                ),
                TextButton(
                  onPressed: () {},
                  child: Text(
                    'View All',
                    style: AppTypography.body2.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Course card list
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              CourseCard(
                title: 'Logic Fundamentals',
                subtitle: 'Chapter 3 · Deductive Reasoning',
                progress: 0.65,
                gradient: AppColors.logicGradient,
                icon: Icons.psychology,
                onTap: () => _navigateToCourse(
                  context,
                  'logic',
                  'Logic Fundamentals',
                  'Develop logical reasoning skills and learn to analyze problems',
                  AppColors.logicGradient,
                  Icons.psychology,
                ),
              ),
              AppSpacing.verticalGapMd,
              CourseCard(
                title: 'Mathematical Thinking',
                subtitle: 'Chapter 1 · Number Sense',
                progress: 0.25,
                gradient: AppColors.mathGradient,
                icon: Icons.calculate,
                onTap: () => _navigateToCourse(
                  context,
                  'math',
                  'Mathematical Thinking',
                  'Build mathematical intuition and master mathematical thinking methods',
                  AppColors.mathGradient,
                  Icons.calculate,
                ),
              ),
              AppSpacing.verticalGapMd,
              CourseCard(
                title: 'Scientific Principles',
                subtitle: 'Chapter 2 · Force and Motion',
                progress: 0.80,
                gradient: AppColors.scienceGradient,
                icon: Icons.science,
                onTap: () => _navigateToCourse(
                  context,
                  'science',
                  'Scientific Principles',
                  'Explore natural laws and understand scientific principles',
                  AppColors.scienceGradient,
                  Icons.science,
                ),
              ),
              AppSpacing.verticalGapMd,
            ]),
          ),
        ),

        // Recommended courses title
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Text(
              'Recommended for You',
              style: AppTypography.headline3,
            ),
          ),
        ),

        // Recommended courses horizontal scroll
        SliverToBoxAdapter(
          child: SizedBox(
            height: 180,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              children: [
                _buildRecommendCard(
                  'Computer Science',
                  'Intro to Algorithms',
                  AppColors.csGradient,
                  Icons.computer,
                ),
                AppSpacing.horizontalGapMd,
                _buildRecommendCard(
                  'Data Analysis',
                  'Statistics Basics',
                  AppColors.mathGradient,
                  Icons.bar_chart,
                ),
                AppSpacing.horizontalGapMd,
                _buildRecommendCard(
                  'Physics',
                  'Intro to Quantum',
                  AppColors.scienceGradient,
                  Icons.waves,
                ),
                AppSpacing.horizontalGapMd,
              ],
            ),
          ),
        ),

        // Bottom spacing
        const SliverToBoxAdapter(
          child: SizedBox(height: AppSpacing.xl),
        ),
      ],
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          // Logo - green gradient
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: AppRadius.borderRadiusMd,
            ),
            child: const Center(
              child: Text(
                'P',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            'Primoria',
            style: AppTypography.headline3.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          // Streak count
          const StreakWidget(streakCount: 7),
          const SizedBox(width: AppSpacing.md),
          // User avatar
          GestureDetector(
            onTap: () {},
            child: const CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.border,
              child: Icon(
                Icons.person,
                color: AppColors.textSecondary,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendCard(
    String category,
    String title,
    LinearGradient gradient,
    IconData icon,
  ) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: AppRadius.borderRadiusXl,
          boxShadow: AppShadows.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 24,
              ),
            ),
            const Spacer(),
            Text(
              category,
              style: AppTypography.label.copyWith(
                color: Colors.white.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              title,
              style: AppTypography.title.copyWith(
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
