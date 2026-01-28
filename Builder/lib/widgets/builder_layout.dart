import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// Builder 三栏布局组件
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
          // 紧凑模式：折叠侧边栏
          return _buildCompactLayout(context);
        }

        return _buildFullLayout(context);
      },
    );
  }

  Widget _buildFullLayout(BuildContext context) {
    return Row(
      children: [
        // 左侧模块面板
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
        // 中央画布
        Expanded(
          child: Container(
            color: AppColors.background,
            child: canvas,
          ),
        ),
        // 右侧属性面板
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
    // 紧凑模式下使用 Drawer 或 Tab 切换
    return Row(
      children: [
        // 折叠的左侧栏（只显示图标）
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
        // 画布占据剩余空间
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
