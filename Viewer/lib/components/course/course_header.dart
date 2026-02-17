import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// Course header component
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

  double get progress =>
      totalChapters > 0 ? completedChapters / totalChapters : 0;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(gradient: gradient),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Top bar
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

            // Course info
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                children: [
                  // Course icon - larger container
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: AppRadius.borderRadiusXl,
                    ),
                    child: Icon(icon, size: 52, color: Colors.white),
                  ),
                  AppSpacing.verticalGapMd,

                  // Course title
                  Text(
                    title,
                    style: AppTypography.headline2.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  AppSpacing.verticalGapSm,

                  // Course description
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

                  // Progress info
                  _buildProgressInfo(),
                ],
              ),
            ),

            // Bottom rounded mask - more pronounced curve
            Container(
              height: 28,
              decoration: const BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.vertical(
                  top: Radius.circular(AppRadius.xxl),
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
        borderRadius: AppRadius.borderRadiusXl,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // Completed chapters
          _buildStat('$completedChapters/$totalChapters', 'Chapters Done'),
          // Divider
          Container(
            width: 1,
            height: 40,
            color: Colors.white.withValues(alpha: 0.3),
          ),
          // Completion progress
          _buildStat('${(progress * 100).toInt()}%', 'Progress'),
          // Divider
          Container(
            width: 1,
            height: 40,
            color: Colors.white.withValues(alpha: 0.3),
          ),
          // Estimated time
          _buildStat('${totalChapters * 15}', 'Est. Minutes'),
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
            fontWeight: FontWeight.w800,
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
