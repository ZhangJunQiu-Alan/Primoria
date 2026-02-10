import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../models/block_type.dart';
import '../services/block_registry.dart';

/// Block category definition
class _BlockCategory {
  final String name;
  final List<BlockType> blockTypes;
  final Color backgroundColor;

  const _BlockCategory({
    required this.name,
    required this.blockTypes,
    required this.backgroundColor,
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
  final Set<String> _expandedCategories = {'General', 'Physical', 'Chemical'};

  static const List<_BlockCategory> _categories = [
    _BlockCategory(
      name: 'General',
      blockTypes: [BlockType.text, BlockType.image],
      backgroundColor: Color(0xFFE8EAF6), // indigo 50
    ),
    _BlockCategory(
      name: 'Physical',
      blockTypes: [BlockType.codeBlock, BlockType.codePlayground],
      backgroundColor: Color(0xFFE3F2FD), // blue 50
    ),
    _BlockCategory(
      name: 'Chemical',
      blockTypes: [BlockType.multipleChoice, BlockType.trueFalse, BlockType.matching],
      backgroundColor: Color(0xFFE8F5E9), // green 50
    ),
  ];

  List<BlockTypeInfo> _getBlocksForCategory(_BlockCategory category) {
    final allMvp = BlockRegistry.mvpTypes;
    return allMvp
        .where((info) => category.blockTypes.contains(info.type))
        .where((info) =>
            _searchQuery.isEmpty ||
            info.name.toLowerCase().contains(_searchQuery.toLowerCase()))
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
            // Panel title
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              alignment: Alignment.centerLeft,
              child: const Text(
                'Block library',
                style: TextStyle(
                  fontSize: AppFontSize.md,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral800,
                ),
              ),
            ),
            // Search field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: TextField(
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search',
                  hintStyle: const TextStyle(
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral400,
                  ),
                  prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.neutral400),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.sm,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    borderSide: const BorderSide(color: AppColors.neutral200),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    borderSide: const BorderSide(color: AppColors.neutral200),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    borderSide: const BorderSide(color: AppColors.primary500),
                  ),
                ),
                style: const TextStyle(fontSize: AppFontSize.sm),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            // Category list
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                children: _categories
                    .where((cat) => _searchQuery.isEmpty || _categoryHasResults(cat))
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
          // Category header
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
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: category.backgroundColor,
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      category.name,
                      style: const TextStyle(
                        fontSize: AppFontSize.sm,
                        fontWeight: FontWeight.w600,
                        color: AppColors.neutral800,
                      ),
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.add,
                    size: 18,
                    color: AppColors.neutral600,
                  ),
                ],
              ),
            ),
          ),
          // Expanded block items
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xs),
              child: Column(
                children: blocks
                    .map((info) => _ModuleItem(
                          icon: info.icon,
                          label: info.name,
                          description: info.description,
                          type: info.type,
                          compact: false,
                        ))
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
