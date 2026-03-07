import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../models/models.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import 'block_widgets/block_wrapper.dart';

/// Center canvas area - display and edit blocks
class BuilderCanvas extends ConsumerStatefulWidget {
  const BuilderCanvas({super.key});

  @override
  ConsumerState<BuilderCanvas> createState() => _BuilderCanvasState();
}

class _BuilderCanvasState extends ConsumerState<BuilderCanvas> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _listViewportKey = GlobalKey();
  final Map<String, GlobalKey> _itemKeys = {};

  Timer? _autoScrollTimer;
  Offset? _lastPointerGlobalPosition;
  int? _draggingIndex;
  int? _insertionIndex;

  @override
  void dispose() {
    _stopAutoScroll();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final builderState = ref.watch(builderStateProvider);
    final sortedBlocks = ref.watch(
      sortedLessonBlocksProvider(builderState.currentLessonIndex),
    );

    return DragTarget<BlockType>(
      onAcceptWithDetails: (details) {
        final blockType = details.data;
        ref
            .read(courseProvider.notifier)
            .addBlock(builderState.currentLessonIndex, blockType);
        ref.read(builderStateProvider.notifier).markAsUnsaved();
      },
      builder: (context, candidateData, rejectedData) {
        final isDragOver = candidateData.isNotEmpty;
        _syncItemKeyMap(sortedBlocks);

        final child = sortedBlocks.isEmpty
            ? _buildEmptyState(isDragOver)
            : _buildBlocksList(sortedBlocks, builderState);

        if (!isDragOver) return child;

        return DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.primary500, width: 2),
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
          ),
          child: child,
        );
      },
    );
  }

  Widget _buildBlocksList(List<Block> sortedBlocks, BuilderState builderState) {
    return Listener(
      onPointerMove: (event) =>
          _handlePointerUpdate(event.position, sortedBlocks),
      onPointerHover: (event) =>
          _handlePointerUpdate(event.position, sortedBlocks),
      child: ReorderableListView.builder(
        key: _listViewportKey,
        scrollController: _scrollController,
        buildDefaultDragHandles: false,
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.xl,
          AppSpacing.lg,
          AppSpacing.xl,
          AppSpacing.xl,
        ),
        itemCount: sortedBlocks.length,
        onReorderStart: _onReorderStart,
        onReorderEnd: _onReorderEnd,
        onReorder: (oldIndex, newIndex) {
          if (newIndex > oldIndex) newIndex--;
          ref
              .read(courseProvider.notifier)
              .reorderBlocks(
                builderState.currentLessonIndex,
                oldIndex,
                newIndex,
              );
          ref.read(builderStateProvider.notifier).markAsUnsaved();
        },
        footer: _draggingIndex != null && _insertionIndex == sortedBlocks.length
            ? _buildInsertionIndicator()
            : const SizedBox.shrink(),
        proxyDecorator: (child, index, animation) {
          return AnimatedBuilder(
            animation: animation,
            builder: (context, _) {
              final elevation = Tween<double>(
                begin: 1,
                end: 8,
              ).evaluate(animation);
              return Material(
                elevation: elevation,
                borderRadius: BorderRadius.circular(AppBorderRadius.md),
                color: Colors.transparent,
                child: child,
              );
            },
          );
        },
        itemBuilder: (context, index) {
          final block = sortedBlocks[index];
          final isSelected = builderState.selectedBlockId == block.id;
          final isInsertBefore =
              _draggingIndex != null && _insertionIndex == index;

          return Container(
            key: ValueKey(block.id),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (index == 0) _buildCanvasHeader(sortedBlocks.length),
                if (isInsertBefore) _buildInsertionIndicator(),
                KeyedSubtree(
                  key: _itemKeyFor(block.id),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: BlockWrapper(
                      block: block,
                      isSelected: isSelected,
                      dragHandle: _buildDragHandle(index),
                      onTap: () {
                        ref
                            .read(builderStateProvider.notifier)
                            .selectBlock(block.id);
                      },
                      onDelete: () {
                        ref
                            .read(courseProvider.notifier)
                            .removeBlock(
                              builderState.currentLessonIndex,
                              block.id,
                            );
                        ref
                            .read(builderStateProvider.notifier)
                            .clearSelection();
                        ref.read(builderStateProvider.notifier).markAsUnsaved();
                      },
                      onBlockUpdated: (updatedBlock) {
                        ref
                            .read(courseProvider.notifier)
                            .updateBlock(
                              builderState.currentLessonIndex,
                              updatedBlock,
                            );
                        ref.read(builderStateProvider.notifier).markAsUnsaved();
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDragHandle(int index) {
    return ReorderableDragStartListener(
      index: index,
      child: Tooltip(
        message: 'Drag to reorder',
        child: Container(
          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          decoration: BoxDecoration(
            color: const Color(0xFFF7FAFC),
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: const Icon(
            Icons.drag_indicator,
            size: 16,
            color: AppColors.neutral500,
          ),
        ),
      ),
    );
  }

  Widget _buildInsertionIndicator() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      child: Row(
        children: [
          const Expanded(
            child: Divider(
              height: 2,
              thickness: 2,
              color: AppColors.primary400,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xs,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.primary300),
            ),
            child: const Text(
              'Drop here',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.primary600,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          const Expanded(
            child: Divider(
              height: 2,
              thickness: 2,
              color: AppColors.primary400,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDragOver) {
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppBorderRadius.lg),
          border: Border.all(
            color: isDragOver ? AppColors.primary300 : AppColors.neutral200,
            width: isDragOver ? 2 : 1,
          ),
          boxShadow: AppShadows.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isDragOver ? AppColors.primary50 : AppColors.neutral100,
                borderRadius: BorderRadius.circular(AppBorderRadius.lg),
              ),
              child: Icon(
                isDragOver
                    ? Icons.add_circle_outline_rounded
                    : Icons.view_agenda_outlined,
                size: 32,
                color: isDragOver ? AppColors.primary500 : AppColors.neutral500,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              isDragOver
                  ? 'Drop block to add it here'
                  : 'Start building this lesson',
              style: TextStyle(
                fontSize: AppFontSize.lg,
                fontWeight: FontWeight.w700,
                color: isDragOver ? AppColors.primary600 : AppColors.neutral900,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Use the block library on the left, then select any block to refine its settings on the right.',
              style: TextStyle(
                fontSize: AppFontSize.sm,
                color: isDragOver ? AppColors.primary500 : AppColors.neutral500,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCanvasHeader(int blockCount) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FAFC),
          borderRadius: BorderRadius.circular(AppBorderRadius.md),
          border: Border.all(color: AppColors.neutral200),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.secondary50,
                borderRadius: BorderRadius.circular(AppBorderRadius.md),
              ),
              child: const Icon(
                Icons.auto_stories_outlined,
                color: AppColors.secondary700,
                size: 20,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Lesson Canvas',
                    style: TextStyle(
                      fontSize: AppFontSize.md,
                      fontWeight: FontWeight.w700,
                      color: AppColors.neutral900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$blockCount block${blockCount == 1 ? '' : 's'} in this lesson',
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral500,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppBorderRadius.pill),
                border: Border.all(color: AppColors.neutral200),
              ),
              child: const Text(
                'Drag to reorder',
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onReorderStart(int index) {
    _draggingIndex = index;
    _insertionIndex = index;
    _startAutoScroll();
    if (mounted) setState(() {});
  }

  void _onReorderEnd(int index) {
    _stopAutoScroll();
    _draggingIndex = null;
    _insertionIndex = null;
    _lastPointerGlobalPosition = null;
    if (mounted) setState(() {});
  }

  void _handlePointerUpdate(Offset globalPosition, List<Block> sortedBlocks) {
    if (_draggingIndex == null) return;
    _lastPointerGlobalPosition = globalPosition;
    _updateInsertionIndexFromPointer(globalPosition, sortedBlocks);
  }

  void _startAutoScroll() {
    _autoScrollTimer?.cancel();
    _autoScrollTimer = Timer.periodic(const Duration(milliseconds: 16), (_) {
      if (!mounted || _draggingIndex == null) return;
      final pointer = _lastPointerGlobalPosition;
      if (pointer == null || !_scrollController.hasClients) return;

      final viewportBox =
          _listViewportKey.currentContext?.findRenderObject() as RenderBox?;
      if (viewportBox == null || !viewportBox.attached) return;

      final local = viewportBox.globalToLocal(pointer);
      const triggerDistance = 72.0;
      const maxPixelsPerTick = 18.0;

      double delta = 0;
      if (local.dy < triggerDistance) {
        final ratio = ((triggerDistance - local.dy) / triggerDistance).clamp(
          0.0,
          1.0,
        );
        delta = -maxPixelsPerTick * ratio;
      } else if (local.dy > viewportBox.size.height - triggerDistance) {
        final ratio =
            ((local.dy - (viewportBox.size.height - triggerDistance)) /
                    triggerDistance)
                .clamp(0.0, 1.0);
        delta = maxPixelsPerTick * ratio;
      }

      if (delta.abs() < 0.1) return;

      final current = _scrollController.offset;
      final target = (current + delta).clamp(
        0.0,
        _scrollController.position.maxScrollExtent,
      );

      if (target != current) {
        _scrollController.jumpTo(target);
      }

      _updateInsertionIndexFromPointer(pointer, _readSortedBlocks());
    });
  }

  void _stopAutoScroll() {
    _autoScrollTimer?.cancel();
    _autoScrollTimer = null;
  }

  void _updateInsertionIndexFromPointer(
    Offset globalPointer,
    List<Block> sortedBlocks,
  ) {
    final viewportBox =
        _listViewportKey.currentContext?.findRenderObject() as RenderBox?;
    if (viewportBox == null || !viewportBox.attached) return;

    final localPointer = viewportBox.globalToLocal(globalPointer);
    var targetIndex = sortedBlocks.length;

    for (int i = 0; i < sortedBlocks.length; i++) {
      final key = _itemKeys[sortedBlocks[i].id];
      final box = key?.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) continue;

      // During a drag, ReorderableListView moves the dragged item's GlobalKey
      // element into an Overlay widget, so `box` is no longer a descendant of
      // `viewportBox`. Calling localToGlobal(ancestor: viewportBox) in that
      // case walks up the render tree past the root and throws
      // "Unexpected null value." — skip any box not under the viewport.
      final double top;
      try {
        top = box.localToGlobal(Offset.zero, ancestor: viewportBox).dy;
      } catch (_) {
        continue;
      }
      final mid = top + (box.size.height / 2);
      if (localPointer.dy < mid) {
        targetIndex = i;
        break;
      }
    }

    if (_insertionIndex != targetIndex && mounted) {
      setState(() {
        _insertionIndex = targetIndex;
      });
    }
  }

  List<Block> _readSortedBlocks() {
    final state = ref.read(builderStateProvider);
    return ref.read(sortedLessonBlocksProvider(state.currentLessonIndex));
  }

  void _syncItemKeyMap(List<Block> sortedBlocks) {
    final activeIds = sortedBlocks.map((b) => b.id).toSet();
    _itemKeys.removeWhere((id, _) => !activeIds.contains(id));
    for (final block in sortedBlocks) {
      _itemKeys.putIfAbsent(block.id, GlobalKey.new);
    }
  }

  GlobalKey _itemKeyFor(String blockId) {
    return _itemKeys.putIfAbsent(blockId, GlobalKey.new);
  }
}
