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
    return Row(
      children: [
        // Left module panel
        Container(
          width: leftPanelWidth,
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(
              right: BorderSide(color: AppColors.neutral200),
            ),
          ),
          child: leftPanel,
        ),
        // Center canvas
        Expanded(
          child: Container(
            color: AppColors.background,
            child: canvas,
          ),
        ),
        // Right properties panel
        Container(
          width: rightPanelWidth,
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(
              left: BorderSide(color: AppColors.neutral200),
            ),
          ),
          child: rightPanel,
        ),
      ],
    );
  }

  Widget _buildCompactLayout(BuildContext context) {
    // In compact mode, use Drawer or tabs
    return Row(
      children: [
        // Collapsed left panel (icons only)
        Container(
          width: 56,
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(
              right: BorderSide(color: AppColors.neutral200),
            ),
          ),
          child: leftPanel,
        ),
        // Canvas takes remaining space
        Expanded(
          child: Container(
            color: AppColors.background,
            child: canvas,
          ),
        ),
      ],
    );
  }
}
