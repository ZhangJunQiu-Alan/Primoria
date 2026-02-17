import 'package:flutter/material.dart';
import '../theme/theme.dart';

/// Library screen — ported from Figma LibraryScreen template
/// (file kept as search_screen.dart for routing compatibility)
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String _selectedCategory = 'CS';
  final _searchController = TextEditingController();

  static const _categories = [
    _Category('CS', Icons.terminal),
    _Category('Math', Icons.calculate),
    _Category('Science', Icons.science_outlined),
    _Category('Business', Icons.business_center_outlined),
    _Category('Social', Icons.people_outline),
  ];

  static const Map<String, List<_RecommendedCourse>> _recommendedByCategory = {
    'CS': [
      _RecommendedCourse('Python Basics', 42, Color(0xFF3B82F6)),
      _RecommendedCourse('Web Dev', 35, Color(0xFF06B6D4)),
      _RecommendedCourse('Machine Learning', 50, Color(0xFFA855F7)),
      _RecommendedCourse('Data Science', 38, Color(0xFF6366F1)),
    ],
    'Math': [
      _RecommendedCourse('Calculus I', 45, Color(0xFFF97316)),
      _RecommendedCourse('Linear Algebra', 32, Color(0xFFEC4899)),
      _RecommendedCourse('Statistics', 28, Color(0xFF14B8A6)),
      _RecommendedCourse('Discrete Math', 40, Color(0xFFA855F7)),
    ],
    'Science': [
      _RecommendedCourse('Physics I', 50, Color(0xFF3B82F6)),
      _RecommendedCourse('Organic Chem', 44, Color(0xFF10B981)),
      _RecommendedCourse('Biology 101', 36, Color(0xFF22C55E)),
      _RecommendedCourse('Astronomy', 30, Color(0xFF4F46E5)),
    ],
    'Business': [
      _RecommendedCourse('Marketing 101', 25, Color(0xFFF43F5E)),
      _RecommendedCourse('Finance Basics', 30, Color(0xFF059669)),
      _RecommendedCourse('Entrepreneurship', 28, Color(0xFF3B82F6)),
      _RecommendedCourse('Leadership', 22, Color(0xFFF59E0B)),
    ],
    'Social': [
      _RecommendedCourse('Psychology', 35, Color(0xFF8B5CF6)),
      _RecommendedCourse('Sociology', 28, Color(0xFFD946EF)),
      _RecommendedCourse('Economics', 32, Color(0xFF0891B2)),
      _RecommendedCourse('Anthropology', 26, Color(0xFFF97316)),
    ],
  };

  static const Map<String, List<_PopularCourse>> _popularByCategory = {
    'CS': [
      _PopularCourse(
        'Python Basics',
        'Beginner · 2 hours',
        Color(0xFFFBBF24),
        Icons.code,
      ),
      _PopularCourse(
        'Web Scraping 101',
        'Intermediate · 45 mins',
        Color(0xFF10B981),
        Icons.language,
      ),
      _PopularCourse(
        'Django Framework',
        'Advanced · 10 hours',
        Color(0xFF6366F1),
        Icons.code,
      ),
      _PopularCourse(
        'Machine Learning',
        'Expert · 20 hours',
        Color(0xFFA855F7),
        Icons.psychology,
      ),
      _PopularCourse(
        'React & Python',
        'Fullstack · 5 hours',
        Color(0xFF06B6D4),
        Icons.code,
      ),
    ],
    'Math': [
      _PopularCourse(
        'Calculus Fundamentals',
        'Beginner · 3 hours',
        Color(0xFFFB923C),
        Icons.calculate,
      ),
      _PopularCourse(
        'Linear Algebra',
        'Intermediate · 4 hours',
        Color(0xFFEC4899),
        Icons.calculate,
      ),
      _PopularCourse(
        'Probability Theory',
        'Advanced · 6 hours',
        Color(0xFF14B8A6),
        Icons.calculate,
      ),
      _PopularCourse(
        'Advanced Statistics',
        'Expert · 8 hours',
        Color(0xFFA855F7),
        Icons.calculate,
      ),
      _PopularCourse(
        'Number Theory',
        'Intermediate · 5 hours',
        Color(0xFF6366F1),
        Icons.calculate,
      ),
    ],
    'Science': [
      _PopularCourse(
        "Newton's Laws",
        'Beginner · 2 hours',
        Color(0xFF60A5FA),
        Icons.science,
      ),
      _PopularCourse(
        'Chemical Bonds',
        'Intermediate · 3 hours',
        Color(0xFF10B981),
        Icons.science,
      ),
      _PopularCourse(
        'Cell Biology',
        'Beginner · 2.5 hours',
        Color(0xFF22C55E),
        Icons.science,
      ),
      _PopularCourse(
        'Quantum Physics',
        'Advanced · 12 hours',
        Color(0xFF4F46E5),
        Icons.science,
      ),
      _PopularCourse(
        'Thermodynamics',
        'Intermediate · 4 hours',
        Color(0xFFF97316),
        Icons.science,
      ),
    ],
    'Business': [
      _PopularCourse(
        'Digital Marketing',
        'Beginner · 3 hours',
        Color(0xFFFB7185),
        Icons.trending_up,
      ),
      _PopularCourse(
        'Investment Basics',
        'Intermediate · 4 hours',
        Color(0xFF10B981),
        Icons.trending_up,
      ),
      _PopularCourse(
        'Startup Strategy',
        'Advanced · 6 hours',
        Color(0xFF3B82F6),
        Icons.business_center,
      ),
      _PopularCourse(
        'Team Management',
        'Intermediate · 3 hours',
        Color(0xFFF59E0B),
        Icons.people,
      ),
      _PopularCourse(
        'Business Analytics',
        'Advanced · 5 hours',
        Color(0xFFA855F7),
        Icons.trending_up,
      ),
    ],
    'Social': [
      _PopularCourse(
        'Intro to Psychology',
        'Beginner · 2 hours',
        Color(0xFF8B5CF6),
        Icons.psychology,
      ),
      _PopularCourse(
        'Social Structures',
        'Intermediate · 3 hours',
        Color(0xFFD946EF),
        Icons.people,
      ),
      _PopularCourse(
        'Microeconomics',
        'Intermediate · 4 hours',
        Color(0xFF06B6D4),
        Icons.trending_up,
      ),
      _PopularCourse(
        'Cultural Studies',
        'Beginner · 2.5 hours',
        Color(0xFFF97316),
        Icons.language,
      ),
      _PopularCourse(
        'Behavioral Science',
        'Advanced · 6 hours',
        Color(0xFF6366F1),
        Icons.psychology,
      ),
    ],
  };

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          children: [
            // Header: search + category tabs
            _buildHeader(),
            // Scrollable content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  _buildRecommendedSection(),
                  const SizedBox(height: 32),
                  _buildPopularSection(),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Search bar
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search topics...',
                hintStyle: TextStyle(
                  color: const Color(0xFF94A3B8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: Color(0xFF94A3B8),
                  size: 20,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Category tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat.id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      constraints: const BoxConstraints(minWidth: 80),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.indigo600
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.indigo.withValues(
                                    alpha: 0.3,
                                  ),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 56,
                            height: 40,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white.withValues(alpha: 0.2)
                                  : AppColors.indigo50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? Colors.white.withValues(alpha: 0.2)
                                    : AppColors.indigo100,
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              cat.icon,
                              size: 24,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.indigo600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            cat.id,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? Colors.white
                                  : const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendedSection() {
    final courses = _recommendedByCategory[_selectedCategory] ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recommended',
          style: AppTypography.title.copyWith(color: const Color(0xFF1E293B)),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 240,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: courses.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final course = courses[index];
              return _buildRecommendedCard(course);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendedCard(_RecommendedCourse course) {
    return SizedBox(
      width: 160,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Book cover card
          Container(
            width: 160,
            height: 200,
            decoration: BoxDecoration(
              color: course.color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Stack(
              children: [
                // Gradient overlay
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          course.color.withValues(alpha: 0.6),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
                // Center icon
                Center(
                  child: Icon(
                    Icons.menu_book_rounded,
                    size: 48,
                    color: course.color.withValues(alpha: 0.5),
                  ),
                ),
                // Star badge
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.star_rounded,
                      size: 14,
                      color: Color(0xFFEAB308),
                    ),
                  ),
                ),
                // Lesson count
                Positioned(
                  bottom: 8,
                  left: 8,
                  child: Row(
                    children: [
                      const Icon(
                        Icons.menu_book,
                        size: 12,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${course.lessons} lessons',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            course.title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildPopularSection() {
    final items = _popularByCategory[_selectedCategory] ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Popular Now',
          style: AppTypography.title.copyWith(color: const Color(0xFF1E293B)),
        ),
        const SizedBox(height: 16),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildPopularItem(item),
          ),
        ),
      ],
    );
  }

  Widget _buildPopularItem(_PopularCourse item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
        children: [
          // Icon container
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Icon(item.icon, size: 32, color: const Color(0xFF94A3B8)),
          ),
          const SizedBox(width: 16),
          // Text + progress
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                // Progress bar
                SizedBox(
                  width: 80,
                  height: 6,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: 0.33,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: AlwaysStoppedAnimation(item.color),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Category {
  final String id;
  final IconData icon;
  const _Category(this.id, this.icon);
}

class _RecommendedCourse {
  final String title;
  final int lessons;
  final Color color;
  const _RecommendedCourse(this.title, this.lessons, this.color);
}

class _PopularCourse {
  final String title;
  final String subtitle;
  final Color color;
  final IconData icon;
  const _PopularCourse(this.title, this.subtitle, this.color, this.icon);
}
