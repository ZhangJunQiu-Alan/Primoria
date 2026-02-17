import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// Chapter status
enum ChapterStatus {
  locked, // locked
  available, // available
  inProgress, // in progress
  completed, // completed
}

/// Chapter data
class ChapterData {
  final String id;
  final String title;
  final String subtitle;
  final double progress;
  final ChapterStatus status;

  const ChapterData({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.progress,
    required this.status,
  });
}

/// Chapter node component - a single node in the learning path
class ChapterNode extends StatelessWidget {
  final ChapterData chapter;
  final int index;
  final bool isLast;
  final LinearGradient gradient;
  final VoidCallback onTap;

  const ChapterNode({
    super.key,
    required this.chapter,
    required this.index,
    required this.isLast,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isLocked = chapter.status == ChapterStatus.locked;
    final isCompleted = chapter.status == ChapterStatus.completed;
    final isInProgress = chapter.status == ChapterStatus.inProgress;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left side - connection line and node
          SizedBox(
            width: 68,
            child: Column(
              children: [
                // Progress ring node - bigger (52px)
                _buildNode(isLocked, isCompleted, isInProgress),
                // Connection line - thicker (4px)
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 4,
                      decoration: BoxDecoration(
                        color: isCompleted
                            ? AppColors.primary
                            : AppColors.border,
                        borderRadius: AppRadius.borderRadiusFull,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Right side - chapter card
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.md),
              child: _buildCard(isLocked, isCompleted, isInProgress),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNode(bool isLocked, bool isCompleted, bool isInProgress) {
    return GestureDetector(
      onTap: isLocked ? null : onTap,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isLocked
              ? AppColors.surfaceVariant
              : isCompleted
              ? AppColors.primary
              : AppColors.surface,
          border: Border.all(
            color: isLocked
                ? AppColors.border
                : isInProgress
                ? AppColors.primary
                : isCompleted
                ? AppColors.primary
                : AppColors.border,
            width: isInProgress ? 3 : 2,
          ),
          boxShadow: isLocked ? null : AppShadows.sm,
        ),
        child: Center(
          child: isCompleted
              ? const Icon(Icons.check, color: Colors.white, size: 26)
              : isLocked
              ? const Icon(Icons.lock, color: AppColors.textDisabled, size: 22)
              : isInProgress
              ? _buildProgressIndicator()
              : Text(
                  '${index + 1}',
                  style: AppTypography.title.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return SizedBox(
      width: 34,
      height: 34,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: chapter.progress,
            strokeWidth: 3,
            backgroundColor: AppColors.border,
            valueColor: const AlwaysStoppedAnimation(AppColors.primary),
          ),
          Text(
            '${(chapter.progress * 100).toInt()}',
            style: AppTypography.labelSmall.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(bool isLocked, bool isCompleted, bool isInProgress) {
    return GestureDetector(
      onTap: isLocked ? null : onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isLocked ? AppColors.surfaceVariant : AppColors.surface,
          borderRadius: AppRadius.borderRadiusXl,
          border: isInProgress
              ? Border.all(color: AppColors.primary, width: 2)
              : null,
          boxShadow: isLocked ? null : AppShadows.sm,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isCompleted) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.1),
                            borderRadius: AppRadius.borderRadiusSm,
                          ),
                          child: Text(
                            'Completed',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.success,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                      if (isInProgress) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: AppRadius.borderRadiusSm,
                          ),
                          child: Text(
                            'In Progress',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                    ],
                  ),
                  if (isCompleted || isInProgress)
                    const SizedBox(height: AppSpacing.xs),
                  Text(
                    chapter.title,
                    style: AppTypography.title.copyWith(
                      color: isLocked
                          ? AppColors.textDisabled
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    chapter.subtitle,
                    style: AppTypography.body2.copyWith(
                      color: isLocked
                          ? AppColors.textDisabled
                          : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              isLocked ? Icons.lock_outline : Icons.chevron_right,
              color: isLocked
                  ? AppColors.textDisabled
                  : AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}
