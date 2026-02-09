import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// Builder three-column layout
class BuilderLayout extends StatelessWidget {
  final Widget leftPanel;
  final Widget canvas;
  final Widget rightPanel;
  final double leftPanelWidth;
  final double rightPanelWidth;
  final double minCanvasWidth;

  const BuilderLayout({
    super.key,
    required this.leftPanel,
    required this.canvas,
    required this.rightPanel,
    this.leftPanelWidth = 240,
    this.rightPanelWidth = 280,
    this.minCanvasWidth = 400,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth;
        final isCompact = availableWidth < (leftPanelWidth + minCanvasWidth + rightPanelWidth);

        if (isCompact) {
          // Compact mode: collapse sidebars
          return _buildCompactLayout(context);
        }

        return _buildFullLayout(context);
      },
    );
  }

  Widget _buildFullLayout(BuildContext context) {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Row(
        children: [
          // Left module panel
          Container(
            width: leftPanelWidth,
            margin: const EdgeInsets.only(right: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
              boxShadow: AppShadows.sm,
            ),
            clipBehavior: Clip.antiAlias,
            child: leftPanel,
          ),
          // Center canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppBorderRadius.md),
                boxShadow: AppShadows.sm,
              ),
              clipBehavior: Clip.antiAlias,
              child: canvas,
            ),
          ),
          // Right properties panel
          Container(
            width: rightPanelWidth,
            margin: const EdgeInsets.only(left: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
              boxShadow: AppShadows.sm,
            ),
            clipBehavior: Clip.antiAlias,
            child: rightPanel,
          ),
        ],
      ),
    );
  }

  Widget _buildCompactLayout(BuildContext context) {
    // In compact mode, use Drawer or tabs
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Row(
        children: [
          // Collapsed left panel (icons only)
          Container(
            width: 56,
            margin: const EdgeInsets.only(right: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
              boxShadow: AppShadows.sm,
            ),
            clipBehavior: Clip.antiAlias,
            child: leftPanel,
          ),
          // Canvas takes remaining space
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppBorderRadius.md),
                boxShadow: AppShadows.sm,
              ),
              clipBehavior: Clip.antiAlias,
              child: canvas,
            ),
          ),
        ],
      ),
    );
  }
}
