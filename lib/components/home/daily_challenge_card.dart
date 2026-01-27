import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// 每日挑战卡片 - Brilliant 风格
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
          gradient: isCompleted ? null : AppColors.accentGradient,
          color: isCompleted ? AppColors.success : null,
          borderRadius: AppRadius.borderRadiusLg,
          boxShadow: AppShadows.md,
        ),
        child: Row(
          children: [
            // 图标
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

            // 文字内容
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isCompleted ? '今日挑战已完成！' : '每日挑战',
                    style: AppTypography.title.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    isCompleted
                        ? '明天再来保持连续学习'
                        : '完成今天的学习任务，保持连续天数',
                    style: AppTypography.body2.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),

            // 箭头
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
