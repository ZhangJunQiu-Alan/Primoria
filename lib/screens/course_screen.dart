import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../components/course/chapter_node.dart';
import '../components/course/course_header.dart';

/// 课程详情页 - Brilliant 风格学习路径
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

  // 获取默认值
  String get _courseId => courseId ?? 'default';
  String get _title => title ?? '逻辑思维入门';
  String get _description => description ?? '学习基础逻辑推理';
  LinearGradient get _gradient => gradient ?? AppColors.logicGradient;
  IconData get _icon => icon ?? Icons.psychology;

  @override
  Widget build(BuildContext context) {
    // 示例章节数据
    final chapters = [
      ChapterData(
        id: '1',
        title: '基础概念',
        subtitle: '5 个课时',
        progress: 1.0,
        status: ChapterStatus.completed,
      ),
      ChapterData(
        id: '2',
        title: '核心原理',
        subtitle: '8 个课时',
        progress: 0.75,
        status: ChapterStatus.inProgress,
      ),
      ChapterData(
        id: '3',
        title: '进阶应用',
        subtitle: '6 个课时',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
      ChapterData(
        id: '4',
        title: '实战练习',
        subtitle: '10 个课时',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
      ChapterData(
        id: '5',
        title: '综合测试',
        subtitle: '期末考核',
        progress: 0.0,
        status: ChapterStatus.locked,
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // 课程头部
          SliverToBoxAdapter(
            child: CourseHeader(
              title: _title,
              description: _description,
              gradient: _gradient,
              icon: _icon,
              totalChapters: chapters.length,
              completedChapters: chapters.where((c) => c.status == ChapterStatus.completed).length,
              onBack: () => Navigator.pop(context),
            ),
          ),

          // 学习路径标题
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                '学习路径',
                style: AppTypography.headline3,
              ),
            ),
          ),

          // 章节列表 - 学习路径
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final chapter = chapters[index];
                  final isLast = index == chapters.length - 1;

                  return ChapterNode(
                    chapter: chapter,
                    index: index,
                    isLast: isLast,
                    gradient: _gradient,
                    onTap: () {
                      if (chapter.status != ChapterStatus.locked) {
                        // 跳转到章节详情
                        _showChapterDetail(context, chapter);
                      }
                    },
                  );
                },
                childCount: chapters.length,
              ),
            ),
          ),

          // 底部间距
          const SliverToBoxAdapter(
            child: SizedBox(height: AppSpacing.xxl),
          ),
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
            // 拖动指示器
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

            Text(
              chapter.title,
              style: AppTypography.headline2,
            ),
            AppSpacing.verticalGapSm,
            Text(
              chapter.subtitle,
              style: AppTypography.body2,
            ),
            AppSpacing.verticalGapLg,

            // 课时列表
            _buildLessonItem('课时 1: 概念介绍', true),
            _buildLessonItem('课时 2: 基础练习', true),
            _buildLessonItem('课时 3: 深入理解', chapter.progress > 0.5),
            _buildLessonItem('课时 4: 综合应用', false),
            _buildLessonItem('课时 5: 章节测验', false),

            AppSpacing.verticalGapLg,

            // 继续学习按钮
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  // 跳转到课时
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _gradient.colors.first,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: Text(
                  chapter.status == ChapterStatus.completed ? '复习本章' : '继续学习',
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
              color: isCompleted ? AppColors.textPrimary : AppColors.textSecondary,
              decoration: isCompleted ? TextDecoration.lineThrough : null,
            ),
          ),
        ],
      ),
    );
  }
}
