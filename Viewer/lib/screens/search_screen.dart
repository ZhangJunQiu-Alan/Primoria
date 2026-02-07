import 'package:flutter/material.dart';
import '../theme/theme.dart';
import 'course_screen.dart';

/// Search page - Duolingo + Brilliant style
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  final _categories = [
    _CategoryData('Math', Icons.calculate, AppColors.courseMath, AppColors.mathGradient),
    _CategoryData('Science', Icons.science, AppColors.courseScience, AppColors.scienceGradient),
    _CategoryData('Computer', Icons.computer, AppColors.courseCS, AppColors.csGradient),
    _CategoryData('Logic', Icons.psychology, AppColors.courseLogic, AppColors.logicGradient),
    _CategoryData('Data', Icons.bar_chart, AppColors.courseData, AppColors.mathGradient),
    _CategoryData('Engineering', Icons.engineering, AppColors.primary, AppColors.primaryGradient),
  ];

  final _popularCourses = [
    _CourseData('Intro to Logic', 'Develop logical reasoning skills', Icons.psychology, AppColors.logicGradient, 4.9, 12500),
    _CourseData('Python Programming', 'Learn programming from scratch', Icons.code, AppColors.csGradient, 4.8, 23000),
    _CourseData('Statistics Basics', 'Essential data analysis skills', Icons.analytics, AppColors.mathGradient, 4.7, 8900),
    _CourseData('Physics Principles', 'Explore natural laws', Icons.waves, AppColors.scienceGradient, 4.9, 15600),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search bar - pill shaped
            _buildSearchBar(),

            // Content area
            Expanded(
              child: _searchQuery.isEmpty
                  ? _buildDiscoverContent()
                  : _buildSearchResults(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _searchQuery = value),
        decoration: InputDecoration(
          hintText: 'Search courses, topics...',
          prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(
            borderRadius: AppRadius.borderRadiusFull,
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: AppRadius.borderRadiusFull,
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: AppRadius.borderRadiusFull,
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
        ),
      ),
    );
  }

  Widget _buildDiscoverContent() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Browse categories
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              'Browse Categories',
              style: AppTypography.headline3,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _buildCategoryGrid(),

          const SizedBox(height: AppSpacing.lg),

          // Popular courses
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              'Popular Courses',
              style: AppTypography.headline3,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _buildPopularCourses(),

          const SizedBox(height: AppSpacing.lg),

          // Recent searches
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Searches',
                  style: AppTypography.headline3,
                ),
                TextButton(
                  onPressed: () {},
                  child: Text(
                    'Clear',
                    style: AppTypography.body2.copyWith(color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
          _buildRecentSearches(),

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1,
      ),
      itemCount: _categories.length,
      itemBuilder: (context, index) {
        final category = _categories[index];
        return _buildCategoryCard(category);
      },
    );
  }

  Widget _buildCategoryCard(_CategoryData category) {
    return GestureDetector(
      onTap: () {
        // Navigate to category page
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: category.gradient,
          borderRadius: AppRadius.borderRadiusXl,
          boxShadow: AppShadows.sm,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              category.icon,
              color: Colors.white,
              size: 32,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              category.name,
              style: AppTypography.label.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPopularCourses() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      itemCount: _popularCourses.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final course = _popularCourses[index];
        return _buildCourseItem(course);
      },
    );
  }

  Widget _buildCourseItem(_CourseData course) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CourseScreen(
              courseId: course.title,
              title: course.title,
              description: course.description,
              gradient: course.gradient,
              icon: course.icon,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.borderRadiusXl,
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            // Course icon
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: course.gradient,
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(
                course.icon,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Course info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    style: AppTypography.title,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    course.description,
                    style: AppTypography.body2,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(
                        Icons.star,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${course.rating}',
                        style: AppTypography.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Text(
                        '${_formatNumber(course.students)} students',
                        style: AppTypography.label,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            Icon(
              Icons.chevron_right,
              color: AppColors.primary.withValues(alpha: 0.6),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSearches() {
    final recentSearches = ['Logic', 'Python', 'Math', 'Physics'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Wrap(
        spacing: AppSpacing.sm,
        runSpacing: AppSpacing.sm,
        children: recentSearches.map((search) {
          return GestureDetector(
            onTap: () {
              _searchController.text = search;
              setState(() => _searchQuery = search);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: AppRadius.borderRadiusFull,
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.history,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    search,
                    style: AppTypography.body2,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSearchResults() {
    // Filter courses
    final filteredCourses = _popularCourses
        .where((c) => c.title.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();

    if (filteredCourses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: AppColors.textDisabled,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No courses found for "$_searchQuery"',
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
      itemCount: filteredCourses.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        return _buildCourseItem(filteredCourses[index]);
      },
    );
  }

  String _formatNumber(int number) {
    if (number >= 10000) {
      return '${(number / 1000).toStringAsFixed(1)}k';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}k';
    }
    return number.toString();
  }
}

class _CategoryData {
  final String name;
  final IconData icon;
  final Color color;
  final LinearGradient gradient;

  _CategoryData(this.name, this.icon, this.color, this.gradient);
}

class _CourseData {
  final String title;
  final String description;
  final IconData icon;
  final LinearGradient gradient;
  final double rating;
  final int students;

  _CourseData(this.title, this.description, this.icon, this.gradient, this.rating, this.students);
}
