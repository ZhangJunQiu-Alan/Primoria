import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../theme/design_tokens.dart';
import '../models/models.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import 'block_widgets/block_wrapper.dart';

/// Center canvas area - display and edit blocks
class BuilderCanvas extends ConsumerStatefulWidget {
  final BuilderLocalizations t;

  const BuilderCanvas({super.key, required this.t});

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
    final lessonIndex = builderState.currentLessonIndex;
    final pageIndex = builderState.currentPageIndex;
    final sortedBlocks = ref.watch(
      sortedPageBlocksProvider((lessonIndex, pageIndex)),
    );

    final lesson = ref.watch(courseProvider).getLesson(lessonIndex);
    final pages = lesson?.pages ?? [];

    return Column(
      children: [
        _PageNavigationStrip(
          t: widget.t,
          pages: pages,
          currentPageIndex: pageIndex,
          lessonIndex: lessonIndex,
        ),
        Expanded(
          child: DragTarget<BlockType>(
            onAcceptWithDetails: (details) {
              final blockType = details.data;
              ref
                  .read(courseProvider.notifier)
                  .addBlock(lessonIndex, blockType, pageIndex: pageIndex);
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
          ),
        ),
      ],
    );
  }

  Widget _buildBlocksList(List<Block> sortedBlocks, BuilderState builderState) {
    final lessonIndex = builderState.currentLessonIndex;
    final pageIndex = builderState.currentPageIndex;

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
                lessonIndex,
                oldIndex,
                newIndex,
                pageIndex: pageIndex,
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
                if (isInsertBefore) _buildInsertionIndicator(),
                KeyedSubtree(
                  key: _itemKeyFor(block.id),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: BlockWrapper(
                      block: block,
                      t: widget.t,
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
                              lessonIndex,
                              block.id,
                              pageIndex: pageIndex,
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
                              lessonIndex,
                              updatedBlock,
                              pageIndex: pageIndex,
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
    final t = widget.t;
    return ReorderableDragStartListener(
      index: index,
      child: Tooltip(
        message: t.isZh ? '拖拽调整顺序' : 'Drag to reorder',
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
    final t = widget.t;
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
            child: Text(
              t.isZh ? '放置到这里' : 'Drop here',
              style: const TextStyle(
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
    final t = widget.t;
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
                  ? (t.isZh ? '拖到这里添加模块' : 'Drop block to add it here')
                  : (t.isZh ? '开始搭建这一课' : 'Start building this lesson'),
              style: TextStyle(
                fontSize: AppFontSize.lg,
                fontWeight: FontWeight.w700,
                color: isDragOver ? AppColors.primary600 : AppColors.neutral900,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              t.isZh
                  ? '先从左侧模块库拖入内容，再在右侧面板中细化属性。'
                  : 'Use the block library on the left, then select any block to refine its settings on the right.',
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

  // ---------------------------------------------------------------------------
  // Reorder / auto-scroll helpers
  // ---------------------------------------------------------------------------

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
    final s = ref.read(builderStateProvider);
    return ref.read(sortedPageBlocksProvider((s.currentLessonIndex, s.currentPageIndex)));
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

// ---------------------------------------------------------------------------
// Page Navigation Strip
// ---------------------------------------------------------------------------

class _PageNavigationStrip extends ConsumerWidget {
  final BuilderLocalizations t;
  final List<LessonPage> pages;
  final int currentPageIndex;
  final int lessonIndex;

  const _PageNavigationStrip({
    required this.t,
    required this.pages,
    required this.currentPageIndex,
    required this.lessonIndex,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canAddPage = pages.isNotEmpty &&
        currentPageIndex < pages.length &&
        pages[currentPageIndex].blocks.isNotEmpty;

    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.neutral200)),
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (int i = 0; i < pages.length; i++) ...[
                    _PageTab(
                      t: t,
                      index: i,
                      isActive: i == currentPageIndex,
                      canDelete: pages.length > 1,
                      onTap: () {
                        ref
                            .read(builderStateProvider.notifier)
                            .setCurrentPage(i);
                      },
                      onDelete: () {
                        // If deleting current page, move to previous
                        final newIndex =
                            (i == currentPageIndex && i > 0) ? i - 1 : (i < currentPageIndex ? currentPageIndex - 1 : currentPageIndex);
                        ref
                            .read(courseProvider.notifier)
                            .removePage(lessonIndex, i);
                        ref
                            .read(builderStateProvider.notifier)
                            .setCurrentPage(newIndex.clamp(0, pages.length - 2));
                      },
                    ),
                    if (i < pages.length - 1)
                      const SizedBox(width: AppSpacing.xs),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Tooltip(
            message: canAddPage
                ? (t.isZh ? '新建页' : 'New page')
                : (t.isZh ? '请先在当前页添加模块' : 'Add a block first'),
            child: InkWell(
              onTap: canAddPage
                  ? () {
                      final added = ref
                          .read(courseProvider.notifier)
                          .addPage(lessonIndex, currentPageIndex);
                      if (added) {
                        ref
                            .read(builderStateProvider.notifier)
                            .setCurrentPage(pages.length);
                        ref.read(builderStateProvider.notifier).markAsUnsaved();
                      }
                    }
                  : null,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: canAddPage
                      ? AppColors.primary50
                      : AppColors.neutral100,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(
                    color: canAddPage
                        ? AppColors.primary300
                        : AppColors.neutral200,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.add,
                      size: 14,
                      color: canAddPage
                          ? AppColors.primary500
                          : AppColors.neutral400,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      t.isZh ? '新建页' : 'New page',
                      style: TextStyle(
                        fontSize: AppFontSize.xs,
                        fontWeight: FontWeight.w600,
                        color: canAddPage
                            ? AppColors.primary500
                            : AppColors.neutral400,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PageTab extends StatelessWidget {
  final BuilderLocalizations t;
  final int index;
  final bool isActive;
  final bool canDelete;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _PageTab({
    required this.t,
    required this.index,
    required this.isActive,
    required this.canDelete,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary500 : AppColors.neutral100,
          borderRadius: BorderRadius.circular(AppBorderRadius.pill),
          border: Border.all(
            color: isActive ? AppColors.primary500 : AppColors.neutral300,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              t.isZh ? '第 ${index + 1} 页' : 'Page ${index + 1}',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: isActive ? Colors.white : AppColors.neutral600,
              ),
            ),
            if (canDelete) ...[
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onDelete,
                child: Icon(
                  Icons.close,
                  size: 12,
                  color: isActive
                      ? Colors.white.withValues(alpha: 0.8)
                      : AppColors.neutral400,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
