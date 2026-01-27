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

/// 首页 - Brilliant 风格
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
        // 顶部应用栏
        SliverToBoxAdapter(
          child: _buildAppBar(),
        ),

        // 每日挑战卡片
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
                      lessonTitle: '每日挑战',
                      gradient: AppColors.accentGradient,
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // 继续学习标题
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
                  '继续学习',
                  style: AppTypography.headline3,
                ),
                TextButton(
                  onPressed: () {},
                  child: Text(
                    '查看全部',
                    style: AppTypography.body2.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 课程卡片列表
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              CourseCard(
                title: '逻辑思维基础',
                subtitle: '第 3 章 · 演绎推理',
                progress: 0.65,
                gradient: AppColors.logicGradient,
                icon: Icons.psychology,
                onTap: () => _navigateToCourse(
                  context,
                  'logic',
                  '逻辑思维基础',
                  '培养逻辑推理能力，学会分析问题',
                  AppColors.logicGradient,
                  Icons.psychology,
                ),
              ),
              AppSpacing.verticalGapMd,
              CourseCard(
                title: '数学思维',
                subtitle: '第 1 章 · 数字感知',
                progress: 0.25,
                gradient: AppColors.mathGradient,
                icon: Icons.calculate,
                onTap: () => _navigateToCourse(
                  context,
                  'math',
                  '数学思维',
                  '建立数学直觉，掌握数学思维方法',
                  AppColors.mathGradient,
                  Icons.calculate,
                ),
              ),
              AppSpacing.verticalGapMd,
              CourseCard(
                title: '科学原理',
                subtitle: '第 2 章 · 力与运动',
                progress: 0.80,
                gradient: AppColors.scienceGradient,
                icon: Icons.science,
                onTap: () => _navigateToCourse(
                  context,
                  'science',
                  '科学原理',
                  '探索自然规律，理解科学原理',
                  AppColors.scienceGradient,
                  Icons.science,
                ),
              ),
              AppSpacing.verticalGapMd,
            ]),
          ),
        ),

        // 推荐课程标题
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Text(
              '为你推荐',
              style: AppTypography.headline3,
            ),
          ),
        ),

        // 推荐课程横向滚动
        SliverToBoxAdapter(
          child: SizedBox(
            height: 180,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              children: [
                _buildRecommendCard(
                  '计算机科学',
                  '算法入门',
                  AppColors.csGradient,
                  Icons.computer,
                ),
                AppSpacing.horizontalGapMd,
                _buildRecommendCard(
                  '数据分析',
                  '统计学基础',
                  AppColors.mathGradient,
                  Icons.bar_chart,
                ),
                AppSpacing.horizontalGapMd,
                _buildRecommendCard(
                  '物理学',
                  '量子入门',
                  AppColors.scienceGradient,
                  Icons.waves,
                ),
                AppSpacing.horizontalGapMd,
              ],
            ),
          ),
        ),

        // 底部间距
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
          // Logo
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
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            'Primoria',
            style: AppTypography.headline3.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          // 连续天数
          const StreakWidget(streakCount: 7),
          const SizedBox(width: AppSpacing.md),
          // 用户头像
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
          borderRadius: AppRadius.borderRadiusLg,
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
