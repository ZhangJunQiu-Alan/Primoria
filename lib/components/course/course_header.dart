import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// 课程头部组件
class CourseHeader extends StatelessWidget {
  final String title;
  final String description;
  final LinearGradient gradient;
  final IconData icon;
  final int totalChapters;
  final int completedChapters;
  final VoidCallback onBack;

  const CourseHeader({
    super.key,
    required this.title,
    required this.description,
    required this.gradient,
    required this.icon,
    required this.totalChapters,
    required this.completedChapters,
    required this.onBack,
  });

  double get progress => totalChapters > 0 ? completedChapters / totalChapters : 0;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 顶部栏
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: onBack,
                    icon: const Icon(Icons.arrow_back),
                    color: Colors.white,
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.more_vert),
                    color: Colors.white,
                  ),
                ],
              ),
            ),

            // 课程信息
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                children: [
                  // 课程图标
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: AppRadius.borderRadiusLg,
                    ),
                    child: Icon(
                      icon,
                      size: 48,
                      color: Colors.white,
                    ),
                  ),
                  AppSpacing.verticalGapMd,

                  // 课程标题
                  Text(
                    title,
                    style: AppTypography.headline2.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  AppSpacing.verticalGapSm,

                  // 课程描述
                  Text(
                    description,
                    style: AppTypography.body1.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  AppSpacing.verticalGapLg,

                  // 进度信息
                  _buildProgressInfo(),
                ],
              ),
            ),

            // 底部圆角遮罩
            Container(
              height: 24,
              decoration: const BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.vertical(
                  top: Radius.circular(AppRadius.xl),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressInfo() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: AppRadius.borderRadiusLg,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // 完成章节
          _buildStat(
            '$completedChapters/$totalChapters',
            '已完成章节',
          ),
          // 分隔线
          Container(
            width: 1,
            height: 40,
            color: Colors.white.withValues(alpha: 0.3),
          ),
          // 完成进度
          _buildStat(
            '${(progress * 100).toInt()}%',
            '完成进度',
          ),
          // 分隔线
          Container(
            width: 1,
            height: 40,
            color: Colors.white.withValues(alpha: 0.3),
          ),
          // 预计时间
          _buildStat(
            '${totalChapters * 15}',
            '预计分钟',
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: AppTypography.headline3.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          style: AppTypography.label.copyWith(
            color: Colors.white.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }
}
