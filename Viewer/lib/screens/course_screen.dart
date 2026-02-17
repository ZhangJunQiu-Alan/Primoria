import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../components/course/chapter_node.dart';
import '../components/course/course_header.dart';

/// Course detail page - Brilliant style learning path
class CourseScreen extends StatelessWidget {
  final String? courseId;
  final String? title;
  final String? description;
  final LinearGradient? gradient;
  final IconData? icon;

  const CourseScreen({
    super.key,
    this.courseId,
    this.title,
    this.description,
    this.gradient,
    this.icon,
  });

  // Get default values
  String get _courseId => courseId ?? 'default';
  String get _title => title ?? 'Intro to Logic';
  String get _description => description ?? 'Learn basic logical reasoning';
  LinearGradient get _gradient => gradient ?? AppColors.logicGradient;
  IconData get _icon => icon ?? Icons.psychology;

  @override
  Widget build(BuildContext context) {
    // Sample chapter data
    final chapters = [
      ChapterData(
        id: '1',
        title: 'Basic Concepts',
        subtitle: '5 lessons',
        progress: 1.0,
        status: ChapterStatus.completed,
      ),
      ChapterData(
        id: '2',
        title: 'Core Principles',
        subtitle: '8 lessons',
        progress: 0.75,
        status: ChapterStatus.inProgress,
      ),
      ChapterData(
        id: '3',
        title: 'Advanced Application',
        subtitle: '6 lessons',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
      ChapterData(
        id: '4',
        title: 'Practice Exercises',
        subtitle: '10 lessons',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
      ChapterData(
        id: '5',
        title: 'Final Assessment',
        subtitle: 'Final Exam',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Course header
          SliverToBoxAdapter(
            child: CourseHeader(
              title: _title,
              description: _description,
              gradient: _gradient,
              icon: _icon,
              totalChapters: chapters.length,
              completedChapters: chapters
                  .where((c) => c.status == ChapterStatus.completed)
                  .length,
              onBack: () => Navigator.pop(context),
            ),
          ),

          // Learning path title
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text('Learning Path', style: AppTypography.headline3),
            ),
          ),

          // Chapter list - learning path
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final chapter = chapters[index];
                final isLast = index == chapters.length - 1;

                return ChapterNode(
                  chapter: chapter,
                  index: index,
                  isLast: isLast,
                  gradient: _gradient,
                  onTap: () {
                    if (chapter.status != ChapterStatus.locked) {
                      // Navigate to chapter detail
                      _showChapterDetail(context, chapter);
                    }
                  },
                );
              }, childCount: chapters.length),
            ),
          ),

          // Bottom spacing
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
        ],
      ),
    );
  }

  void _showChapterDetail(BuildContext context, ChapterData chapter) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag indicator
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: AppRadius.borderRadiusFull,
                ),
              ),
            ),
            AppSpacing.verticalGapLg,

            Text(chapter.title, style: AppTypography.headline2),
            AppSpacing.verticalGapSm,
            Text(chapter.subtitle, style: AppTypography.body2),
            AppSpacing.verticalGapLg,

            // Lesson list
            _buildLessonItem('Lesson 1: Introduction', true),
            _buildLessonItem('Lesson 2: Basic Practice', true),
            _buildLessonItem(
              'Lesson 3: Deep Understanding',
              chapter.progress > 0.5,
            ),
            _buildLessonItem('Lesson 4: Comprehensive Application', false),
            _buildLessonItem('Lesson 5: Chapter Quiz', false),

            AppSpacing.verticalGapLg,

            // Continue learning button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Navigate to lesson
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _gradient.colors.first,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: Text(
                  chapter.status == ChapterStatus.completed
                      ? 'Review Chapter'
                      : 'Continue Learning',
                ),
              ),
            ),
            AppSpacing.verticalGapMd,
          ],
        ),
      ),
    );
  }

  Widget _buildLessonItem(String title, bool isCompleted) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: isCompleted ? AppColors.success : AppColors.border,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCompleted ? Icons.check : Icons.circle_outlined,
              color: isCompleted ? Colors.white : AppColors.textDisabled,
              size: 16,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            title,
            style: AppTypography.body1.copyWith(
              color: isCompleted
                  ? AppColors.textPrimary
                  : AppColors.textSecondary,
              decoration: isCompleted ? TextDecoration.lineThrough : null,
            ),
          ),
        ],
      ),
    );
  }
}
