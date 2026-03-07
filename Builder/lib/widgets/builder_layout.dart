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
        final isCompact =
            availableWidth <
            (leftPanelWidth + minCanvasWidth + rightPanelWidth);

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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF4F8FC), Color(0xFFEEF4F8), Color(0xFFF7FAFC)],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
      ),
      child: Row(
        children: [
          _PanelShell(
            width: leftPanelWidth,
            margin: const EdgeInsets.only(right: AppSpacing.sm),
            accentColor: AppColors.primary500,
            child: leftPanel,
          ),
          Expanded(
            child: _PanelShell(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              accentColor: AppColors.secondary500,
              child: canvas,
            ),
          ),
          _PanelShell(
            width: rightPanelWidth,
            margin: const EdgeInsets.only(left: AppSpacing.sm),
            accentColor: AppColors.accent500,
            child: rightPanel,
          ),
        ],
      ),
    );
  }

  Widget _buildCompactLayout(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF4F8FC), Color(0xFFF7FAFC)],
        ),
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          _PanelShell(
            width: 56,
            margin: const EdgeInsets.only(right: AppSpacing.sm),
            accentColor: AppColors.primary500,
            child: leftPanel,
          ),
          Expanded(
            child: _PanelShell(
              accentColor: AppColors.secondary500,
              child: canvas,
            ),
          ),
        ],
      ),
    );
  }
}

class _PanelShell extends StatelessWidget {
  final Widget child;
  final double? width;
  final EdgeInsetsGeometry? margin;
  final Color accentColor;

  const _PanelShell({
    required this.child,
    required this.accentColor,
    this.width,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      margin: margin,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
        border: Border.all(color: AppColors.neutral200),
        boxShadow: [
          ...AppShadows.md,
          BoxShadow(
            color: accentColor.withValues(alpha: 0.08),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}
