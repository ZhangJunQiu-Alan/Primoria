import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// Streak flame widget - Duolingo style
class StreakWidget extends StatelessWidget {
  final int streakCount;
  final bool showLabel;
  final double size;

  const StreakWidget({
    super.key,
    required this.streakCount,
    this.showLabel = false,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm + 2,
        vertical: AppSpacing.xs + 1,
      ),
      decoration: BoxDecoration(
        color: AppColors.streakFire.withValues(alpha: 0.1),
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Flame icon with gold/orange gradient
          ShaderMask(
            shaderCallback: (Rect bounds) {
              return const LinearGradient(
                colors: [AppColors.streakFireGlow, AppColors.streakFire],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ).createShader(bounds);
            },
            child: Icon(
              Icons.local_fire_department,
              color: Colors.white,
              size: size * 0.7,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          // Day count
          Text(
            '$streakCount',
            style: AppTypography.title.copyWith(
              color: AppColors.streakFire,
              fontWeight: FontWeight.w800,
              fontSize: size * 0.45,
            ),
          ),
          if (showLabel) ...[
            const SizedBox(width: AppSpacing.xs),
            Text(
              'days',
              style: AppTypography.label.copyWith(
                color: AppColors.streakFire,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Large streak display - used in profile page (gold/orange gradient)
class StreakDisplayLarge extends StatelessWidget {
  final int streakCount;
  final int longestStreak;

  const StreakDisplayLarge({
    super.key,
    required this.streakCount,
    required this.longestStreak,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: AppColors.streakGradient,
        borderRadius: AppRadius.borderRadiusXl,
      ),
      child: Column(
        children: [
          // Large flame icon
          ShaderMask(
            shaderCallback: (Rect bounds) {
              return const LinearGradient(
                colors: [Colors.yellow, Colors.orange, Colors.red],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ).createShader(bounds);
            },
            child: const Icon(
              Icons.local_fire_department,
              color: Colors.white,
              size: 64,
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Current streak count
          Text(
            '$streakCount',
            style: AppTypography.headline1.copyWith(
              color: Colors.white,
              fontSize: 48,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            'Day Streak',
            style: AppTypography.body1.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Longest streak
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: AppRadius.borderRadiusFull,
            ),
            child: Text(
              'Best: $longestStreak days',
              style: AppTypography.label.copyWith(
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
