import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../models/models.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import 'block_widgets/block_wrapper.dart';

/// 中央画布区域 - 显示和编辑模块
class BuilderCanvas extends ConsumerWidget {
  const BuilderCanvas({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);
    final blocks = ref.watch(currentPageBlocksProvider(builderState.currentPageIndex));

    return DragTarget<BlockType>(
      onAcceptWithDetails: (details) {
        final blockType = details.data;
        ref.read(courseProvider.notifier).addBlock(
          builderState.currentPageIndex,
          blockType,
        );
        ref.read(builderStateProvider.notifier).markAsUnsaved();
      },
      builder: (context, candidateData, rejectedData) {
        final isDragOver = candidateData.isNotEmpty;

        return Container(
          margin: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            border: Border.all(
              color: isDragOver ? AppColors.primary500 : AppColors.neutral200,
              width: isDragOver ? 2 : 1,
            ),
            boxShadow: AppShadows.sm,
          ),
          child: blocks.isEmpty
              ? _buildEmptyState(isDragOver)
              : _buildBlocksList(context, ref, blocks, builderState),
        );
      },
    );
  }

  Widget _buildBlocksList(
    BuildContext context,
    WidgetRef ref,
    List<Block> blocks,
    BuilderState builderState,
  ) {
    // 按 position.order 排序
    final sortedBlocks = List<Block>.from(blocks)
      ..sort((a, b) => a.position.order.compareTo(b.position.order));

    return ReorderableListView.builder(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: sortedBlocks.length,
      onReorder: (oldIndex, newIndex) {
        if (newIndex > oldIndex) newIndex--;
        ref.read(courseProvider.notifier).reorderBlocks(
          builderState.currentPageIndex,
          oldIndex,
          newIndex,
        );
        ref.read(builderStateProvider.notifier).markAsUnsaved();
      },
      itemBuilder: (context, index) {
        final block = sortedBlocks[index];
        final isSelected = builderState.selectedBlockId == block.id;

        return BlockWrapper(
          key: ValueKey(block.id),
          block: block,
          isSelected: isSelected,
          onTap: () {
            ref.read(builderStateProvider.notifier).selectBlock(block.id);
          },
          onDelete: () {
            ref.read(courseProvider.notifier).removeBlock(
              builderState.currentPageIndex,
              block.id,
            );
            ref.read(builderStateProvider.notifier).clearSelection();
            ref.read(builderStateProvider.notifier).markAsUnsaved();
          },
          onBlockUpdated: (updatedBlock) {
            ref.read(courseProvider.notifier).updateBlock(
              builderState.currentPageIndex,
              updatedBlock,
            );
            ref.read(builderStateProvider.notifier).markAsUnsaved();
          },
        );
      },
    );
  }

  Widget _buildEmptyState(bool isDragOver) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: isDragOver ? AppColors.primary50 : AppColors.neutral100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isDragOver ? Icons.add_circle : Icons.dashboard_customize,
              size: 48,
              color: isDragOver ? AppColors.primary500 : AppColors.neutral400,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            isDragOver ? 'Drop to add block' : 'Drag blocks here from the left',
            style: TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
              color: isDragOver ? AppColors.primary600 : AppColors.neutral500,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          const Text(
            'Start building your interactive course',
            style: TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral400,
            ),
          ),
        ],
      ),
    );
  }
}
