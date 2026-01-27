import 'package:flutter/material.dart';
import '../theme/theme.dart';
import 'course_screen.dart';

/// Courses list page - Brilliant style
class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _tabs = ['All', 'In Progress', 'Completed', 'Favorites'];

  final _courses = [
    _CourseItem(
      id: '1',
      title: 'Logic Fundamentals',
      description: 'Develop logical reasoning skills and learn to analyze problems',
      icon: Icons.psychology,
      gradient: AppColors.logicGradient,
      progress: 0.65,
      totalLessons: 20,
      completedLessons: 13,
      status: CourseStatus.inProgress,
      isFavorite: true,
    ),
    _CourseItem(
      id: '2',
      title: 'Mathematical Thinking',
      description: 'Build mathematical intuition and master mathematical thinking methods',
      icon: Icons.calculate,
      gradient: AppColors.mathGradient,
      progress: 0.25,
      totalLessons: 24,
      completedLessons: 6,
      status: CourseStatus.inProgress,
      isFavorite: false,
    ),
    _CourseItem(
      id: '3',
      title: 'Scientific Principles',
      description: 'Explore natural laws and understand scientific principles',
      icon: Icons.science,
      gradient: AppColors.scienceGradient,
      progress: 1.0,
      totalLessons: 18,
      completedLessons: 18,
      status: CourseStatus.completed,
      isFavorite: true,
    ),
    _CourseItem(
      id: '4',
      title: 'Python Programming',
      description: 'Learn programming from scratch',
      icon: Icons.code,
      gradient: AppColors.csGradient,
      progress: 0.0,
      totalLessons: 30,
      completedLessons: 0,
      status: CourseStatus.notStarted,
      isFavorite: false,
    ),
    _CourseItem(
      id: '5',
      title: 'Statistics Basics',
      description: 'Essential data analysis skills',
      icon: Icons.analytics,
      gradient: AppColors.mathGradient,
      progress: 1.0,
      totalLessons: 15,
      completedLessons: 15,
      status: CourseStatus.completed,
      isFavorite: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<_CourseItem> _getFilteredCourses(int tabIndex) {
    switch (tabIndex) {
      case 1: // In Progress
        return _courses.where((c) => c.status == CourseStatus.inProgress).toList();
      case 2: // Completed
        return _courses.where((c) => c.status == CourseStatus.completed).toList();
      case 3: // Favorites
        return _courses.where((c) => c.isFavorite).toList();
      default: // All
        return _courses;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar
            _buildHeader(),

            // Tab bar
            _buildTabBar(),

            // Course list
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: List.generate(_tabs.length, (index) {
                  return _buildCourseList(_getFilteredCourses(index));
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Text(
            'My Courses',
            style: AppTypography.headline2,
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: AppRadius.borderRadiusFull,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.school,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  '${_courses.length} courses',
                  style: AppTypography.label.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.borderRadiusFull,
          boxShadow: AppShadows.sm,
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: AppTypography.label.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: AppTypography.label,
        tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
      ),
    );
  }

  Widget _buildCourseList(List<_CourseItem> courses) {
    if (courses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.folder_open,
              size: 64,
              color: AppColors.textDisabled,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No courses yet',
              style: AppTypography.body1.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: courses.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        return _buildCourseCard(courses[index]);
      },
    );
  }

  Widget _buildCourseCard(_CourseItem course) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CourseScreen(
              courseId: course.id,
              title: course.title,
              description: course.description,
              gradient: course.gradient,
              icon: course.icon,
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.borderRadiusLg,
          boxShadow: AppShadows.sm,
        ),
        child: Column(
          children: [
            // Course header
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                gradient: course.gradient,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(AppRadius.lg),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: AppRadius.borderRadiusMd,
                    ),
                    child: Icon(
                      course.icon,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.title,
                          style: AppTypography.title.copyWith(
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          course.description,
                          style: AppTypography.body2.copyWith(
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (course.isFavorite)
                    const Icon(
                      Icons.favorite,
                      color: Colors.white,
                      size: 20,
                    ),
                ],
              ),
            ),

            // Course progress
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _getStatusText(course.status),
                        style: AppTypography.label.copyWith(
                          color: _getStatusColor(course.status),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '${course.completedLessons}/${course.totalLessons} lessons',
                        style: AppTypography.label,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Progress bar
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: AppRadius.borderRadiusFull,
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: course.progress,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: course.gradient,
                          borderRadius: AppRadius.borderRadiusFull,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Action button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CourseScreen(
                              courseId: course.id,
                              title: course.title,
                              description: course.description,
                              gradient: course.gradient,
                              icon: course.icon,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: course.gradient.colors.first,
                      ),
                      child: Text(
                        course.status == CourseStatus.completed
                            ? 'Review Course'
                            : course.status == CourseStatus.inProgress
                                ? 'Continue Learning'
                                : 'Start Learning',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getStatusText(CourseStatus status) {
    switch (status) {
      case CourseStatus.notStarted:
        return 'Not Started';
      case CourseStatus.inProgress:
        return 'In Progress';
      case CourseStatus.completed:
        return 'Completed';
    }
  }

  Color _getStatusColor(CourseStatus status) {
    switch (status) {
      case CourseStatus.notStarted:
        return AppColors.textSecondary;
      case CourseStatus.inProgress:
        return AppColors.primary;
      case CourseStatus.completed:
        return AppColors.success;
    }
  }
}

enum CourseStatus { notStarted, inProgress, completed }

class _CourseItem {
  final String id;
  final String title;
  final String description;
  final IconData icon;
  final LinearGradient gradient;
  final double progress;
  final int totalLessons;
  final int completedLessons;
  final CourseStatus status;
  final bool isFavorite;

  _CourseItem({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.gradient,
    required this.progress,
    required this.totalLessons,
    required this.completedLessons,
    required this.status,
    required this.isFavorite,
  });
}
