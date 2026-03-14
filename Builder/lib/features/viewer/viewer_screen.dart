/// Viewer home - course renderer entry
/// Phone-mockup preview with interactive question blocks and visibilityRule support
library;

import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../theme/design_tokens.dart';
import '../../providers/course_provider.dart';
import '../../models/models.dart';
import '../../widgets/block_widgets/animation_block_widget.dart';
import '../../widgets/block_widgets/code_execution_block_widget.dart';
import '../../widgets/block_widgets/code_playground_widget.dart';
import '../../widgets/block_widgets/function_flow_block_widget.dart';
import '../../widgets/block_widgets/html_animation_widget.dart';
import '../../widgets/block_widgets/video_embed_widget.dart';

String _viewerTr(BuilderLocalizations t, String zh, String en) =>
    t.isZh ? zh : en;

class ViewerScreen extends ConsumerStatefulWidget {
  final String? courseId;
  final bool addLesson;
  final String? draftId;
  final int? lessonIndex;
  final bool singlePage;

  const ViewerScreen({
    super.key,
    this.courseId,
    this.addLesson = false,
    this.draftId,
    this.lessonIndex,
    this.singlePage = false,
  });

  @override
  ConsumerState<ViewerScreen> createState() => _ViewerScreenState();
}

class _ViewerScreenState extends ConsumerState<ViewerScreen> {
  String _viewMode = 'desktop';

  @override
  Widget build(BuildContext context) {
    final course = ref.watch(courseProvider);
    final t = BuilderLocalizations(ref.watch(languageProvider));
    final lessons = course.lessons;
    final resolvedLessonIndex =
        (widget.lessonIndex != null &&
            widget.lessonIndex! >= 0 &&
            widget.lessonIndex! < lessons.length)
        ? widget.lessonIndex!
        : 0;
    final previewLessons = (widget.singlePage && lessons.isNotEmpty)
        ? <CourseLesson>[lessons[resolvedLessonIndex]]
        : lessons;

    return DefaultTabController(
      length: previewLessons.isEmpty ? 1 : previewLessons.length,
      child: Scaffold(
        backgroundColor: AppColors.neutral100,
        appBar: AppBar(
          title: Text(
            course.metadata.title.isEmpty
                ? _viewerTr(t, '课程预览', 'Course Preview')
                : course.metadata.title,
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              final id = widget.courseId ?? '';
              final pagePart =
                  (widget.lessonIndex != null && widget.lessonIndex! >= 0)
                  ? '&lessonIndex=${widget.lessonIndex}'
                  : '';
              if (id.isNotEmpty) {
                if (widget.addLesson) {
                  final draftPart =
                      (widget.draftId != null && widget.draftId!.isNotEmpty)
                      ? '&draftId=${Uri.encodeQueryComponent(widget.draftId!)}'
                      : '';
                  context.go(
                    '/builder?courseId=$id&addLesson=1$pagePart$draftPart',
                  );
                } else {
                  context.go('/builder?courseId=$id$pagePart');
                }
              } else {
                context.go('/builder');
              }
            },
          ),
          actions: [
            _ViewportButton(
              icon: Icons.laptop_mac,
              active: _viewMode == 'desktop',
              onTap: () => setState(() => _viewMode = 'desktop'),
            ),
            _ViewportButton(
              icon: Icons.smartphone,
              active: _viewMode == 'mobile',
              onTap: () => setState(() => _viewMode = 'mobile'),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: previewLessons.isEmpty
            ? _buildEmptyState(t)
            : Column(
                children: [
                  // Lesson tabs
                  if (!widget.singlePage && previewLessons.length > 1)
                    Material(
                      color: Colors.white,
                      child: TabBar(
                        isScrollable: true,
                        labelColor: AppColors.primary500,
                        unselectedLabelColor: AppColors.neutral500,
                        indicatorColor: AppColors.primary500,
                        tabs: previewLessons
                            .asMap()
                            .entries
                            .map(
                              (entry) => Tab(
                                text: t.isZh
                                    ? '第 ${entry.key + 1} 课'
                                    : 'Lesson ${entry.key + 1}',
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  Expanded(
                    child: _viewMode == 'desktop'
                        ? _buildDesktopLayout(previewLessons, t)
                        : _buildMobileLayout(previewLessons, t),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildDesktopLayout(
    List<CourseLesson> previewLessons,
    BuilderLocalizations t,
  ) {
    return Container(
      color: const Color.fromRGBO(245, 246, 248, 1),
      child: TabBarView(
        children: previewLessons
            .map(
              (lesson) => Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 24,
                  horizontal: 32,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Flexible(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 760),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: _InteractiveLessonView(lesson: lesson, t: t),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildMobileLayout(
    List<CourseLesson> previewLessons,
    BuilderLocalizations t,
  ) {
    return Center(
      child: Container(
        width: 375,
        height: 812,
        margin: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: AppColors.neutral300, width: 4),
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
                child: Center(
                  child: Text(
                    _viewerTr(t, 'Primoria 预览', 'Primoria Preview'),
                    style: const TextStyle(
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
                  children: previewLessons
                      .map(
                        (lesson) =>
                            _InteractiveLessonView(lesson: lesson, t: t),
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
    );
  }

  Widget _buildEmptyState(BuilderLocalizations t) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.visibility, size: 80, color: AppColors.primary500),
          const SizedBox(height: AppSpacing.lg),
          Text(
            _viewerTr(t, '课程预览', 'Course Preview'),
            style: const TextStyle(
              fontSize: AppFontSize.xxl,
              fontWeight: FontWeight.bold,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _viewerTr(
              t,
              '暂无课程内容，请先在 Builder 中创建。',
              'No course content yet. Create one in Builder first.',
            ),
            style: const TextStyle(
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
// Viewport toggle button
// ---------------------------------------------------------------------------
class _ViewportButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ViewportButton({
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: active
              ? AppColors.primary500.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: active ? AppColors.primary500 : AppColors.neutral400,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Interactive lesson view — manages per-block answer state & visibilityRule
// ---------------------------------------------------------------------------
class _InteractiveLessonView extends StatefulWidget {
  final CourseLesson lesson;
  final BuilderLocalizations t;

  const _InteractiveLessonView({required this.lesson, required this.t});

  @override
  State<_InteractiveLessonView> createState() => _InteractiveLessonViewState();
}

class _InteractiveLessonViewState extends State<_InteractiveLessonView> {
  int _currentPageIndex = 0;

  /// Per-page state: correctState, checkTrigger, checked flag.
  final Map<int, Map<int, bool>> _pageCorrectState = {};
  final Map<int, ValueNotifier<int>> _pageCheckTriggers = {};
  final Map<int, bool> _pageChecked = {};

  @override
  void initState() {
    super.initState();
    _initPageState(0);
  }

  void _initPageState(int pageIndex) {
    if (_pageCheckTriggers.containsKey(pageIndex)) return;
    _pageCheckTriggers[pageIndex] = ValueNotifier<int>(0);
    _pageChecked[pageIndex] = false;
    _pageCorrectState[pageIndex] = {};

    final pages = widget.lesson.pages;
    if (pageIndex >= pages.length) return;
    final blocks = pages[pageIndex].blocks;
    for (int i = 0; i < blocks.length; i++) {
      if (!_isQuestionType(blocks[i].type)) {
        _pageCorrectState[pageIndex]![i] = true;
      }
    }
  }

  @override
  void dispose() {
    for (final trigger in _pageCheckTriggers.values) {
      trigger.dispose();
    }
    super.dispose();
  }

  void _onBlockAnswered(int pageIndex, int blockIndex, bool isCorrect) {
    setState(() {
      _pageCorrectState[pageIndex]![blockIndex] = isCorrect;
    });
  }

  void _onCheck() {
    setState(() {
      _pageChecked[_currentPageIndex] = true;
      _pageCheckTriggers[_currentPageIndex]!.value++;
    });
  }

  void _goToPage(int pageIndex) {
    _initPageState(pageIndex);
    setState(() {
      _currentPageIndex = pageIndex;
    });
  }

  List<bool> _computeBlockVisibility(List<Block> blocks, int pageIndex) {
    final correctState = _pageCorrectState[pageIndex] ?? {};
    final checked = _pageChecked[pageIndex] ?? false;
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

      if (!checked) {
        visibility[index] = false;
        continue;
      }

      if (index > 0) {
        visibility[index] = correctState[index - 1] == true;
      } else {
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

  bool get _hasQuestionBlocks {
    final pages = widget.lesson.pages;
    if (_currentPageIndex >= pages.length) return false;
    return pages[_currentPageIndex].blocks.any(
      (b) => _isQuestionType(b.type),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = widget.lesson.pages;
    final pageCount = pages.length;
    final maxPage = pageCount > 0 ? pageCount - 1 : 0;
    final safePageIndex = _currentPageIndex.clamp(0, maxPage).toInt();
    final blocks = pageCount > 0 ? pages[safePageIndex].blocks : <Block>[];
    final blockVisibility = _computeBlockVisibility(blocks, safePageIndex);
    final checkTrigger =
        _pageCheckTriggers[safePageIndex] ?? ValueNotifier<int>(0);
    final isLastPage = safePageIndex == pageCount - 1;

    return Column(
      children: [
        // Page progress dots
        if (pageCount > 1)
          Padding(
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.sm,
              horizontal: AppSpacing.md,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (int i = 0; i < pageCount; i++) ...[
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: i == safePageIndex ? 20 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == safePageIndex
                          ? AppColors.primary500
                          : AppColors.neutral300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  if (i < pageCount - 1) const SizedBox(width: 4),
                ],
              ],
            ),
          ),
        // Block list
        Expanded(
          child: ListView(
            key: ValueKey('page_$safePageIndex'),
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              if (blocks.isEmpty)
                Text(
                  _viewerTr(widget.t, '此页面暂无内容。', 'This page is empty.'),
                  style: const TextStyle(
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
                      key: ValueKey('page${safePageIndex}_block_$idx'),
                      block: block,
                      t: widget.t,
                      checkTrigger: checkTrigger,
                      onAnswered: (correct) =>
                          _onBlockAnswered(safePageIndex, idx, correct),
                    ),
                  );
                }),
            ],
          ),
        ),
        // Bottom navigation bar
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
              child: Row(
                children: [
                  // Previous page button
                  if (safePageIndex > 0)
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: SizedBox(
                        height: 48,
                        child: OutlinedButton.icon(
                          onPressed: () => _goToPage(safePageIndex - 1),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.neutral700,
                            side: const BorderSide(color: AppColors.neutral300),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                AppBorderRadius.md,
                              ),
                            ),
                          ),
                          icon: const Icon(Icons.chevron_left, size: 20),
                          label: Text(
                            _viewerTr(widget.t, '上一页', 'Prev'),
                            style: const TextStyle(fontSize: AppFontSize.sm),
                          ),
                        ),
                      ),
                    ),
                  // Check button (only for pages with quiz blocks)
                  if (_hasQuestionBlocks)
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: isLastPage ? 0 : AppSpacing.sm,
                        ),
                        child: SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _onCheck,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.secondary500,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                  AppBorderRadius.md,
                                ),
                              ),
                              textStyle: const TextStyle(
                                fontSize: AppFontSize.md,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            child: Text(
                              _viewerTr(widget.t, '检查', 'Check'),
                            ),
                          ),
                        ),
                      ),
                    ),
                  // Next / Complete button
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: isLastPage
                            ? null
                            : () => _goToPage(safePageIndex + 1),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLastPage
                              ? AppColors.neutral200
                              : AppColors.primary500,
                          foregroundColor: isLastPage
                              ? AppColors.neutral500
                              : Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.md,
                            ),
                          ),
                          textStyle: const TextStyle(
                            fontSize: AppFontSize.md,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              isLastPage
                                  ? _viewerTr(widget.t, '已完成', 'Complete')
                                  : _viewerTr(widget.t, '下一页', 'Next'),
                            ),
                            if (!isLastPage) ...[
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right, size: 20),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
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
  final BuilderLocalizations t;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveBlockPreview({
    super.key,
    required this.block,
    required this.t,
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
        if (content.value.isEmpty) return const SizedBox.shrink();
        return _RichTextDisplay(content: content);
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
        return CodePlaygroundWidget(content: content, t: t);
      case BlockType.codeExecution:
        return CodeExecutionBlockWidget(
          content: block.content as CodeExecutionContent,
          t: t,
        );
      case BlockType.functionFlow:
        return FunctionFlowBlockWidget(
          content: block.content as FunctionFlowContent,
          t: t,
        );
      case BlockType.multipleChoice:
        return _InteractiveMultipleChoice(
          content: block.content as MultipleChoiceContent,
          t: t,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.trueFalse:
        return _InteractiveTrueFalse(
          content: block.content as TrueFalseContent,
          t: t,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.fillBlank:
        return _InteractiveFillBlank(
          content: block.content as FillBlankContent,
          t: t,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.matching:
        return _MatchingWidget(
          content: block.content as MatchingContent,
          t: t,
          checkTrigger: checkTrigger,
          onAnswered: onAnswered,
        );
      case BlockType.animation:
        final animContent = block.content as AnimationContent;
        final height = ((block.style.height ?? 300).clamp(
          180.0,
          900.0,
        )).toDouble();
        final width = block.style.width == null
            ? null
            : ((block.style.width!).clamp(260.0, 1400.0)).toDouble();
        final animation =
            animContent.preset == AnimationContent.presetCustom &&
                (animContent.customHtml ?? '').trim().isNotEmpty
            ? HtmlAnimationWidget(
                key: ValueKey('viewer-html-${animContent.customHtml.hashCode}'),
                htmlContent: animContent.customHtml!,
                height: height,
              )
            : AnimationBlockWidget(content: animContent, height: height);
        if (width == null) return animation;
        return SizedBox(width: width, child: animation);
      case BlockType.video:
        final video = block.content as VideoContent;
        final videoUrl = video.url.trim();
        if (videoUrl.isEmpty) {
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
        final height = ((block.style.height ?? 220).clamp(
          180.0,
          520.0,
        )).toDouble();
        return VideoEmbedWidget(
          url: videoUrl,
          title: video.title,
          height: height,
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
  final BuilderLocalizations t;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveMultipleChoice({
    required this.content,
    required this.t,
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
            Text(
              _viewerTr(widget.t, '可多选', 'Select all that apply'),
              style: const TextStyle(
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
            _FeedbackBanner(isCorrect: _isCorrect, t: widget.t),
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
  final BuilderLocalizations t;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveTrueFalse({
    required this.content,
    required this.t,
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
              _buildOptionButton(_viewerTr(widget.t, '正确', 'True'), true),
              const SizedBox(width: AppSpacing.sm),
              _buildOptionButton(_viewerTr(widget.t, '错误', 'False'), false),
            ],
          ),
          if (_submitted) ...[
            const SizedBox(height: AppSpacing.sm),
            _FeedbackBanner(isCorrect: _isCorrect, t: widget.t),
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
  final BuilderLocalizations t;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _InteractiveFillBlank({
    required this.content,
    required this.t,
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
              '${_viewerTr(widget.t, '提示', 'Hint')}: ${widget.content.hint}',
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
              hintText: _viewerTr(widget.t, '输入你的答案...', 'Type your answer...'),
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
            _FeedbackBanner(isCorrect: _isCorrect, t: widget.t),
            if (!_isCorrect) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${_viewerTr(widget.t, '正确答案', 'Correct answer')}: ${widget.content.correctAnswer}',
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
  final BuilderLocalizations t;
  final ValueNotifier<int> checkTrigger;
  final ValueChanged<bool> onAnswered;

  const _MatchingWidget({
    required this.content,
    required this.t,
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
  final List<MatchingEdge> _userGraphEdges = [];
  bool _submitted = false;
  String? _selectedLeftId;
  String? _selectedNodeId;
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

  bool get _isGraphMode => widget.content.mode == MatchingContent.modeGraph;

  List<MatchingNode> get _graphNodes {
    if (widget.content.nodes.isNotEmpty) return widget.content.nodes;

    final nodes = <MatchingNode>[];
    final leftStep = widget.content.leftItems.isEmpty
        ? 50.0
        : 80.0 / (widget.content.leftItems.length + 1);
    for (int i = 0; i < widget.content.leftItems.length; i++) {
      final item = widget.content.leftItems[i];
      nodes.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 18,
          y: 10 + leftStep * (i + 1),
          group: MatchingNode.groupLeft,
        ),
      );
    }
    final rightStep = widget.content.rightItems.isEmpty
        ? 50.0
        : 80.0 / (widget.content.rightItems.length + 1);
    for (int i = 0; i < widget.content.rightItems.length; i++) {
      final item = widget.content.rightItems[i];
      nodes.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 82,
          y: 10 + rightStep * (i + 1),
          group: MatchingNode.groupRight,
        ),
      );
    }
    return nodes;
  }

  List<MatchingEdge> get _expectedGraphEdges {
    if (widget.content.edges.isNotEmpty) return widget.content.edges;
    return widget.content.correctPairs
        .map(
          (pair) => MatchingEdge(
            from: pair.leftId,
            to: pair.rightId,
            directed: widget.content.rules.directed,
          ),
        )
        .toList();
  }

  String _edgeKey(MatchingEdge edge) {
    final directed = edge.directed ?? widget.content.rules.directed;
    final from = edge.from.trim();
    final to = edge.to.trim();
    if (directed) return '$from->$to';
    return from.compareTo(to) <= 0 ? '$from<->$to' : '$to<->$from';
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
    if (_isGraphMode) {
      setState(() {
        _submitted = true;
      });
      widget.onAnswered(_isGraphAnswerCorrect());
      return;
    }
    setState(() => _submitted = true);
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

  bool _isGraphAnswerCorrect() {
    final expected = _expectedGraphEdges.map(_edgeKey).toSet();
    final actual = _userGraphEdges.map(_edgeKey).toSet();
    if (expected.length != actual.length) return false;
    return expected.containsAll(actual);
  }

  int _graphCorrectCount() {
    final expected = _expectedGraphEdges.map(_edgeKey).toSet();
    return _userGraphEdges
        .where((edge) => expected.contains(_edgeKey(edge)))
        .length;
  }

  void _handleGraphNodeTap(String nodeId) {
    if (_submitted) return;
    setState(() {
      if (_selectedNodeId == null) {
        _selectedNodeId = nodeId;
        return;
      }
      if (_selectedNodeId == nodeId) {
        _selectedNodeId = null;
        return;
      }

      var from = _selectedNodeId!;
      var to = nodeId;
      final directed = widget.content.rules.directed;
      if (!directed && from.compareTo(to) > 0) {
        final tmp = from;
        from = to;
        to = tmp;
      }

      final existingIndex = _userGraphEdges.indexWhere(
        (edge) =>
            _edgeKey(edge) ==
            _edgeKey(MatchingEdge(from: from, to: to, directed: directed)),
      );
      if (existingIndex >= 0) {
        _userGraphEdges.removeAt(existingIndex);
        _selectedNodeId = null;
        return;
      }

      if (!widget.content.rules.allowManyToMany) {
        if (!widget.content.rules.allowOneToMany) {
          _userGraphEdges.removeWhere((edge) => edge.from == from);
        }
        _userGraphEdges.removeWhere((edge) => edge.to == to);
      }

      _userGraphEdges.add(MatchingEdge(from: from, to: to, directed: directed));
      _selectedNodeId = null;
    });
  }

  void _resetGraphSelection() {
    if (_submitted) {
      setState(() {
        _submitted = false;
        _selectedNodeId = null;
        _userGraphEdges.clear();
      });
      return;
    }
    setState(() {
      _selectedNodeId = null;
      _userGraphEdges.clear();
    });
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
    if (_isGraphMode) {
      return _buildGraphMode(context);
    }

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
                ? _viewerTr(widget.t, '结果如下', 'Results shown below')
                : _viewerTr(
                    widget.t,
                    '先点左侧再点右侧配对；点击已配对项可取消。',
                    'Tap left then right to pair. Tap a paired item to undo.',
                  ),
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
                  '${_viewerTr(widget.t, '得分', 'Score')}: ${_getCorrectCount()}/${widget.content.leftItems.length}',
              t: widget.t,
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

  Widget _buildGraphMode(BuildContext context) {
    final nodes = _graphNodes;
    final expectedEdges = _expectedGraphEdges;
    final scoreText = '${_graphCorrectCount()}/${expectedEdges.length}';
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
                ? _viewerTr(
                    widget.t,
                    '图谱已提交，点击重置后可重试。',
                    'Graph submitted. Tap Reset to retry.',
                  )
                : _viewerTr(
                    widget.t,
                    '先点节点 A，再点节点 B 创建 A -> B。',
                    'Tap node A, then node B to create A -> B.',
                  ),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            height: 250,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: nodes.isEmpty
                ? Center(
                    child: Text(
                      _viewerTr(
                        widget.t,
                        '未配置图谱节点',
                        'No graph nodes configured',
                      ),
                      style: const TextStyle(
                        fontSize: AppFontSize.sm,
                        color: AppColors.neutral500,
                      ),
                    ),
                  )
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final canvasSize = constraints.biggest;
                      return Stack(
                        children: [
                          Positioned.fill(
                            child: CustomPaint(
                              painter: _MatchingInteractiveGraphPainter(
                                nodes: nodes,
                                userEdges: _userGraphEdges,
                                expectedEdges: expectedEdges,
                                rules: widget.content.rules,
                                submitted: _submitted,
                              ),
                            ),
                          ),
                          ...nodes.map((node) {
                            final center = _matchingViewerNodeCenter(
                              node,
                              canvasSize,
                            );
                            final isSelected = _selectedNodeId == node.id;
                            return Positioned(
                              left:
                                  center.dx -
                                  _MatchingInteractiveGraphPainter.nodeSize / 2,
                              top:
                                  center.dy -
                                  _MatchingInteractiveGraphPainter.nodeSize / 2,
                              child: GestureDetector(
                                key: Key('matching_graph_node_${node.id}'),
                                onTap: () => _handleGraphNodeTap(node.id),
                                child: _buildGraphNode(
                                  node,
                                  isSelected: isSelected,
                                ),
                              ),
                            );
                          }),
                        ],
                      );
                    },
                  ),
          ),
          const SizedBox(height: AppSpacing.sm),
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth >= 340) {
                return Row(
                  children: [
                    Expanded(
                      child: Text(
                        _selectedNodeId == null
                            ? _viewerTr(widget.t, '已选：无', 'Selected: none')
                            : '${_viewerTr(widget.t, '已选', 'Selected')}: $_selectedNodeId',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: AppFontSize.xs,
                          color: AppColors.neutral500,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      key: const Key('matching_graph_reset'),
                      onPressed: _resetGraphSelection,
                      icon: const Icon(Icons.restart_alt, size: 16),
                      label: Text(_viewerTr(widget.t, '重置', 'Reset')),
                    ),
                  ],
                );
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _selectedNodeId == null
                        ? _viewerTr(widget.t, '已选：无', 'Selected: none')
                        : '${_viewerTr(widget.t, '已选', 'Selected')}: $_selectedNodeId',
                    style: const TextStyle(
                      fontSize: AppFontSize.xs,
                      color: AppColors.neutral500,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      key: const Key('matching_graph_reset'),
                      onPressed: _resetGraphSelection,
                      icon: const Icon(Icons.restart_alt, size: 16),
                      label: Text(_viewerTr(widget.t, '重置', 'Reset')),
                    ),
                  ),
                ],
              );
            },
          ),
          if (_submitted) ...[
            _FeedbackBanner(
              isCorrect: _isGraphAnswerCorrect(),
              message: '${_viewerTr(widget.t, '得分', 'Score')}: $scoreText',
              t: widget.t,
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

  Widget _buildGraphNode(MatchingNode node, {required bool isSelected}) {
    Color color;
    switch (node.group) {
      case MatchingNode.groupLeft:
        color = AppColors.primary500;
        break;
      case MatchingNode.groupRight:
        color = AppColors.success;
        break;
      case MatchingNode.groupNeutral:
      default:
        color = AppColors.neutral700;
        break;
    }
    return AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      width: _MatchingInteractiveGraphPainter.nodeSize,
      height: _MatchingInteractiveGraphPainter.nodeSize,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? Colors.black : Colors.white,
          width: isSelected ? 2.2 : 1.6,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: isSelected ? 10 : 6,
            spreadRadius: isSelected ? 1 : 0,
          ),
        ],
      ),
      child: Center(
        child: Text(
          _shortNodeLabel(node.label),
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  String _shortNodeLabel(String label) {
    final trimmed = label.trim();
    if (trimmed.isEmpty) return '?';
    final words = trimmed.split(RegExp(r'\\s+'));
    if (words.length == 1) {
      final single = words.first;
      return single.length <= 4 ? single : single.substring(0, 4);
    }
    return words.take(2).map((word) => word[0]).join().toUpperCase();
  }
}

Offset _matchingViewerNodeCenter(MatchingNode node, Size size) {
  final safeWidth = math.max(
    0.0,
    size.width - _MatchingInteractiveGraphPainter.nodeSize,
  );
  final safeHeight = math.max(
    0.0,
    size.height - _MatchingInteractiveGraphPainter.nodeSize,
  );
  final x =
      _MatchingInteractiveGraphPainter.nodeSize / 2 +
      safeWidth * (node.x / 100);
  final y =
      _MatchingInteractiveGraphPainter.nodeSize / 2 +
      safeHeight * (node.y / 100);
  return Offset(x, y);
}

class _MatchingInteractiveGraphPainter extends CustomPainter {
  static const double nodeSize = 38;

  final List<MatchingNode> nodes;
  final List<MatchingEdge> userEdges;
  final List<MatchingEdge> expectedEdges;
  final MatchingRules rules;
  final bool submitted;

  const _MatchingInteractiveGraphPainter({
    required this.nodes,
    required this.userEdges,
    required this.expectedEdges,
    required this.rules,
    required this.submitted,
  });

  String _edgeKey(MatchingEdge edge) {
    final directed = edge.directed ?? rules.directed;
    if (directed) return '${edge.from}->${edge.to}';
    return edge.from.compareTo(edge.to) <= 0
        ? '${edge.from}<->${edge.to}'
        : '${edge.to}<->${edge.from}';
  }

  @override
  void paint(Canvas canvas, Size size) {
    final nodeMap = <String, MatchingNode>{for (final n in nodes) n.id: n};
    final expectedKeys = expectedEdges.map(_edgeKey).toSet();
    final userKeys = userEdges.map(_edgeKey).toSet();

    if (submitted) {
      for (final edge in expectedEdges) {
        final from = nodeMap[edge.from];
        final to = nodeMap[edge.to];
        if (from == null || to == null) continue;
        final key = _edgeKey(edge);
        if (userKeys.contains(key)) continue;
        _drawEdge(
          canvas,
          from: _matchingViewerNodeCenter(from, size),
          to: _matchingViewerNodeCenter(to, size),
          color: AppColors.warning.withValues(alpha: 0.45),
          directed: edge.directed ?? rules.directed,
          width: 2,
        );
      }
    }

    for (final edge in userEdges) {
      final from = nodeMap[edge.from];
      final to = nodeMap[edge.to];
      if (from == null || to == null) continue;
      final key = _edgeKey(edge);
      final isCorrect = !submitted || expectedKeys.contains(key);
      _drawEdge(
        canvas,
        from: _matchingViewerNodeCenter(from, size),
        to: _matchingViewerNodeCenter(to, size),
        color: isCorrect ? AppColors.success : AppColors.error,
        directed: edge.directed ?? rules.directed,
        width: 2.4,
      );
    }
  }

  void _drawEdge(
    Canvas canvas, {
    required Offset from,
    required Offset to,
    required Color color,
    required bool directed,
    required double width,
  }) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..color = color;
    canvas.drawLine(from, to, paint);

    if (!directed) return;

    final angle = math.atan2(to.dy - from.dy, to.dx - from.dx);
    const arrowLength = 10.0;
    const spread = 0.45;
    final p1 = Offset(
      to.dx - arrowLength * math.cos(angle - spread),
      to.dy - arrowLength * math.sin(angle - spread),
    );
    final p2 = Offset(
      to.dx - arrowLength * math.cos(angle + spread),
      to.dy - arrowLength * math.sin(angle + spread),
    );
    final arrowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..color = color;
    canvas.drawLine(to, p1, arrowPaint);
    canvas.drawLine(to, p2, arrowPaint);
  }

  @override
  bool shouldRepaint(covariant _MatchingInteractiveGraphPainter oldDelegate) {
    return oldDelegate.nodes != nodes ||
        oldDelegate.userEdges != userEdges ||
        oldDelegate.expectedEdges != expectedEdges ||
        oldDelegate.rules != rules ||
        oldDelegate.submitted != submitted;
  }
}

// ---------------------------------------------------------------------------
// Shared feedback widgets
// ---------------------------------------------------------------------------
class _FeedbackBanner extends StatelessWidget {
  final bool isCorrect;
  final BuilderLocalizations t;
  final String? message;

  const _FeedbackBanner({
    required this.isCorrect,
    required this.t,
    this.message,
  });

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
              message ??
                  (isCorrect
                      ? _viewerTr(t, '正确！', 'Correct!')
                      : _viewerTr(t, '不正确', 'Incorrect')),
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

// ---------------------------------------------------------------------------
// Rich text read-only display — renders Quill Delta JSON (or legacy plain text)
// ---------------------------------------------------------------------------
class _RichTextDisplay extends StatefulWidget {
  final TextContent content;
  const _RichTextDisplay({required this.content});

  @override
  State<_RichTextDisplay> createState() => _RichTextDisplayState();
}

class _RichTextDisplayState extends State<_RichTextDisplay> {
  quill.QuillController? _controller;
  String _plainFallback = '';

  @override
  void initState() {
    super.initState();
    _init(widget.content);
  }

  void _init(TextContent content) {
    _controller?.dispose();
    _controller = null;
    _plainFallback = '';

    if (content.format == 'richtext' && content.value.isNotEmpty) {
      try {
        final doc = quill.Document.fromJson(
          jsonDecode(content.value) as List,
        );
        final ctrl = quill.QuillController(
          document: doc,
          selection: const TextSelection.collapsed(offset: 0),
        );
        ctrl.readOnly = true;
        _controller = ctrl;
        return;
      } catch (_) {
        // Fall through to plain text
      }
    }
    // Legacy or non-JSON content → plain text
    _plainFallback = content.value;
  }

  @override
  void didUpdateWidget(covariant _RichTextDisplay old) {
    super.didUpdateWidget(old);
    if (widget.content.value != old.content.value) {
      _init(widget.content);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = _controller;
    if (ctrl != null) {
      return quill.QuillEditor.basic(
        controller: ctrl,
        config: const quill.QuillEditorConfig(
          scrollable: false,
          autoFocus: false,
          expands: false,
          padding: EdgeInsets.zero,
        ),
      );
    }
    return Text(
      _plainFallback,
      style: const TextStyle(
        fontSize: AppFontSize.md,
        color: AppColors.neutral700,
      ),
    );
  }
}
