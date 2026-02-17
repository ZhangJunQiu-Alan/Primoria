import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// Daily challenge card - Duolingo + Brilliant style
class DailyChallengeCard extends StatelessWidget {
  final VoidCallback onTap;
  final bool isCompleted;

  const DailyChallengeCard({
    super.key,
    required this.onTap,
    this.isCompleted = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          gradient: isCompleted ? null : AppColors.primaryGradient,
          color: isCompleted ? AppColors.success : null,
          borderRadius: AppRadius.borderRadiusXl,
          boxShadow: AppShadows.md,
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(
                isCompleted ? Icons.check_circle : Icons.local_fire_department,
                color: Colors.white,
                size: 32,
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Text content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isCompleted
                        ? 'Today\'s Challenge Complete!'
                        : 'Daily Challenge',
                    style: AppTypography.title.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    isCompleted
                        ? 'Come back tomorrow to keep your streak'
                        : 'Complete today\'s learning task, keep your streak',
                    style: AppTypography.body2.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),

            // Arrow - green circle, more prominent
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward,
                color: Colors.white,
                size: 22,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
