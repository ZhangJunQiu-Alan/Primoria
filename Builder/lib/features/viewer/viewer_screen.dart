/// Viewer home - course renderer entry
/// Phone-mockup preview with interactive question blocks and visibilityRule support
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

  /// Whether a block with `afterPreviousCorrect` should be visible.
  bool _isBlockVisible(int index) {
    final block = widget.page.blocks[index];
    if (block.visibilityRule != 'afterPreviousCorrect') return true;
    if (!_checked) return false;

    // Check if the immediately preceding block is correct.
    if (index > 0) {
      return _correctState[index - 1] == true;
    }
    // No previous block found → show by default.
    return true;
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
                  final visible = _isBlockVisible(idx);

                  if (!visible) {
                    return _LockedPlaceholder(key: ValueKey('locked_$idx'));
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
// Locked placeholder for hidden blocks
// ---------------------------------------------------------------------------
class _LockedPlaceholder extends StatelessWidget {
  const _LockedPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.neutral100,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.lock_outline, size: 18, color: AppColors.neutral400),
          SizedBox(width: AppSpacing.sm),
          Text(
            'Answer the previous question correctly to unlock',
            style: TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral400,
            ),
          ),
        ],
      ),
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
  String? _selectedId;
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
    if (_selectedId == null) {
      // No selection — mark as incorrect.
      setState(() {
        _submitted = true;
        _isCorrect = false;
      });
      widget.onAnswered(false);
      return;
    }
    final correct = _selectedId == widget.content.correctAnswer;
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
          ...widget.content.options.map((option) {
            final isSelected = _selectedId == option.id;
            final isCorrectOption = option.id == widget.content.correctAnswer;

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
                    : () => setState(() => _selectedId = option.id),
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
  final Map<String, String> _userPairs = {};
  bool _submitted = false;
  String? _selectedLeftId;

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
          const Text(
            'Tap items on the left, then tap matching items on the right',
            style: TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: widget.content.leftItems.map((item) {
                    final isSelected = _selectedLeftId == item.id;
                    final isPaired = _userPairs.containsKey(item.id);
                    final isCorrect =
                        _submitted &&
                        _isPairCorrect(item.id, _userPairs[item.id]);
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
                                      ? AppColors.success.withValues(alpha: 0.1)
                                      : (isIncorrect
                                            ? AppColors.error.withValues(
                                                alpha: 0.1,
                                              )
                                            : Colors.white)),
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary500
                                  : (isCorrect
                                        ? AppColors.success
                                        : (isIncorrect
                                              ? AppColors.error
                                              : AppColors.neutral300)),
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
                                      ? (isCorrect
                                            ? Icons.check_circle
                                            : Icons.cancel)
                                      : Icons.link,
                                  size: 16,
                                  color: _submitted
                                      ? (isCorrect
                                            ? AppColors.success
                                            : AppColors.error)
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
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(color: AppColors.neutral300),
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
