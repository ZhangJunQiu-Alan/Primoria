import 'package:flutter/material.dart';
import '../theme/theme.dart';
import 'course_screen.dart';

/// 搜索页 - Brilliant 风格
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  final _categories = [
    _CategoryData('数学', Icons.calculate, AppColors.courseMath, AppColors.mathGradient),
    _CategoryData('科学', Icons.science, AppColors.courseScience, AppColors.scienceGradient),
    _CategoryData('计算机', Icons.computer, AppColors.courseCS, AppColors.csGradient),
    _CategoryData('逻辑', Icons.psychology, AppColors.courseLogic, AppColors.logicGradient),
    _CategoryData('数据', Icons.bar_chart, AppColors.courseData, AppColors.mathGradient),
    _CategoryData('工程', Icons.engineering, AppColors.primary, AppColors.primaryGradient),
  ];

  final _popularCourses = [
    _CourseData('逻辑思维入门', '培养逻辑推理能力', Icons.psychology, AppColors.logicGradient, 4.9, 12500),
    _CourseData('Python 编程', '从零开始学编程', Icons.code, AppColors.csGradient, 4.8, 23000),
    _CourseData('统计学基础', '数据分析必备技能', Icons.analytics, AppColors.mathGradient, 4.7, 8900),
    _CourseData('物理学原理', '探索自然规律', Icons.waves, AppColors.scienceGradient, 4.9, 15600),
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
            // 搜索栏
            _buildSearchBar(),

            // 内容区域
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
          hintText: '搜索课程、主题...',
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
            borderRadius: AppRadius.borderRadiusLg,
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: AppRadius.borderRadiusLg,
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: AppRadius.borderRadiusLg,
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
          // 分类浏览
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              '浏览分类',
              style: AppTypography.headline3,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _buildCategoryGrid(),

          const SizedBox(height: AppSpacing.lg),

          // 热门课程
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              '热门课程',
              style: AppTypography.headline3,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _buildPopularCourses(),

          const SizedBox(height: AppSpacing.lg),

          // 最近搜索
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '最近搜索',
                  style: AppTypography.headline3,
                ),
                TextButton(
                  onPressed: () {},
                  child: Text(
                    '清除',
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
        // 跳转到分类页面
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: category.gradient,
          borderRadius: AppRadius.borderRadiusLg,
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
                fontWeight: FontWeight.w600,
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
          borderRadius: AppRadius.borderRadiusLg,
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            // 课程图标
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

            // 课程信息
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
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Text(
                        '${_formatNumber(course.students)} 学员',
                        style: AppTypography.label,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Icon(
              Icons.chevron_right,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSearches() {
    final recentSearches = ['逻辑思维', 'Python', '数学', '物理'];

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
    // 过滤课程
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
              '未找到 "$_searchQuery" 相关课程',
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
      return '${(number / 10000).toStringAsFixed(1)}万';
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
