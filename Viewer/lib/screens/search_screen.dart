import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../services/supabase_service.dart';
import 'course_screen.dart';

/// Library / Search screen — loads subjects and courses from Supabase.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String? _selectedSubjectId;
  String _selectedSubjectName = '';
  final _searchController = TextEditingController();

  List<Map<String, dynamic>> _subjects = [];
  List<Map<String, dynamic>> _courses = [];
  bool _loadingSubjects = true;
  bool _loadingCourses = false;

  @override
  void initState() {
    super.initState();
    _loadSubjects();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSubjects() async {
    final subjects = await SupabaseService.getSubjects();
    if (!mounted) return;
    setState(() {
      _subjects = subjects;
      _loadingSubjects = false;
      if (subjects.isNotEmpty) {
        _selectedSubjectId = subjects.first['id'] as String;
        _selectedSubjectName = subjects.first['name'] as String? ?? '';
      }
    });
    if (subjects.isNotEmpty) {
      _loadCourses();
    }
  }

  Future<void> _loadCourses({String? query}) async {
    setState(() => _loadingCourses = true);
    final courses = await SupabaseService.getCourses(
      subjectId: query != null && query.isNotEmpty ? null : _selectedSubjectId,
      searchQuery: query,
    );
    if (!mounted) return;
    setState(() {
      _courses = courses;
      _loadingCourses = false;
    });
  }

  void _selectSubject(Map<String, dynamic> subject) {
    setState(() {
      _selectedSubjectId = subject['id'] as String;
      _selectedSubjectName = subject['name'] as String? ?? '';
      _searchController.clear();
    });
    _loadCourses();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _loadingSubjects
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.all(24),
                      children: [
                        _buildCoursesSection(),
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
        borderRadius:
            const BorderRadius.vertical(bottom: Radius.circular(32)),
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
              onSubmitted: (v) => _loadCourses(query: v.trim()),
              decoration: const InputDecoration(
                hintText: 'Search courses...',
                hintStyle: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: Color(0xFF94A3B8),
                  size: 20,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Subject tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _subjects.map((subject) {
                final isSelected =
                    _selectedSubjectId == (subject['id'] as String);
                final color = _parseColor(subject['color_hex'] as String?);
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: GestureDetector(
                    onTap: () => _selectSubject(subject),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      constraints: const BoxConstraints(minWidth: 80),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.indigo600
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.indigo
                                      .withValues(alpha: 0.3),
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
                                  : color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? Colors.white.withValues(alpha: 0.2)
                                    : color.withValues(alpha: 0.3),
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              _subjectIcon(subject['name'] as String? ?? ''),
                              size: 24,
                              color: isSelected ? Colors.white : color,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _shortName(subject['name'] as String? ?? ''),
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

  Widget _buildCoursesSection() {
    if (_loadingCourses) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_courses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Text(
            'No courses found.',
            style: TextStyle(color: const Color(0xFF94A3B8), fontSize: 14),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _searchController.text.isNotEmpty
              ? 'Search Results'
              : _selectedSubjectName,
          style: AppTypography.title.copyWith(color: const Color(0xFF1E293B)),
        ),
        const SizedBox(height: 16),
        ..._courses.map((course) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildCourseCard(course),
            )),
      ],
    );
  }

  Widget _buildCourseCard(Map<String, dynamic> course) {
    final subject = course['subjects'] as Map<String, dynamic>?;
    final color = _parseColor(subject?['color_hex'] as String?);
    final title = course['title'] as String? ?? 'Untitled';
    final difficulty = course['difficulty_level'] as String? ?? 'beginner';
    final minutes = course['estimated_minutes'] as int? ?? 0;
    final tags = (course['tags'] as List? ?? []).cast<String>();
    final timeLabel = minutes >= 60 ? '${minutes ~/ 60}h' : '${minutes}m';
    final diffLabel = difficulty[0].toUpperCase() + difficulty.substring(1);

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CourseScreen(
            courseId: course['id'] as String?,
            title: title,
            description: course['description'] as String?,
          ),
        ),
      ),
      child: Container(
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
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: color.withValues(alpha: 0.2)),
              ),
              child: Icon(
                Icons.menu_book_rounded,
                size: 32,
                color: color,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$diffLabel · $timeLabel',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      children: tags.take(3).map((tag) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tag,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: color,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
          ],
        ),
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────

  Color _parseColor(String? hex) {
    if (hex == null) return AppColors.indigo;
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return AppColors.indigo;
    }
  }

  IconData _subjectIcon(String name) {
    final n = name.toLowerCase();
    if (n.contains('computer') || n.contains('cs')) return Icons.terminal;
    if (n.contains('math')) return Icons.calculate;
    if (n.contains('science') || n.contains('physics') || n.contains('chem')) {
      return Icons.science_outlined;
    }
    if (n.contains('business') || n.contains('market')) {
      return Icons.business_center_outlined;
    }
    if (n.contains('social') || n.contains('psych')) {
      return Icons.people_outline;
    }
    return Icons.school_outlined;
  }

  String _shortName(String name) {
    const map = {
      'Computer Science': 'CS',
      'Mathematics': 'Math',
      'Science': 'Science',
      'Business': 'Business',
      'Social': 'Social',
    };
    return map[name] ?? (name.length > 7 ? '${name.substring(0, 6)}…' : name);
  }
}
