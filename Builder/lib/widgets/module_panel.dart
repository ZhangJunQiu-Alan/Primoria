import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../models/block_type.dart';
import '../services/block_registry.dart';

/// 左侧模块面板 - 显示可拖拽的模块列表
class ModulePanel extends StatelessWidget {
  const ModulePanel({super.key});

  @override
  Widget build(BuildContext context) {
    final modules = BlockRegistry.mvpTypes;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 120;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 面板标题 / Logo
            Container(
              padding: EdgeInsets.all(isCompact ? AppSpacing.sm : AppSpacing.md),
              alignment: isCompact ? Alignment.center : Alignment.centerLeft,
              child: isCompact
                  ? const Icon(
                      Icons.school,
                      color: AppColors.primary500,
                      size: 24,
                    )
                  : const Text(
                      'Block Library',
                      style: TextStyle(
                        fontSize: AppFontSize.md,
                        fontWeight: FontWeight.w600,
                        color: AppColors.neutral800,
                      ),
                    ),
            ),
            const Divider(height: 1),
            // 模块列表
            Expanded(
              child: ListView.builder(
                padding: EdgeInsets.all(isCompact ? AppSpacing.xs : AppSpacing.sm),
                itemCount: modules.length,
                itemBuilder: (context, index) {
                  final info = modules[index];
                  return _ModuleItem(
                    icon: info.icon,
                    label: info.name,
                    description: info.description,
                    type: info.type,
                    compact: isCompact,
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

/// 单个模块项
class _ModuleItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final BlockType type;
  final bool compact;

  const _ModuleItem({
    required this.icon,
    required this.label,
    required this.description,
    required this.type,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: compact ? AppSpacing.xs : AppSpacing.xs),
      child: Draggable<BlockType>(
        data: type,
        feedback: Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(AppBorderRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary500,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: Colors.white, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: AppFontSize.sm,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        childWhenDragging: Opacity(
          opacity: 0.5,
          child: _buildContent(),
        ),
        child: Tooltip(
          message: description,
          child: _buildContent(),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (compact) {
      return Container(
        height: 40,
        width: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.neutral50,
          borderRadius: BorderRadius.circular(AppBorderRadius.md),
          border: Border.all(color: AppColors.neutral200),
        ),
        child: Icon(icon, color: AppColors.neutral600, size: 20),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.neutral50,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.neutral600, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral700,
              ),
            ),
          ),
          const Icon(
            Icons.drag_indicator,
            color: AppColors.neutral300,
            size: 16,
          ),
        ],
      ),
    );
  }
}
