import 'package:flutter/material.dart';
import '../../theme/theme.dart';

/// 游戏容器状态
enum GameContainerState {
  loading,
  ready,
  interacting,
  submitting,
  success,
  failure,
  completed,
}

/// 通用游戏容器组件
class GameContainer extends StatelessWidget {
  final String title;
  final int currentIndex;
  final int totalCount;
  final Widget content;
  final VoidCallback onSubmit;
  final VoidCallback? onHint;
  final VoidCallback? onExit;
  final bool isSubmitEnabled;
  final GameContainerState state;
  final String? submitButtonText;

  const GameContainer({
    super.key,
    required this.title,
    required this.currentIndex,
    required this.totalCount,
    required this.content,
    required this.onSubmit,
    this.onHint,
    this.onExit,
    this.isSubmitEnabled = true,
    this.state = GameContainerState.ready,
    this.submitButtonText,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header 区域
            _HeaderSection(
              title: title,
              currentIndex: currentIndex,
              totalCount: totalCount,
              onExit: onExit,
            ),

            // Content 区域
            Expanded(
              child: _ContentSection(
                state: state,
                content: content,
              ),
            ),

            // Footer 区域
            _FooterSection(
              onSubmit: onSubmit,
              onHint: onHint,
              isSubmitEnabled: isSubmitEnabled,
              isLoading: state == GameContainerState.submitting,
              submitButtonText: submitButtonText,
            ),
          ],
        ),
      ),
    );
  }
}

/// Header 区域
class _HeaderSection extends StatelessWidget {
  final String title;
  final int currentIndex;
  final int totalCount;
  final VoidCallback? onExit;

  const _HeaderSection({
    required this.title,
    required this.currentIndex,
    required this.totalCount,
    this.onExit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          bottom: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Column(
        children: [
          // 顶部栏
          Row(
            children: [
              // 退出按钮
              if (onExit != null)
                IconButton(
                  onPressed: onExit,
                  icon: const Icon(Icons.close),
                  iconSize: 24,
                  color: AppColors.textSecondary,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 40,
                    minHeight: 40,
                  ),
                )
              else
                const SizedBox(width: 40),

              // 标题
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),

              // 进度文本
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: AppRadius.borderRadiusFull,
                ),
                child: Text(
                  '$currentIndex/$totalCount',
                  style: AppTypography.label.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.verticalGapSm,

          // 进度条
          _ProgressBar(
            current: currentIndex,
            total: totalCount,
          ),
        ],
      ),
    );
  }
}

/// 进度条组件
class _ProgressBar extends StatelessWidget {
  final int current;
  final int total;

  const _ProgressBar({
    required this.current,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    final progress = total > 0 ? current / total : 0.0;

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
}

/// Content 区域
class _ContentSection extends StatelessWidget {
  final GameContainerState state;
  final Widget content;

  const _ContentSection({
    required this.state,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    if (state == GameContainerState.loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return SingleChildScrollView(
      padding: AppSpacing.screenPadding,
      child: content,
    );
  }
}

/// Footer 区域
class _FooterSection extends StatelessWidget {
  final VoidCallback onSubmit;
  final VoidCallback? onHint;
  final bool isSubmitEnabled;
  final bool isLoading;
  final String? submitButtonText;

  const _FooterSection({
    required this.onSubmit,
    this.onHint,
    required this.isSubmitEnabled,
    required this.isLoading,
    this.submitButtonText,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // 提示按钮
          if (onHint != null) ...[
            OutlinedButton.icon(
              onPressed: onHint,
              icon: const Icon(Icons.lightbulb_outline, size: 20),
              label: const Text('提示'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
              ),
            ),
            AppSpacing.horizontalGapMd,
          ],

          // 提交按钮
          Expanded(
            child: ElevatedButton(
              onPressed: isSubmitEnabled && !isLoading ? onSubmit : null,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                disabledBackgroundColor: AppColors.border,
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.textOnPrimary,
                      ),
                    )
                  : Text(submitButtonText ?? '提交答案'),
            ),
          ),
        ],
      ),
    );
  }
}
