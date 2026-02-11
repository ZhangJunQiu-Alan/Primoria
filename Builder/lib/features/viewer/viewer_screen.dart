/// Viewer home - course renderer entry
/// Phone-mockup preview with interactive question blocks and visibilityRule support
library;

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/design_tokens.dart';
import '../../providers/course_provider.dart';
import '../../models/models.dart';
import '../../widgets/block_widgets/code_playground_widget.dart';

class ViewerScreen extends ConsumerWidget {
  final String? courseId;

  const ViewerScreen({super.key, this.courseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final course = ref.watch(courseProvider);
    final pages = course.pages;

    return DefaultTabController(
      length: pages.isEmpty ? 1 : pages.length,
      child: Scaffold(
        backgroundColor: AppColors.neutral100,
        appBar: AppBar(
          title: Text(
            course.metadata.title.isEmpty
                ? 'Course Preview'
                : course.metadata.title,
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              final id = courseId ?? '';
              if (id.isNotEmpty) {
                context.go('/builder?courseId=$id');
              } else {
                context.go('/builder');
              }
            },
          ),
        ),
        body: pages.isEmpty
            ? _buildEmptyState()
            : Column(
                children: [
                  // Page tabs outside the phone frame
                  if (pages.length > 1)
                    Material(
                      color: Colors.white,
                      child: TabBar(
                        isScrollable: true,
                        labelColor: AppColors.primary500,
                        unselectedLabelColor: AppColors.neutral500,
                        indicatorColor: AppColors.primary500,
                        tabs: pages
                            .asMap()
                            .entries
                            .map((entry) => Tab(text: 'Page ${entry.key + 1}'))
                            .toList(),
                      ),
                    ),
                  // Phone mockup
                  Expanded(
                    child: Center(
                      child: Container(
                        width: 375,
                        height: 812,
                        margin: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(40),
                          border: Border.all(
                            color: AppColors.neutral300,
                            width: 4,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 30,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(36),
                          child: Column(
                            children: [
                              // Phone status bar
                              Container(
                                height: 44,
                                color: AppColors.primary500,
                                child: const Center(
                                  child: Text(
                                    'Primoria Preview',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: AppFontSize.xs,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                              // Course content
                              Expanded(
                                child: TabBarView(
                                  children: pages
                                      .map(
                                        (page) =>
                                            _InteractivePageView(page: page),
                                      )
                                      .toList(),
                                ),
                              ),
                              // Phone home indicator
                              Container(
                                height: 34,
                                color: Colors.white,
                                child: Center(
                                  child: Container(
                                    width: 134,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: AppColors.neutral300,
                                      borderRadius: BorderRadius.circular(2.5),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.visibility, size: 80, color: AppColors.primary500),
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
}

// ---------------------------------------------------------------------------
// Interactive page view — manages per-block answer state & visibilityRule
// ---------------------------------------------------------------------------
class _InteractivePageView extends StatefulWidget {
  final CoursePage page;

  const _InteractivePageView({required this.page});

  @override
  State<_InteractivePageView> createState() => _InteractivePageViewState();
}

class _InteractivePageViewState extends State<_InteractivePageView> {
  /// Tracks which block indices have been answered correctly.
  final Map<int, bool> _correctState = {};

  /// Incremented each time the user taps the Check button.
  final ValueNotifier<int> _checkTrigger = ValueNotifier<int>(0);

  /// Whether the user has pressed Check at least once.
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    // Auto-mark non-interactive blocks as correct.
    final blocks = widget.page.blocks;
    for (int i = 0; i < blocks.length; i++) {
      if (!_isQuestionType(blocks[i].type)) {
        _correctState[i] = true;
      }
    }
  }

  @override
  void dispose() {
    _checkTrigger.dispose();
    super.dispose();
  }

  void _onBlockAnswered(int index, bool isCorrect) {
    setState(() {
      _correctState[index] = isCorrect;
    });
  }

  void _onCheck() {
    setState(() {
      _checked = true;
      _checkTrigger.value++;
    });
  }

  /// Computes visibility sequentially so hidden gated blocks also gate
  /// subsequent blocks until they are unlocked.
  List<bool> _computeBlockVisibility(List<Block> blocks) {
    final visibility = List<bool>.filled(blocks.length, true);

    for (int index = 0; index < blocks.length; index++) {
      final previousVisible = index == 0 ? true : visibility[index - 1];
      if (!previousVisible) {
        visibility[index] = false;
        continue;
      }

      final block = blocks[index];
      if (block.visibilityRule != 'afterPreviousCorrect') {
        visibility[index] = true;
        continue;
      }

      if (!_checked) {
        visibility[index] = false;
        continue;
      }

      // Check if the immediately preceding block is correct.
      if (index > 0) {
        visibility[index] = _correctState[index - 1] == true;
      } else {
        // No previous block found → show by default.
        visibility[index] = true;
      }
    }

    return visibility;
  }

  static bool _isQuestionType(BlockType type) {
    return type == BlockType.multipleChoice ||
        type == BlockType.trueFalse ||
        type == BlockType.fillBlank ||
        type == BlockType.matching;
  }

  @override
  Widget build(BuildContext context) {
    final blocks = widget.page.blocks;
    final blockVisibility = _computeBlockVisibility(blocks);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              Text(
                widget.page.title,
                style: const TextStyle(
                  fontSize: AppFontSize.lg,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral800,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              if (blocks.isEmpty)
                const Text(
                  'This page is empty.',
                  style: TextStyle(
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral500,
                  ),
                )
              else
                ...blocks.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final block = entry.value;
                  final visible = blockVisibility[idx];

                  if (!visible) {
                    return const SizedBox.shrink();
                  }

                  return AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _InteractiveBlockPreview(
                      key: ValueKey('block_$idx'),
                      block: block,
                      checkTrigger: _checkTrigger,
                      onAnswered: (correct) => _onBlockAnswered(idx, correct),
                    ),
                  );
                }),
            ],
          ),
        ),
        // Check button bar
        if (blocks.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.neutral200)),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _onCheck,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppBorderRadius.md),
                    ),
                    textStyle: const TextStyle(
                      fontSize: AppFontSize.md,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  child: const Text('Check'),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Block dispatcher — routes to interactive widgets for question types
// ---------------------------------------------------------------------------
class _InteractiveBlockPreview extends StatelessWidget {
  final Block block;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveBlockPreview({
    super.key,
    required this.block,
    required this.checkTrigger,
    required this.onAnswered,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = _spacingToValue(block.style.spacing);
    final alignment = _alignmentToAlignment(block.style.alignment);

    return Padding(
      padding: EdgeInsets.only(bottom: spacing),
      child: Align(alignment: alignment, child: _buildContent()),
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
            _buildImageWidget(content.url),
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
        return _InteractiveMultipleChoice(
          content: block.content as MultipleChoiceContent,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.trueFalse:
        return _InteractiveTrueFalse(
          content: block.content as TrueFalseContent,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.fillBlank:
        return _InteractiveFillBlank(
          content: block.content as FillBlankContent,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.matching:
        return _MatchingWidget(
          content: block.content as MatchingContent,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.video:
        return Container(
          height: 180,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.neutral800,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: const Center(
            child: Icon(
              Icons.play_circle_outline,
              size: 48,
              color: AppColors.neutral400,
            ),
          ),
        );
    }
  }

  Widget _buildImageWidget(String source) {
    if (source.startsWith('data:image/')) {
      try {
        final commaIndex = source.indexOf(',');
        if (commaIndex <= 0) return _buildBrokenImage();
        final bytes = base64Decode(source.substring(commaIndex + 1));
        return Image.memory(
          bytes,
          errorBuilder: (context, error, stackTrace) => _buildBrokenImage(),
        );
      } catch (_) {
        return _buildBrokenImage();
      }
    }

    return Image.network(
      source,
      errorBuilder: (context, error, stackTrace) => _buildBrokenImage(),
    );
  }

  Widget _buildBrokenImage() {
    return Container(
      height: 160,
      width: 240,
      decoration: BoxDecoration(
        color: AppColors.neutral100,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: const Center(
        child: Icon(Icons.broken_image, color: AppColors.neutral400),
      ),
    );
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

// ---------------------------------------------------------------------------
// Interactive Multiple Choice
// ---------------------------------------------------------------------------
class _InteractiveMultipleChoice extends StatefulWidget {
  final MultipleChoiceContent content;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveMultipleChoice({
    required this.content,
    required this.checkTrigger,
    required this.onAnswered,
  });

  @override
  State<_InteractiveMultipleChoice> createState() =>
      _InteractiveMultipleChoiceState();
}

class _InteractiveMultipleChoiceState
    extends State<_InteractiveMultipleChoice> {
  final Set<String> _selectedIds = <String>{};
  bool _submitted = false;
  bool _isCorrect = false;

  @override
  void initState() {
    super.initState();
    widget.checkTrigger.addListener(_onCheck);
  }

  @override
  void dispose() {
    widget.checkTrigger.removeListener(_onCheck);
    super.dispose();
  }

  void _onCheck() {
    final expectedAnswers = widget.content.normalizedCorrectAnswers.toSet();
    if (_selectedIds.isEmpty || expectedAnswers.isEmpty) {
      // No selection — mark as incorrect.
      setState(() {
        _submitted = true;
        _isCorrect = false;
      });
      widget.onAnswered(false);
      return;
    }

    final correct =
        _selectedIds.length == expectedAnswers.length &&
        _selectedIds.containsAll(expectedAnswers);
    setState(() {
      _submitted = true;
      _isCorrect = correct;
    });
    widget.onAnswered(correct);
  }

  @override
  Widget build(BuildContext context) {
    final correctAnswerIds = widget.content.normalizedCorrectAnswers.toSet();
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
          Text(
            widget.content.question,
            style: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
          if (widget.content.multiSelect) ...[
            const SizedBox(height: AppSpacing.xs),
            const Text(
              'Select all that apply',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          ...widget.content.options.map((option) {
            final isSelected = _selectedIds.contains(option.id);
            final isCorrectOption = correctAnswerIds.contains(option.id);

            Color bgColor = Colors.white;
            Color borderColor = AppColors.neutral300;
            if (_submitted) {
              if (isCorrectOption) {
                bgColor = AppColors.success.withValues(alpha: 0.1);
                borderColor = AppColors.success;
              } else if (isSelected && !_isCorrect) {
                bgColor = AppColors.error.withValues(alpha: 0.1);
                borderColor = AppColors.error;
              }
            } else if (isSelected) {
              bgColor = AppColors.primary100;
              borderColor = AppColors.primary500;
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: GestureDetector(
                onTap: _submitted
                    ? null
                    : () => setState(() {
                        if (widget.content.multiSelect) {
                          if (isSelected) {
                            _selectedIds.remove(option.id);
                          } else {
                            _selectedIds.add(option.id);
                          }
                        } else {
                          _selectedIds
                            ..clear()
                            ..add(option.id);
                        }
                      }),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          option.text,
                          style: const TextStyle(
                            fontSize: AppFontSize.sm,
                            color: AppColors.neutral700,
                          ),
                        ),
                      ),
                      if (_submitted && isCorrectOption)
                        const Icon(
                          Icons.check_circle,
                          size: 18,
                          color: AppColors.success,
                        ),
                      if (_submitted && isSelected && !isCorrectOption)
                        const Icon(
                          Icons.cancel,
                          size: 18,
                          color: AppColors.error,
                        ),
                    ],
                  ),
                ),
              ),
            );
          }),
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.sm),
            _FeedbackBanner(isCorrect: _isCorrect),
            if (widget.content.explanation != null &&
                widget.content.explanation!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              _ExplanationBox(text: widget.content.explanation!),
            ],
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Interactive True / False
// ---------------------------------------------------------------------------
class _InteractiveTrueFalse extends StatefulWidget {
  final TrueFalseContent content;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveTrueFalse({
    required this.content,
    required this.checkTrigger,
    required this.onAnswered,
  });

  @override
  State<_InteractiveTrueFalse> createState() => _InteractiveTrueFalseState();
}

class _InteractiveTrueFalseState extends State<_InteractiveTrueFalse> {
  bool? _selected;
  bool _submitted = false;
  bool _isCorrect = false;

  @override
  void initState() {
    super.initState();
    widget.checkTrigger.addListener(_onCheck);
  }

  @override
  void dispose() {
    widget.checkTrigger.removeListener(_onCheck);
    super.dispose();
  }

  void _onCheck() {
    if (_selected == null) {
      setState(() {
        _submitted = true;
        _isCorrect = false;
      });
      widget.onAnswered(false);
      return;
    }
    final correct = _selected == widget.content.correctAnswer;
    setState(() {
      _submitted = true;
      _isCorrect = correct;
    });
    widget.onAnswered(correct);
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
          Text(
            widget.content.question,
            style: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _buildOptionButton('True', true),
              const SizedBox(width: AppSpacing.sm),
              _buildOptionButton('False', false),
            ],
          ),
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.sm),
            _FeedbackBanner(isCorrect: _isCorrect),
            if (widget.content.explanation != null &&
                widget.content.explanation!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              _ExplanationBox(text: widget.content.explanation!),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildOptionButton(String label, bool value) {
    final isSelected = _selected == value;
    final isCorrectAnswer = value == widget.content.correctAnswer;

    Color bgColor = Colors.white;
    Color borderColor = AppColors.neutral300;
    if (_submitted) {
      if (isCorrectAnswer) {
        bgColor = AppColors.success.withValues(alpha: 0.1);
        borderColor = AppColors.success;
      } else if (isSelected) {
        bgColor = AppColors.error.withValues(alpha: 0.1);
        borderColor = AppColors.error;
      }
    } else if (isSelected) {
      bgColor = AppColors.primary100;
      borderColor = AppColors.primary500;
    }

    return Expanded(
      child: GestureDetector(
        onTap: _submitted ? null : () => setState(() => _selected = value),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            border: Border.all(color: borderColor, width: isSelected ? 2 : 1),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: AppFontSize.sm,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: AppColors.neutral700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Interactive Fill-in-the-Blank
// ---------------------------------------------------------------------------
class _InteractiveFillBlank extends StatefulWidget {
  final FillBlankContent content;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveFillBlank({
    required this.content,
    required this.checkTrigger,
    required this.onAnswered,
  });

  @override
  State<_InteractiveFillBlank> createState() => _InteractiveFillBlankState();
}

class _InteractiveFillBlankState extends State<_InteractiveFillBlank> {
  final _controller = TextEditingController();
  bool _submitted = false;
  bool _isCorrect = false;

  @override
  void initState() {
    super.initState();
    widget.checkTrigger.addListener(_onCheck);
  }

  @override
  void dispose() {
    widget.checkTrigger.removeListener(_onCheck);
    _controller.dispose();
    super.dispose();
  }

  void _onCheck() {
    final answer = _controller.text.trim();
    final correct =
        answer.isNotEmpty &&
        answer.toLowerCase() == widget.content.correctAnswer.toLowerCase();
    setState(() {
      _submitted = true;
      _isCorrect = correct;
    });
    widget.onAnswered(correct);
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
          Text(
            widget.content.question,
            style: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (widget.content.hint != null &&
              widget.content.hint!.isNotEmpty) ...[
            Text(
              'Hint: ${widget.content.hint}',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
                fontStyle: FontStyle.italic,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
          ],
          TextField(
            controller: _controller,
            enabled: !_submitted,
            decoration: InputDecoration(
              hintText: 'Type your answer...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              suffixIcon: _submitted
                  ? Icon(
                      _isCorrect ? Icons.check_circle : Icons.cancel,
                      color: _isCorrect ? AppColors.success : AppColors.error,
                    )
                  : null,
            ),
          ),
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.sm),
            _FeedbackBanner(isCorrect: _isCorrect),
            if (!_isCorrect) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Correct answer: ${widget.content.correctAnswer}',
                style: const TextStyle(
                  fontSize: AppFontSize.sm,
                  color: AppColors.success,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Matching widget
// ---------------------------------------------------------------------------
class _MatchingWidget extends StatefulWidget {
  final MatchingContent content;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _MatchingWidget({
    required this.content,
    required this.checkTrigger,
    required this.onAnswered,
  });

  @override
  State<_MatchingWidget> createState() => _MatchingWidgetState();
}

class _MatchingWidgetState extends State<_MatchingWidget> {
  static const _pairColors = <Color>[
    Color(0xFF3B82F6), // blue
    Color(0xFF8B5CF6), // purple
    Color(0xFF14B8A6), // teal
    Color(0xFFF97316), // orange
    Color(0xFFEC4899), // pink
    Color(0xFF10B981), // emerald
    Color(0xFFF59E0B), // amber
    Color(0xFF6366F1), // indigo
  ];

  final Map<String, String> _userPairs = {};
  bool _submitted = false;
  String? _selectedLeftId;
  late List<MatchingItem> _shuffledRightItems;

  @override
  void initState() {
    super.initState();
    widget.checkTrigger.addListener(_onCheck);
    _shuffledRightItems = List<MatchingItem>.from(widget.content.rightItems)
      ..shuffle();
  }

  @override
  void dispose() {
    widget.checkTrigger.removeListener(_onCheck);
    super.dispose();
  }

  /// Returns the pair index (0-based) for a left item, or -1 if unpaired.
  int _pairIndexForLeft(String leftId) {
    final keys = _userPairs.keys.toList();
    return keys.indexOf(leftId);
  }

  /// Returns the pair index (0-based) for a right item, or -1 if unpaired.
  int _pairIndexForRight(String rightId) {
    final entry = _userPairs.entries
        .toList()
        .asMap()
        .entries
        .where((e) => e.value.value == rightId)
        .firstOrNull;
    if (entry == null) return -1;
    return _userPairs.keys.toList().indexOf(entry.value.key);
  }

  Color _colorForPairIndex(int index) {
    if (index < 0) return AppColors.neutral300;
    return _pairColors[index % _pairColors.length];
  }

  void _handleLeftItemTap(String leftId) {
    if (_submitted) return;
    setState(() {
      if (_userPairs.containsKey(leftId)) {
        // Tap-to-unpair: clear existing pairing
        _userPairs.remove(leftId);
        _selectedLeftId = null;
      } else {
        _selectedLeftId = leftId;
      }
    });
  }

  void _handleRightItemTap(String rightId) {
    if (_submitted) return;
    // If this right item is already claimed, clear that pair
    final existingLeft = _userPairs.entries
        .where((e) => e.value == rightId)
        .map((e) => e.key)
        .firstOrNull;
    if (existingLeft != null) {
      setState(() {
        _userPairs.remove(existingLeft);
      });
      return;
    }
    if (_selectedLeftId == null) return;
    setState(() {
      _userPairs[_selectedLeftId!] = rightId;
      _selectedLeftId = null;
    });
  }

  void _onCheck() {
    setState(() {
      _submitted = true;
    });
    final allCorrect = _getCorrectCount() == widget.content.leftItems.length;
    widget.onAnswered(allCorrect);
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

  Widget _buildPairBadge(int pairIndex) {
    final color = _colorForPairIndex(pairIndex);
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      child: Center(
        child: Text(
          '${pairIndex + 1}',
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
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
          Text(
            widget.content.question,
            style: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _submitted
                ? 'Results shown below'
                : 'Tap left then right to pair. Tap a paired item to undo.',
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
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
                    final pairIdx = _pairIndexForLeft(item.id);
                    final pairColor = isPaired
                        ? _colorForPairIndex(pairIdx)
                        : null;
                    final isCorrect =
                        _submitted &&
                        _isPairCorrect(item.id, _userPairs[item.id]);
                    final isIncorrect = _submitted && isPaired && !isCorrect;

                    Color bgColor;
                    Color borderColor;
                    if (_submitted) {
                      if (isCorrect) {
                        bgColor = AppColors.success.withValues(alpha: 0.1);
                        borderColor = AppColors.success;
                      } else if (isIncorrect) {
                        bgColor = AppColors.error.withValues(alpha: 0.1);
                        borderColor = AppColors.error;
                      } else {
                        bgColor = Colors.white;
                        borderColor = AppColors.neutral300;
                      }
                    } else if (isSelected) {
                      bgColor = AppColors.primary100;
                      borderColor = AppColors.primary500;
                    } else if (isPaired && pairColor != null) {
                      bgColor = pairColor.withValues(alpha: 0.08);
                      borderColor = pairColor;
                    } else {
                      bgColor = Colors.white;
                      borderColor = AppColors.neutral300;
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: GestureDetector(
                        onTap: () => _handleLeftItemTap(item.id),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: bgColor,
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(
                              color: borderColor,
                              width: isSelected || isPaired ? 2 : 1,
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
                              if (_submitted && isPaired) ...[
                                const SizedBox(width: AppSpacing.xs),
                                Icon(
                                  isCorrect ? Icons.check_circle : Icons.cancel,
                                  size: 16,
                                  color: isCorrect
                                      ? AppColors.success
                                      : AppColors.error,
                                ),
                              ] else if (isPaired && pairIdx >= 0) ...[
                                const SizedBox(width: AppSpacing.xs),
                                _buildPairBadge(pairIdx),
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
              // Right column (shuffled)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: _shuffledRightItems.map((item) {
                    final isPaired = _userPairs.values.contains(item.id);
                    final pairIdx = _pairIndexForRight(item.id);
                    final pairColor = isPaired
                        ? _colorForPairIndex(pairIdx)
                        : null;

                    // Find correctness for this right item after submit
                    final pairedLeftId = _userPairs.entries
                        .where((e) => e.value == item.id)
                        .map((e) => e.key)
                        .firstOrNull;
                    final isCorrect =
                        _submitted &&
                        pairedLeftId != null &&
                        _isPairCorrect(pairedLeftId, item.id);
                    final isIncorrect =
                        _submitted && pairedLeftId != null && !isCorrect;

                    Color bgColor;
                    Color borderColor;
                    if (_submitted) {
                      if (isCorrect) {
                        bgColor = AppColors.success.withValues(alpha: 0.1);
                        borderColor = AppColors.success;
                      } else if (isIncorrect) {
                        bgColor = AppColors.error.withValues(alpha: 0.1);
                        borderColor = AppColors.error;
                      } else {
                        bgColor = Colors.white;
                        borderColor = AppColors.neutral300;
                      }
                    } else if (isPaired && pairColor != null) {
                      bgColor = pairColor.withValues(alpha: 0.08);
                      borderColor = pairColor;
                    } else {
                      bgColor = Colors.white;
                      borderColor = AppColors.neutral300;
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: GestureDetector(
                        onTap: () => _handleRightItemTap(item.id),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: bgColor,
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(
                              color: borderColor,
                              width: isPaired ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              if (!_submitted && isPaired && pairIdx >= 0) ...[
                                _buildPairBadge(pairIdx),
                                const SizedBox(width: AppSpacing.xs),
                              ],
                              if (_submitted && isPaired) ...[
                                Icon(
                                  isCorrect ? Icons.check_circle : Icons.cancel,
                                  size: 16,
                                  color: isCorrect
                                      ? AppColors.success
                                      : AppColors.error,
                                ),
                                const SizedBox(width: AppSpacing.xs),
                              ],
                              Expanded(
                                child: Text(
                                  item.text,
                                  style: TextStyle(
                                    fontSize: AppFontSize.sm,
                                    color: isPaired && !_submitted
                                        ? AppColors.neutral700
                                        : AppColors.neutral700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.md),
            _FeedbackBanner(
              isCorrect: _getCorrectCount() == widget.content.leftItems.length,
              message:
                  'Score: ${_getCorrectCount()}/${widget.content.leftItems.length}',
            ),
            if (widget.content.explanation != null &&
                widget.content.explanation!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              _ExplanationBox(text: widget.content.explanation!),
            ],
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared feedback widgets
// ---------------------------------------------------------------------------
class _FeedbackBanner extends StatelessWidget {
  final bool isCorrect;
  final String? message;

  const _FeedbackBanner({required this.isCorrect, this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: isCorrect
            ? AppColors.success.withValues(alpha: 0.1)
            : AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
      ),
      child: Row(
        children: [
          Icon(
            isCorrect ? Icons.check_circle : Icons.cancel,
            size: 18,
            color: isCorrect ? AppColors.success : AppColors.error,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message ?? (isCorrect ? 'Correct!' : 'Incorrect'),
              style: TextStyle(
                fontSize: AppFontSize.sm,
                fontWeight: FontWeight.w600,
                color: isCorrect ? AppColors.success : AppColors.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExplanationBox extends StatelessWidget {
  final String text;

  const _ExplanationBox({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.primary50,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.lightbulb_outline,
            size: 16,
            color: AppColors.primary500,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
