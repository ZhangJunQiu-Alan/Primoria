/// Viewer 首页 - 课程渲染器入口
/// 占位页面，用于预览构建的课程
library;

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../providers/course_provider.dart';
import '../../models/models.dart';
import '../../widgets/block_widgets/code_playground_widget.dart';

class ViewerScreen extends ConsumerWidget {
  const ViewerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final course = ref.watch(courseProvider);
    final pages = course.pages;

    return DefaultTabController(
      length: pages.isEmpty ? 1 : pages.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(course.metadata.title.isEmpty ? 'Course Preview' : course.metadata.title),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/builder'),
          ),
          bottom: pages.isEmpty
              ? null
              : TabBar(
                  isScrollable: true,
                  tabs: pages
                      .asMap()
                      .entries
                      .map((entry) => Tab(text: 'Page ${entry.key + 1}'))
                      .toList(),
                ),
        ),
        body: pages.isEmpty
            ? _buildEmptyState()
            : TabBarView(
                children: pages.map((page) => _buildPagePreview(page)).toList(),
              ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.visibility,
            size: 80,
            color: AppColors.primary500,
          ),
          SizedBox(height: AppSpacing.lg),
          Text(
            'Course Preview',
            style: TextStyle(
              fontSize: AppFontSize.xxl,
              fontWeight: FontWeight.bold,
              color: AppColors.neutral800,
            ),
          ),
          SizedBox(height: AppSpacing.sm),
          Text(
            'No course content yet. Create one in Builder first.',
            style: TextStyle(
              fontSize: AppFontSize.md,
              color: AppColors.neutral500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPagePreview(CoursePage page) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text(
          page.title,
          style: const TextStyle(
            fontSize: AppFontSize.xl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (page.blocks.isEmpty)
          const Text(
            'This page is empty.',
            style: TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral500,
            ),
          )
        else
          ...page.blocks.map((block) => _BlockPreview(block: block)),
      ],
    );
  }
}

class _BlockPreview extends StatelessWidget {
  final Block block;

  const _BlockPreview({required this.block});

  @override
  Widget build(BuildContext context) {
    final spacing = _spacingToValue(block.style.spacing);
    final alignment = _alignmentToAlignment(block.style.alignment);
    return Padding(
      padding: EdgeInsets.only(bottom: spacing),
      child: Align(
        alignment: alignment,
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    switch (block.type) {
      case BlockType.text:
        final content = block.content as TextContent;
        if (content.format == 'markdown') {
          return MarkdownBody(
            data: content.value.isEmpty ? ' ' : content.value,
          );
        }
        return Text(
          content.value.isEmpty ? ' ' : content.value,
          textAlign: _alignmentToTextAlign(block.style.alignment),
          style: const TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
        );
      case BlockType.image:
        final content = block.content as ImageContent;
        if (content.url.isEmpty) {
          return Container(
            height: 160,
            width: 240,
            decoration: BoxDecoration(
              color: AppColors.neutral100,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: const Center(
              child: Icon(Icons.image, color: AppColors.neutral400),
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Image.network(content.url),
            if ((content.caption ?? '').isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                content.caption!,
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),
            ],
          ],
        );
      case BlockType.codeBlock:
        final content = block.content as CodeBlockContent;
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.neutral800,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: Text(
            content.code,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: AppFontSize.sm,
              color: AppColors.neutral100,
            ),
          ),
        );
      case BlockType.codePlayground:
        final content = block.content as CodePlaygroundContent;
        return CodePlaygroundWidget(content: content);
      case BlockType.multipleChoice:
        final content = block.content as MultipleChoiceContent;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              content.question,
              style: const TextStyle(
                fontSize: AppFontSize.md,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ...content.options.map((option) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                  child: Text(
                    option.text,
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral700,
                    ),
                  ),
                )),
          ],
        );
      case BlockType.fillBlank:
        final content = block.content as FillBlankContent;
        return Text(
          content.question,
          style: const TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
        );
      case BlockType.matching:
        final content = block.content as MatchingContent;
        return _MatchingWidget(content: content);
      case BlockType.video:
        return Container(
          height: 180,
          width: 320,
          decoration: BoxDecoration(
            color: AppColors.neutral800,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: const Center(
            child: Icon(Icons.play_circle_outline,
                size: 48, color: AppColors.neutral400),
          ),
        );
    }
  }

  Alignment _alignmentToAlignment(String value) {
    switch (value) {
      case 'center':
        return Alignment.center;
      case 'right':
        return Alignment.centerRight;
      case 'left':
      default:
        return Alignment.centerLeft;
    }
  }

  TextAlign _alignmentToTextAlign(String value) {
    switch (value) {
      case 'center':
        return TextAlign.center;
      case 'right':
        return TextAlign.right;
      case 'left':
      default:
        return TextAlign.left;
    }
  }

  double _spacingToValue(String value) {
    switch (value) {
      case 'xs':
        return AppSpacing.xs;
      case 'sm':
        return AppSpacing.sm;
      case 'lg':
        return AppSpacing.lg;
      case 'xl':
        return AppSpacing.xl;
      case 'md':
      default:
        return AppSpacing.md;
    }
  }
}

/// 连线题 Widget
class _MatchingWidget extends StatefulWidget {
  final MatchingContent content;

  const _MatchingWidget({required this.content});

  @override
  State<_MatchingWidget> createState() => _MatchingWidgetState();
}

class _MatchingWidgetState extends State<_MatchingWidget> {
  final Map<String, String> _userPairs = {}; // leftId -> rightId
  bool _submitted = false;
  String? _selectedLeftId;

  void _handleLeftItemTap(String leftId) {
    if (_submitted) return;
    setState(() {
      _selectedLeftId = leftId;
    });
  }

  void _handleRightItemTap(String rightId) {
    if (_submitted || _selectedLeftId == null) return;
    setState(() {
      _userPairs[_selectedLeftId!] = rightId;
      _selectedLeftId = null;
    });
  }

  void _submit() {
    setState(() {
      _submitted = true;
    });
  }

  void _reset() {
    setState(() {
      _userPairs.clear();
      _submitted = false;
      _selectedLeftId = null;
    });
  }

  bool _isPairCorrect(String leftId, String? rightId) {
    if (rightId == null) return false;
    final correctPair = widget.content.correctPairs.firstWhere(
      (p) => p.leftId == leftId,
      orElse: () => const MatchingPair(leftId: '', rightId: ''),
    );
    return correctPair.rightId == rightId;
  }

  int _getCorrectCount() {
    int count = 0;
    for (final entry in _userPairs.entries) {
      if (_isPairCorrect(entry.key, entry.value)) count++;
    }
    return count;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.neutral50,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question
          Text(
            widget.content.question,
            style: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          const Text(
            'Tap items on the left, then tap matching items on the right',
            style: TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Matching interface
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: widget.content.leftItems.map((item) {
                    final isSelected = _selectedLeftId == item.id;
                    final isPaired = _userPairs.containsKey(item.id);
                    final isCorrect = _submitted && _isPairCorrect(item.id, _userPairs[item.id]);
                    final isIncorrect = _submitted && isPaired && !isCorrect;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: GestureDetector(
                        onTap: () => _handleLeftItemTap(item.id),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary100
                                : (isCorrect
                                    ? AppColors.success.withOpacity(0.1)
                                    : (isIncorrect
                                        ? AppColors.error.withOpacity(0.1)
                                        : Colors.white)),
                            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary500
                                  : (isCorrect
                                      ? AppColors.success
                                      : (isIncorrect ? AppColors.error : AppColors.neutral300)),
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  item.text,
                                  style: const TextStyle(
                                    fontSize: AppFontSize.sm,
                                    color: AppColors.neutral700,
                                  ),
                                ),
                              ),
                              if (isPaired) ...[
                                const SizedBox(width: AppSpacing.xs),
                                Icon(
                                  _submitted
                                      ? (isCorrect ? Icons.check_circle : Icons.cancel)
                                      : Icons.link,
                                  size: 16,
                                  color: _submitted
                                      ? (isCorrect ? AppColors.success : AppColors.error)
                                      : AppColors.primary500,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Right column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: widget.content.rightItems.map((item) {
                    final isPaired = _userPairs.values.contains(item.id);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: GestureDetector(
                        onTap: () => _handleRightItemTap(item.id),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: isPaired
                                ? AppColors.neutral100
                                : Colors.white,
                            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                            border: Border.all(
                              color: AppColors.neutral300,
                            ),
                          ),
                          child: Text(
                            item.text,
                            style: const TextStyle(
                              fontSize: AppFontSize.sm,
                              color: AppColors.neutral700,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // Action buttons
          Row(
            children: [
              ElevatedButton(
                onPressed: _submitted || _userPairs.isEmpty ? null : _submit,
                child: const Text('Submit'),
              ),
              const SizedBox(width: AppSpacing.sm),
              if (_submitted)
                TextButton(
                  onPressed: _reset,
                  child: const Text('Try Again'),
                ),
            ],
          ),

          // Results
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: _getCorrectCount() == widget.content.leftItems.length
                    ? AppColors.success.withOpacity(0.1)
                    : AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              ),
              child: Row(
                children: [
                  Icon(
                    _getCorrectCount() == widget.content.leftItems.length
                        ? Icons.celebration
                        : Icons.info_outline,
                    color: _getCorrectCount() == widget.content.leftItems.length
                        ? AppColors.success
                        : AppColors.warning,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Score: ${_getCorrectCount()}/${widget.content.leftItems.length}',
                      style: const TextStyle(
                        fontSize: AppFontSize.sm,
                        fontWeight: FontWeight.w600,
                        color: AppColors.neutral700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (widget.content.explanation != null &&
                widget.content.explanation!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primary50,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.lightbulb_outline,
                        size: 16, color: AppColors.primary500),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        widget.content.explanation!,
                        style: const TextStyle(
                          fontSize: AppFontSize.sm,
                          color: AppColors.neutral700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
