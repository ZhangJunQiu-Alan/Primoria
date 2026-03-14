import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/design_tokens.dart';
import '../services/block_registry.dart';

/// Block category definition
class _BlockCategory {
  final String key;
  final List<BlockType> blockTypes;
  final Color accentColor;

  const _BlockCategory({
    required this.key,
    required this.blockTypes,
    required this.accentColor,
  });
}

/// Left module panel - shows draggable module list organized by category
class ModulePanel extends StatefulWidget {
  final BuilderLocalizations t;

  const ModulePanel({super.key, required this.t});

  @override
  State<ModulePanel> createState() => _ModulePanelState();
}

class _ModulePanelState extends State<ModulePanel> {
  String _searchQuery = '';
  final Set<String> _expandedCategories = {'general', 'programming'};

  static const List<_BlockCategory> _categories = [
    _BlockCategory(
      key: 'general',
      blockTypes: [
        BlockType.text,
        BlockType.image,
        BlockType.video,
        BlockType.animation,
        BlockType.multipleChoice,
        BlockType.trueFalse,
        BlockType.matching,
      ],
      accentColor: AppColors.primary500,
    ),
    _BlockCategory(
      key: 'programming',
      blockTypes: [
        BlockType.codeBlock,
        BlockType.codePlayground,
        BlockType.codeExecution,
        BlockType.functionFlow,
      ],
      accentColor: AppColors.secondary500,
    ),
  ];

  String _categoryLabel(String key) {
    final t = widget.t;
    switch (key) {
      case 'general':
        return t.isZh ? '通用模块' : 'General';
      case 'programming':
        return t.isZh ? '编程模块' : 'Programming';
      default:
        return key;
    }
  }

  String _categoryDescription(String key) {
    final t = widget.t;
    switch (key) {
      case 'general':
        return t.isZh ? '叙事、媒体与测验模块' : 'Narrative, media, and quiz blocks';
      case 'programming':
        return t.isZh ? '代码与执行可视化模块' : 'Coding and execution visual blocks';
      default:
        return '';
    }
  }

  String _blockName(BlockType type) {
    final t = widget.t;
    switch (type) {
      case BlockType.text:
        return t.isZh ? '文本' : 'Text';
      case BlockType.image:
        return t.isZh ? '图片' : 'Image';
      case BlockType.codeBlock:
        return t.isZh ? '代码块' : 'Code Block';
      case BlockType.codePlayground:
        return t.isZh ? '代码练习' : 'Code Playground';
      case BlockType.codeExecution:
        return t.isZh ? '代码执行' : 'Code Execution';
      case BlockType.functionFlow:
        return t.isZh ? '函数流程' : 'Function Flow';
      case BlockType.multipleChoice:
        return t.isZh ? '选择题' : 'Multiple Choice';
      case BlockType.fillBlank:
        return t.isZh ? '填空题' : 'Fill in the Blank';
      case BlockType.trueFalse:
        return t.isZh ? '判断题' : 'True/False';
      case BlockType.matching:
        return t.isZh ? '连线题' : 'Matching';
      case BlockType.animation:
        return t.isZh ? '动画' : 'Animation';
      case BlockType.video:
        return t.isZh ? '视频' : 'Video';
    }
  }

  String _blockDescription(BlockType type) {
    final t = widget.t;
    switch (type) {
      case BlockType.text:
        return t.isZh ? '富文本' : 'Rich text';
      case BlockType.image:
        return t.isZh ? '图像内容模块' : 'Image block';
      case BlockType.codeBlock:
        return t.isZh ? '代码片段与高亮' : 'Code snippet + syntax highlighting';
      case BlockType.codePlayground:
        return t.isZh ? '可运行代码编辑器' : 'Runnable code editor';
      case BlockType.codeExecution:
        return t.isZh ? '逐步执行可视化' : 'Step-by-step execution visualizer';
      case BlockType.functionFlow:
        return t.isZh ? '函数调用流程可视化' : 'Visualize caller-callee paths';
      case BlockType.multipleChoice:
        return t.isZh ? '单选 / 多选题' : 'Single / multi-select question';
      case BlockType.fillBlank:
        return t.isZh ? '填空练习' : 'Fill-in-the-blank exercise';
      case BlockType.trueFalse:
        return t.isZh ? '判断正误题' : 'True or false question';
      case BlockType.matching:
        return t.isZh ? '左右匹配连线' : 'Match items between two columns';
      case BlockType.animation:
        return t.isZh ? '预设动画与基础控制' : 'Preset animation with controls';
      case BlockType.video:
        return t.isZh ? '上传或嵌入视频内容' : 'Upload or embed video content';
    }
  }

  List<BlockTypeInfo> _getBlocksForCategory(_BlockCategory category) {
    final allMvp = BlockRegistry.mvpTypes;
    final query = _searchQuery.trim().toLowerCase();
    return allMvp
        .where((info) => category.blockTypes.contains(info.type))
        .where((info) {
          if (query.isEmpty) return true;
          final name = _blockName(info.type).toLowerCase();
          final description = _blockDescription(info.type).toLowerCase();
          return name.contains(query) || description.contains(query);
        })
        .toList();
  }

  bool _categoryHasResults(_BlockCategory category) {
    return _getBlocksForCategory(category).isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 120;

        if (isCompact) {
          return _buildCompactPanel();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.isZh ? '模块库' : 'Block Library',
                    style: const TextStyle(
                      fontSize: AppFontSize.lg,
                      fontWeight: FontWeight.w700,
                      color: AppColors.neutral900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    t.isZh
                        ? '将模块拖入画布，快速搭建课程页面。'
                        : 'Drag blocks into the canvas to build a polished lesson.',
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral500,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF7FAFC),
                  borderRadius: BorderRadius.circular(AppBorderRadius.md),
                  border: Border.all(color: AppColors.neutral200),
                ),
                child: TextField(
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: t.isZh ? '搜索模块' : 'Search blocks',
                    hintStyle: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral400,
                    ),
                    prefixIcon: const Icon(
                      Icons.search,
                      size: 18,
                      color: AppColors.neutral400,
                    ),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.sm,
                    ),
                    border: InputBorder.none,
                  ),
                  style: const TextStyle(fontSize: AppFontSize.sm),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.xs,
                  AppSpacing.md,
                  AppSpacing.md,
                ),
                children: _categories
                    .where(
                      (cat) => _searchQuery.isEmpty || _categoryHasResults(cat),
                    )
                    .map((category) => _buildCategorySection(category))
                    .toList(),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCompactPanel() {
    final modules = BlockRegistry.mvpTypes;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          alignment: Alignment.center,
          child: const Icon(
            Icons.school,
            color: AppColors.primary500,
            size: 24,
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.xs),
            itemCount: modules.length,
            itemBuilder: (context, index) {
              final info = modules[index];
              return _ModuleItem(
                icon: info.icon,
                label: _blockName(info.type),
                description: _blockDescription(info.type),
                type: info.type,
                compact: true,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySection(_BlockCategory category) {
    final t = widget.t;
    final blocks = _getBlocksForCategory(category);
    final isExpanded = _expandedCategories.contains(category.key);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedCategories.remove(category.key);
                } else {
                  _expandedCategories.add(category.key);
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: category.accentColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppBorderRadius.md),
                border: Border.all(
                  color: category.accentColor.withValues(alpha: 0.16),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: category.accentColor.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(AppBorderRadius.md),
                    ),
                    child: Icon(
                      category.key == 'general'
                          ? Icons.view_stream_outlined
                          : Icons.terminal_outlined,
                      color: category.accentColor,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _categoryLabel(category.key),
                          style: const TextStyle(
                            fontSize: AppFontSize.sm,
                            fontWeight: FontWeight.w700,
                            color: AppColors.neutral900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Icon(
                      isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      size: 20,
                      color: AppColors.neutral600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Column(
                children: blocks
                    .map(
                      (info) => _ModuleItem(
                        icon: info.icon,
                        label: _blockName(info.type),
                        description: _blockDescription(info.type),
                        type: info.type,
                        compact: false,
                        accentColor: category.accentColor,
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

/// Single module item
class _ModuleItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final BlockType type;
  final bool compact;
  final Color accentColor;

  const _ModuleItem({
    required this.icon,
    required this.label,
    required this.description,
    required this.type,
    required this.compact,
    this.accentColor = AppColors.primary500,
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
              color: accentColor,
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
        childWhenDragging: Opacity(opacity: 0.5, child: _buildContent()),
        child: Tooltip(message: description, child: _buildContent()),
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
          color: const Color(0xFFF7FAFC),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(color: AppColors.neutral200),
        boxShadow: AppShadows.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            ),
            child: Icon(icon, color: accentColor, size: 16),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral800,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral400,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
