import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// 连续天数火焰组件 - Brilliant 风格
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
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.streakFire.withValues(alpha: 0.1),
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 火焰图标
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
          // 天数
          Text(
            '$streakCount',
            style: AppTypography.title.copyWith(
              color: AppColors.streakFire,
              fontWeight: FontWeight.bold,
              fontSize: size * 0.45,
            ),
          ),
          if (showLabel) ...[
            const SizedBox(width: AppSpacing.xs),
            Text(
              '天',
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

/// 大号连续天数显示 - 用于个人中心页
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
        gradient: AppColors.accentGradient,
        borderRadius: AppRadius.borderRadiusLg,
      ),
      child: Column(
        children: [
          // 大火焰图标
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

          // 当前连续天数
          Text(
            '$streakCount',
            style: AppTypography.headline1.copyWith(
              color: Colors.white,
              fontSize: 48,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            '连续学习天数',
            style: AppTypography.body1.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // 最长记录
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
              '最长记录: $longestStreak 天',
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
