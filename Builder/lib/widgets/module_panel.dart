import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../models/block_type.dart';
import '../services/block_registry.dart';

/// Block category definition
class _BlockCategory {
  final String name;
  final List<BlockType> blockTypes;
  final String description;
  final Color accentColor;

  const _BlockCategory({
    required this.name,
    required this.blockTypes,
    required this.description,
    required this.accentColor,
  });
}

/// Left module panel - shows draggable module list organized by category
class ModulePanel extends StatefulWidget {
  const ModulePanel({super.key});

  @override
  State<ModulePanel> createState() => _ModulePanelState();
}

class _ModulePanelState extends State<ModulePanel> {
  String _searchQuery = '';
  final Set<String> _expandedCategories = {'General', 'Programming'};

  static const List<_BlockCategory> _categories = [
    _BlockCategory(
      name: 'General',
      description: 'Narrative, media and quiz blocks for lesson flow',
      blockTypes: [
        BlockType.text,
        BlockType.image,
        BlockType.animation,
        BlockType.multipleChoice,
        BlockType.trueFalse,
        BlockType.matching,
      ],
      accentColor: AppColors.primary500,
    ),
    _BlockCategory(
      name: 'Programming',
      description: 'Interactive coding and execution visual blocks',
      blockTypes: [
        BlockType.codeBlock,
        BlockType.codePlayground,
        BlockType.codeExecution,
        BlockType.functionFlow,
      ],
      accentColor: AppColors.secondary500,
    ),
  ];

  List<BlockTypeInfo> _getBlocksForCategory(_BlockCategory category) {
    final allMvp = BlockRegistry.mvpTypes;
    return allMvp
        .where((info) => category.blockTypes.contains(info.type))
        .where(
          (info) =>
              _searchQuery.isEmpty ||
              info.name.toLowerCase().contains(_searchQuery.toLowerCase()),
        )
        .toList();
  }

  bool _categoryHasResults(_BlockCategory category) {
    return _getBlocksForCategory(category).isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
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
                children: const [
                  Text(
                    'Block Library',
                    style: TextStyle(
                      fontSize: AppFontSize.lg,
                      fontWeight: FontWeight.w700,
                      color: AppColors.neutral900,
                    ),
                  ),
                  SizedBox(height: AppSpacing.xs),
                  Text(
                    'Drag blocks into the canvas to build a polished lesson.',
                    style: TextStyle(
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
                    hintText: 'Search blocks',
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
                label: info.name,
                description: info.description,
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
    final blocks = _getBlocksForCategory(category);
    final isExpanded = _expandedCategories.contains(category.name);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedCategories.remove(category.name);
                } else {
                  _expandedCategories.add(category.name);
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
                      category.name == 'General'
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
                          category.name,
                          style: const TextStyle(
                            fontSize: AppFontSize.sm,
                            fontWeight: FontWeight.w700,
                            color: AppColors.neutral900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          category.description,
                          style: const TextStyle(
                            fontSize: AppFontSize.xs,
                            color: AppColors.neutral500,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '${blocks.length} block${blocks.length == 1 ? '' : 's'}',
                          style: TextStyle(
                            fontSize: AppFontSize.xs,
                            color: category.accentColor,
                            fontWeight: FontWeight.w700,
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
                        label: info.name,
                        description: info.description,
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
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(color: AppColors.neutral200),
        boxShadow: AppShadows.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            child: Icon(icon, color: accentColor, size: 18),
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
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral500,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xs,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFF7FAFC),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            ),
            child: const Icon(
              Icons.drag_indicator,
              color: AppColors.neutral400,
              size: 16,
            ),
          ),
        ],
      ),
    );
  }
}
