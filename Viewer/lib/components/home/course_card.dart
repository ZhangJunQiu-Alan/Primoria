import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// Course card component - Duolingo + Brilliant style
class CourseCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final double progress;
  final LinearGradient gradient;
  final IconData icon;
  final VoidCallback onTap;

  const CourseCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.progress,
    required this.gradient,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.borderRadiusXl,
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            // Left accent stripe
            Container(
              width: 4,
              height: 64,
              decoration: BoxDecoration(
                gradient: gradient,
                borderRadius: AppRadius.borderRadiusFull,
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Course icon
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: gradient,
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(width: AppSpacing.md),

            // Course info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    subtitle,
                    style: AppTypography.body2,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  // Progress bar - thicker
                  _buildProgressBar(),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Progress ring
            _buildProgressRing(),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar() {
    return Container(
      height: 6,
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: AppRadius.borderRadiusFull,
          ),
        ),
      ),
    );
  }

  Widget _buildProgressRing() {
    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background ring
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              value: 1,
              strokeWidth: 4,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.border),
            ),
          ),
          // Progress circle - green
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              value: progress,
              strokeWidth: 4,
              backgroundColor: Colors.transparent,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
          // Percentage text - bolder
          Text(
            '${(progress * 100).toInt()}%',
            style: AppTypography.label.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
