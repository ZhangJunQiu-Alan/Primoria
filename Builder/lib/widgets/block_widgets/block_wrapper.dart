import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../theme/design_tokens.dart';
import '../../models/models.dart';
import '../../services/block_registry.dart';
import 'animation_block_widget.dart';
import 'code_execution_block_widget.dart';
import 'code_playground_widget.dart';
import 'function_flow_block_widget.dart';
import 'html_animation_widget.dart';

/// Block wrapper - handles selection, delete, and other common behavior
class BlockWrapper extends StatelessWidget {
  final Block block;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final Widget? dragHandle;
  final ValueChanged<Block>? onBlockUpdated;

  const BlockWrapper({
    super.key,
    required this.block,
    required this.isSelected,
    required this.onTap,
    required this.onDelete,
    this.dragHandle,
    this.onBlockUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final info = BlockRegistry.getInfo(block.type);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            border: Border.all(
              color: isSelected ? AppColors.primary500 : AppColors.neutral200,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected ? AppShadows.md : AppShadows.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Block header (type label + actions)
              _buildHeader(context, info),
              // Block content
              _buildContent(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, BlockTypeInfo? info) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primary50 : AppColors.neutral50,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppBorderRadius.md - 1),
          topRight: Radius.circular(AppBorderRadius.md - 1),
        ),
      ),
      child: Row(
        children: [
          Icon(
            info?.icon ?? Icons.widgets,
            size: 14,
            color: isSelected ? AppColors.primary600 : AppColors.neutral500,
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            info?.name ?? block.type.label,
            style: TextStyle(
              fontSize: AppFontSize.xs,
              fontWeight: FontWeight.w500,
              color: isSelected ? AppColors.primary600 : AppColors.neutral500,
            ),
          ),
          if (block.visibilityRule == 'afterPreviousCorrect') ...[
            const SizedBox(width: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xs,
                vertical: 1,
              ),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock, size: 10, color: AppColors.warning),
                  SizedBox(width: 2),
                  Text(
                    'Gated',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const Spacer(),
          // Drag handle
          dragHandle ??
              const Icon(
                Icons.drag_indicator,
                size: 16,
                color: AppColors.neutral400,
              ),
          const SizedBox(width: AppSpacing.xs),
          // Delete button
          InkWell(
            onTap: onDelete,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            child: const Padding(
              padding: EdgeInsets.all(2),
              child: Icon(Icons.close, size: 14, color: AppColors.neutral400),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final spacing = _spacingToValue(block.style.spacing);
    final alignment = _alignmentToAlignment(block.style.alignment);
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: spacing),
        child: Align(alignment: alignment, child: _getBlockContentWidget()),
      ),
    );
  }

  Widget _getBlockContentWidget() {
    switch (block.type) {
      case BlockType.text:
        final content = block.content as TextContent;
        return _TextBlockContent(
          content: content,
          textAlign: _alignmentToTextAlign(block.style.alignment),
          editable: isSelected && onBlockUpdated != null,
          onChanged: onBlockUpdated == null
              ? null
              : (updatedContent) =>
                    onBlockUpdated!(block.copyWith(content: updatedContent)),
        );
      case BlockType.image:
        return _ImageBlockContent(content: block.content as ImageContent);
      case BlockType.codeBlock:
        final content = block.content as CodeBlockContent;
        return _CodeBlockContent(
          content: content,
          editable: isSelected && onBlockUpdated != null,
          onChanged: onBlockUpdated == null
              ? null
              : (updatedContent) =>
                    onBlockUpdated!(block.copyWith(content: updatedContent)),
        );
      case BlockType.codePlayground:
        final content = block.content as CodePlaygroundContent;
        final isInlineEditable = isSelected && onBlockUpdated != null;
        return _CodePlaygroundBlockContent(
          content: content,
          editable: isInlineEditable,
          onCodeChanged: (newCode) {
            if (onBlockUpdated != null) {
              final updatedContent = CodePlaygroundContent(
                language: content.language,
                initialCode: newCode,
                expectedOutput: content.expectedOutput,
                hints: content.hints,
                runnable: content.runnable,
              );
              onBlockUpdated!(block.copyWith(content: updatedContent));
            }
          },
          onExpectedOutputChanged: !isInlineEditable
              ? null
              : (expectedOutput) {
                  final updatedContent = CodePlaygroundContent(
                    language: content.language,
                    initialCode: content.initialCode,
                    expectedOutput: expectedOutput,
                    hints: content.hints,
                    runnable: content.runnable,
                  );
                  onBlockUpdated!(block.copyWith(content: updatedContent));
                },
        );
      case BlockType.codeExecution:
        return CodeExecutionBlockWidget(
          content: block.content as CodeExecutionContent,
        );
      case BlockType.functionFlow:
        return FunctionFlowBlockWidget(
          content: block.content as FunctionFlowContent,
        );
      case BlockType.multipleChoice:
        return _MultipleChoiceContent(
          content: block.content as MultipleChoiceContent,
        );
      case BlockType.fillBlank:
        return _FillBlankContent(content: block.content as FillBlankContent);
      case BlockType.trueFalse:
        return _TrueFalseBlockContent(
          content: block.content as TrueFalseContent,
        );
      case BlockType.matching:
        return _MatchingBlockContent(content: block.content as MatchingContent);
      case BlockType.animation:
        final animContent = block.content as AnimationContent;
        final animationHeight = ((block.style.height ?? 300).clamp(
          180.0,
          900.0,
        )).toDouble();
        final animationWidth = block.style.width == null
            ? null
            : ((block.style.width!).clamp(260.0, 1400.0)).toDouble();
        final canResize = onBlockUpdated != null;
        void onResize(double? newWidth, double newHeight) {
          if (onBlockUpdated == null) return;
          final updatedBlock = block.copyWith(
            style: block.style.copyWith(
              width: newWidth,
              height: newHeight,
              clearWidth: newWidth == null,
            ),
          );
          onBlockUpdated!(updatedBlock);
        }
        if (animContent.preset == AnimationContent.presetCustom &&
            animContent.customHtml != null) {
          return _ResizableAnimationContainer(
            initialWidth: animationWidth,
            initialHeight: animationHeight,
            showHandles: canResize && isSelected,
            onSizeChanged: onResize,
            childBuilder: (height) => HtmlAnimationWidget(
              key: ValueKey('anim-html-${animContent.customHtml.hashCode}'),
              htmlContent: animContent.customHtml!,
              height: height,
            ),
          );
        }
        return _ResizableAnimationContainer(
          initialWidth: animationWidth,
          initialHeight: animationHeight,
          showHandles: canResize && isSelected,
          onSizeChanged: onResize,
          childBuilder: (height) =>
              AnimationBlockWidget(content: animContent, height: height),
        );
      case BlockType.video:
        return _VideoBlockContent(content: block.content as VideoContent);
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

class _ResizableAnimationContainer extends StatefulWidget {
  final double? initialWidth;
  final double initialHeight;
  final bool showHandles;
  final void Function(double? width, double height)? onSizeChanged;
  final Widget Function(double height) childBuilder;

  const _ResizableAnimationContainer({
    this.initialWidth,
    required this.initialHeight,
    required this.showHandles,
    required this.childBuilder,
    this.onSizeChanged,
  });

  @override
  State<_ResizableAnimationContainer> createState() =>
      _ResizableAnimationContainerState();
}

class _ResizableAnimationContainerState
    extends State<_ResizableAnimationContainer> {
  static const double _minWidth = 260;
  static const double _maxWidth = 1400;
  static const double _minHeight = 180;
  static const double _maxHeight = 900;
  double? _width;
  late double _height;
  double _lastMaxWidth = _maxWidth;

  @override
  void initState() {
    super.initState();
    _width = widget.initialWidth;
    _height = widget.initialHeight.clamp(_minHeight, _maxHeight);
  }

  @override
  void didUpdateWidget(covariant _ResizableAnimationContainer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialWidth != widget.initialWidth) {
      _width = widget.initialWidth;
    }
    if ((oldWidget.initialHeight - widget.initialHeight).abs() > 0.5) {
      _height = widget.initialHeight.clamp(_minHeight, _maxHeight);
    }
  }

  void _updateSize(_ResizeHandle handle, DragUpdateDetails details) {
    var nextWidth = _width ?? _lastMaxWidth;
    var nextHeight = _height;

    if (handle.affectsLeft) nextWidth -= details.delta.dx;
    if (handle.affectsRight) nextWidth += details.delta.dx;
    if (handle.affectsTop) nextHeight -= details.delta.dy;
    if (handle.affectsBottom) nextHeight += details.delta.dy;

    nextWidth = nextWidth.clamp(_minWidth, _lastMaxWidth);
    nextHeight = nextHeight.clamp(_minHeight, _maxHeight);
    if ((nextWidth - (_width ?? _lastMaxWidth)).abs() < 0.2 &&
        (nextHeight - _height).abs() < 0.2) {
      return;
    }

    setState(() {
      _width = nextWidth;
      _height = nextHeight;
    });
  }

  void _commitSize() {
    double? committedWidth = _width;
    if (committedWidth != null &&
        (_lastMaxWidth - committedWidth).abs() < 1.5) {
      committedWidth = null;
      _width = null;
    }
    widget.onSizeChanged?.call(committedWidth, _height);
  }

  Widget _buildHandle({
    required _ResizeHandle handle,
    required Alignment alignment,
    required MouseCursor cursor,
    required bool corner,
  }) {
    final size = corner ? 10.0 : 8.0;
    return Align(
      alignment: alignment,
      child: MouseRegion(
        cursor: cursor,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onPanUpdate: (details) => _updateSize(handle, details),
          onPanEnd: (_) => _commitSize(),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: AppColors.primary500,
              border: Border.all(color: Colors.white, width: 1.2),
              borderRadius: BorderRadius.circular(corner ? 2 : 999),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth.clamp(_minWidth, _maxWidth).toDouble()
            : _maxWidth;
        _lastMaxWidth = maxWidth;

        final resolvedWidth = ((_width ?? maxWidth).clamp(
          _minWidth,
          maxWidth,
        )).toDouble();
        final content = SizedBox(
          width: resolvedWidth,
          child: widget.childBuilder(_height),
        );
        if (!widget.showHandles) return content;

        return SizedBox(
          width: resolvedWidth,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              content,
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: AppColors.primary500.withValues(alpha: 0.45),
                        width: 1.2,
                      ),
                      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    ),
                  ),
                ),
              ),
              _buildHandle(
                handle: _ResizeHandle.topLeft,
                alignment: Alignment.topLeft,
                cursor: SystemMouseCursors.resizeUpLeftDownRight,
                corner: true,
              ),
              _buildHandle(
                handle: _ResizeHandle.top,
                alignment: Alignment.topCenter,
                cursor: SystemMouseCursors.resizeUpDown,
                corner: false,
              ),
              _buildHandle(
                handle: _ResizeHandle.topRight,
                alignment: Alignment.topRight,
                cursor: SystemMouseCursors.resizeUpRightDownLeft,
                corner: true,
              ),
              _buildHandle(
                handle: _ResizeHandle.right,
                alignment: Alignment.centerRight,
                cursor: SystemMouseCursors.resizeLeftRight,
                corner: false,
              ),
              _buildHandle(
                handle: _ResizeHandle.bottomRight,
                alignment: Alignment.bottomRight,
                cursor: SystemMouseCursors.resizeUpLeftDownRight,
                corner: true,
              ),
              _buildHandle(
                handle: _ResizeHandle.bottom,
                alignment: Alignment.bottomCenter,
                cursor: SystemMouseCursors.resizeUpDown,
                corner: false,
              ),
              _buildHandle(
                handle: _ResizeHandle.bottomLeft,
                alignment: Alignment.bottomLeft,
                cursor: SystemMouseCursors.resizeUpRightDownLeft,
                corner: true,
              ),
              _buildHandle(
                handle: _ResizeHandle.left,
                alignment: Alignment.centerLeft,
                cursor: SystemMouseCursors.resizeLeftRight,
                corner: false,
              ),
            ],
          ),
        );
      },
    );
  }
}

enum _ResizeHandle {
  topLeft,
  top,
  topRight,
  right,
  bottomRight,
  bottom,
  bottomLeft,
  left;

  bool get affectsLeft =>
      this == _ResizeHandle.left ||
      this == _ResizeHandle.topLeft ||
      this == _ResizeHandle.bottomLeft;

  bool get affectsRight =>
      this == _ResizeHandle.right ||
      this == _ResizeHandle.topRight ||
      this == _ResizeHandle.bottomRight;

  bool get affectsTop =>
      this == _ResizeHandle.top ||
      this == _ResizeHandle.topLeft ||
      this == _ResizeHandle.topRight;

  bool get affectsBottom =>
      this == _ResizeHandle.bottom ||
      this == _ResizeHandle.bottomLeft ||
      this == _ResizeHandle.bottomRight;
}

/// Text block content
class _TextBlockContent extends StatefulWidget {
  final TextContent content;
  final TextAlign textAlign;
  final bool editable;
  final ValueChanged<TextContent>? onChanged;

  const _TextBlockContent({
    required this.content,
    required this.textAlign,
    this.editable = false,
    this.onChanged,
  });

  @override
  State<_TextBlockContent> createState() => _TextBlockContentState();
}

class _TextBlockContentState extends State<_TextBlockContent> {
  late final TextEditingController _valueController;

  @override
  void initState() {
    super.initState();
    _valueController = TextEditingController(text: widget.content.value);
  }

  @override
  void didUpdateWidget(covariant _TextBlockContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.content.value != _valueController.text) {
      _valueController.text = widget.content.value;
    }
  }

  @override
  void dispose() {
    _valueController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.content;
    final textAlign = widget.textAlign;
    if (widget.editable && widget.onChanged != null) {
      final selectedFormat = content.format == 'plain' ? 'plain' : 'markdown';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'markdown', label: Text('Markdown')),
              ButtonSegment(value: 'plain', label: Text('Plain')),
            ],
            selected: {selectedFormat},
            onSelectionChanged: (value) {
              widget.onChanged!(content.copyWith(format: value.first));
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _valueController,
            minLines: 4,
            maxLines: 10,
            textAlign: textAlign,
            style: TextStyle(
              fontFamily: selectedFormat == 'markdown' ? 'monospace' : null,
              fontSize: AppFontSize.md,
              color: AppColors.neutral700,
            ),
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              ),
              isDense: true,
              hintText: selectedFormat == 'markdown'
                  ? '# Heading\n\n**Bold** and *italic*\n\n- List item'
                  : 'Enter text...',
            ),
            onChanged: (value) {
              widget.onChanged!(content.copyWith(value: value));
            },
          ),
        ],
      );
    }

    if (content.value.isEmpty) {
      return Text(
        'Click to edit text...',
        textAlign: textAlign,
        style: const TextStyle(
          fontSize: AppFontSize.md,
          color: AppColors.neutral400,
          fontStyle: FontStyle.italic,
        ),
      );
    }

    if (content.format == 'markdown') {
      final markdownAlignment = _textAlignToWrapAlignment(widget.textAlign);
      return MarkdownBody(
        data: content.value,
        selectable: true,
        styleSheet: MarkdownStyleSheet(
          textAlign: markdownAlignment,
          h1Align: markdownAlignment,
          h2Align: markdownAlignment,
          h3Align: markdownAlignment,
          h4Align: markdownAlignment,
          h5Align: markdownAlignment,
          h6Align: markdownAlignment,
          unorderedListAlign: markdownAlignment,
          orderedListAlign: markdownAlignment,
          blockquoteAlign: markdownAlignment,
          codeblockAlign: markdownAlignment,
          p: const TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
          h1: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.neutral800,
          ),
          h2: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.neutral800,
          ),
          h3: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
          code: TextStyle(
            fontSize: AppFontSize.sm,
            fontFamily: 'monospace',
            backgroundColor: AppColors.neutral100,
            color: AppColors.neutral700,
          ),
          codeblockDecoration: BoxDecoration(
            color: AppColors.neutral800,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          codeblockPadding: const EdgeInsets.all(AppSpacing.md),
          listBullet: const TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
          a: const TextStyle(
            color: AppColors.primary500,
            decoration: TextDecoration.underline,
          ),
        ),
      );
    }

    return Text(
      content.value,
      textAlign: textAlign,
      style: const TextStyle(
        fontSize: AppFontSize.md,
        color: AppColors.neutral700,
      ),
    );
  }

  WrapAlignment _textAlignToWrapAlignment(TextAlign align) {
    switch (align) {
      case TextAlign.center:
        return WrapAlignment.center;
      case TextAlign.right:
      case TextAlign.end:
        return WrapAlignment.end;
      case TextAlign.left:
      case TextAlign.start:
      case TextAlign.justify:
        return WrapAlignment.start;
    }
  }
}

/// Image block content
class _ImageBlockContent extends StatelessWidget {
  final ImageContent content;

  const _ImageBlockContent({required this.content});

  @override
  Widget build(BuildContext context) {
    if (content.url.isEmpty) {
      return Container(
        height: 120,
        decoration: BoxDecoration(
          color: AppColors.neutral100,
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          border: Border.all(
            color: AppColors.neutral200,
            style: BorderStyle.solid,
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.add_photo_alternate,
                size: 32,
                color: AppColors.neutral400,
              ),
              SizedBox(height: AppSpacing.xs),
              Text(
                'Click to add an image',
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  color: AppColors.neutral400,
                ),
              ),
            ],
          ),
        ),
      );
    }
    return _buildImageWidget(content.url);
  }

  Widget _buildImageWidget(String source) {
    if (source.startsWith('data:image/')) {
      try {
        final commaIndex = source.indexOf(',');
        if (commaIndex <= 0) return _buildBrokenImage();
        final bytes = base64Decode(source.substring(commaIndex + 1));
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _buildBrokenImage(),
        );
      } catch (_) {
        return _buildBrokenImage();
      }
    }

    return Image.network(
      source,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => _buildBrokenImage(),
    );
  }

  Widget _buildBrokenImage() {
    return Container(
      height: 120,
      color: AppColors.neutral100,
      child: const Center(
        child: Icon(Icons.broken_image, color: AppColors.neutral400),
      ),
    );
  }
}

/// Code block content
class _CodeBlockContent extends StatefulWidget {
  final CodeBlockContent content;
  final bool editable;
  final ValueChanged<CodeBlockContent>? onChanged;

  const _CodeBlockContent({
    required this.content,
    this.editable = false,
    this.onChanged,
  });

  @override
  State<_CodeBlockContent> createState() => _CodeBlockContentState();
}

class _CodeBlockContentState extends State<_CodeBlockContent> {
  static const List<MapEntry<String, String>> _languageOptions = [
    MapEntry('python', 'Python'),
    MapEntry('javascript', 'JavaScript'),
    MapEntry('dart', 'Dart'),
    MapEntry('java', 'Java'),
    MapEntry('cpp', 'C++'),
    MapEntry('html', 'HTML'),
  ];

  late final TextEditingController _codeController;
  late String _selectedLanguage;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.content.code);
    _selectedLanguage = _safeLanguage(widget.content.language);
  }

  @override
  void didUpdateWidget(covariant _CodeBlockContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.content.code != _codeController.text) {
      _codeController.text = widget.content.code;
    }
    final nextLanguage = _safeLanguage(widget.content.language);
    if (nextLanguage != _selectedLanguage) {
      _selectedLanguage = nextLanguage;
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  String _safeLanguage(String value) {
    if (_languageOptions.any((option) => option.key == value)) return value;
    return 'python';
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.content;
    final editable = widget.editable && widget.onChanged != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.neutral800,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: AppColors.neutral700,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
                child: editable
                    ? DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedLanguage,
                          isDense: true,
                          dropdownColor: AppColors.neutral700,
                          iconEnabledColor: AppColors.neutral300,
                          style: const TextStyle(
                            fontSize: AppFontSize.xs,
                            color: AppColors.neutral300,
                            fontWeight: FontWeight.w500,
                          ),
                          items: _languageOptions
                              .map(
                                (option) => DropdownMenuItem<String>(
                                  value: option.key,
                                  child: Text(option.value),
                                ),
                              )
                              .toList(growable: false),
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _selectedLanguage = value);
                            widget.onChanged!(
                              CodeBlockContent(
                                language: value,
                                code: _codeController.text,
                              ),
                            );
                          },
                        ),
                      )
                    : Text(
                        content.language,
                        style: const TextStyle(
                          fontSize: AppFontSize.xs,
                          color: AppColors.neutral300,
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (editable)
            TextField(
              controller: _codeController,
              minLines: 8,
              maxLines: 14,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: AppFontSize.sm,
                color: AppColors.neutral100,
              ),
              decoration: InputDecoration(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  borderSide: BorderSide.none,
                ),
                isDense: true,
                filled: true,
                fillColor: AppColors.neutral700,
                hintText: '# Enter code here',
                hintStyle: const TextStyle(
                  color: AppColors.neutral500,
                  fontFamily: 'monospace',
                ),
              ),
              onChanged: (value) {
                widget.onChanged!(
                  CodeBlockContent(language: _selectedLanguage, code: value),
                );
              },
            )
          else
            Text(
              content.code,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: AppFontSize.sm,
                color: AppColors.neutral100,
              ),
            ),
        ],
      ),
    );
  }
}

class _CodePlaygroundBlockContent extends StatelessWidget {
  final CodePlaygroundContent content;
  final bool editable;
  final ValueChanged<String>? onCodeChanged;
  final ValueChanged<String?>? onExpectedOutputChanged;

  const _CodePlaygroundBlockContent({
    required this.content,
    required this.editable,
    this.onCodeChanged,
    this.onExpectedOutputChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CodePlaygroundWidget(content: content, onCodeChanged: onCodeChanged),
        if (editable && onExpectedOutputChanged != null) ...[
          const SizedBox(height: AppSpacing.sm),
          _CodePlaygroundExpectedOutputField(
            expectedOutput: content.expectedOutput,
            onChanged: onExpectedOutputChanged!,
          ),
        ],
      ],
    );
  }
}

class _CodePlaygroundExpectedOutputField extends StatefulWidget {
  final String? expectedOutput;
  final ValueChanged<String?> onChanged;

  const _CodePlaygroundExpectedOutputField({
    required this.expectedOutput,
    required this.onChanged,
  });

  @override
  State<_CodePlaygroundExpectedOutputField> createState() =>
      _CodePlaygroundExpectedOutputFieldState();
}

class _CodePlaygroundExpectedOutputFieldState
    extends State<_CodePlaygroundExpectedOutputField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.expectedOutput ?? '');
  }

  @override
  void didUpdateWidget(covariant _CodePlaygroundExpectedOutputField oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextValue = widget.expectedOutput ?? '';
    if (_controller.text != nextValue) {
      _controller.text = nextValue;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      minLines: 1,
      maxLines: 3,
      style: const TextStyle(
        fontFamily: 'monospace',
        fontSize: AppFontSize.sm,
        color: AppColors.neutral700,
      ),
      decoration: InputDecoration(
        labelText: 'Expected output',
        isDense: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        ),
      ),
      onChanged: (value) {
        widget.onChanged(value.trim().isEmpty ? null : value);
      },
    );
  }
}

/// Multiple choice content
class _MultipleChoiceContent extends StatelessWidget {
  final MultipleChoiceContent content;

  const _MultipleChoiceContent({required this.content});

  @override
  Widget build(BuildContext context) {
    final correctAnswerIds = content.normalizedCorrectAnswers.toSet();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty ? 'Enter a question' : content.question,
          style: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: content.question.isEmpty
                ? AppColors.neutral400
                : AppColors.neutral800,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        ...content.options.map(
          (option) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: content.multiSelect
                        ? BoxShape.rectangle
                        : BoxShape.circle,
                    border: Border.all(color: AppColors.neutral300),
                    borderRadius: content.multiSelect
                        ? BorderRadius.circular(4)
                        : null,
                  ),
                  child: correctAnswerIds.contains(option.id)
                      ? Icon(
                          content.multiSelect
                              ? Icons.check
                              : Icons.radio_button_checked,
                          size: 12,
                          color: AppColors.success,
                        )
                      : null,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  option.text,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral700,
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

/// Fill-in-the-blank content
class _FillBlankContent extends StatelessWidget {
  final FillBlankContent content;

  const _FillBlankContent({required this.content});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty
              ? 'Enter a fill-in-the-blank question'
              : content.question,
          style: TextStyle(
            fontSize: AppFontSize.md,
            color: content.question.isEmpty
                ? AppColors.neutral400
                : AppColors.neutral700,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.neutral300),
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: const Text(
            'Answer input',
            style: TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral400,
            ),
          ),
        ),
      ],
    );
  }
}

/// Matching question content
class _MatchingBlockContent extends StatelessWidget {
  final MatchingContent content;

  const _MatchingBlockContent({required this.content});

  /// Returns the 1-based pair number for a given item id (left or right side).
  int? _pairNumberFor(String itemId, {required bool isLeft}) {
    for (int i = 0; i < content.correctPairs.length; i++) {
      final pair = content.correctPairs[i];
      if (isLeft && pair.leftId == itemId) return i + 1;
      if (!isLeft && pair.rightId == itemId) return i + 1;
    }
    return null;
  }

  List<MatchingNode> _effectiveNodes() {
    if (content.nodes.isNotEmpty) return content.nodes;
    final nodes = <MatchingNode>[];
    final leftStep = content.leftItems.isEmpty
        ? 50.0
        : 80.0 / (content.leftItems.length + 1);
    for (int i = 0; i < content.leftItems.length; i++) {
      final item = content.leftItems[i];
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
    final rightStep = content.rightItems.isEmpty
        ? 50.0
        : 80.0 / (content.rightItems.length + 1);
    for (int i = 0; i < content.rightItems.length; i++) {
      final item = content.rightItems[i];
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

  List<MatchingEdge> _effectiveEdges() {
    if (content.edges.isNotEmpty) return content.edges;
    return content.correctPairs
        .map(
          (pair) => MatchingEdge(
            from: pair.leftId,
            to: pair.rightId,
            directed: content.rules.directed,
          ),
        )
        .toList();
  }

  Widget _buildPairBadge(int number) {
    return Container(
      width: 18,
      height: 18,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.primary500,
      ),
      child: Center(
        child: Text(
          '$number',
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
    if (content.mode == MatchingContent.modeGraph) {
      return _buildGraphMode();
    }
    return _buildListMode();
  }

  Widget _buildGraphMode() {
    final nodes = _effectiveNodes();
    final edges = _effectiveEdges();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty
              ? 'Enter a graph matching question'
              : content.question,
          style: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: content.question.isEmpty
                ? AppColors.neutral400
                : AppColors.neutral800,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          content.rules.directed
              ? 'Directed graph mode (A -> B)'
              : 'Undirected graph mode',
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          height: 220,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: nodes.isEmpty
              ? const Center(
                  child: Text(
                    'No graph nodes configured',
                    style: TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.neutral500,
                    ),
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final size = constraints.biggest;
                    return Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _MatchingGraphPreviewPainter(
                              nodes: nodes,
                              edges: edges,
                              rules: content.rules,
                            ),
                          ),
                        ),
                        ...nodes.map((node) {
                          final center = _matchingNodeCenter(node, size);
                          return Positioned(
                            left:
                                center.dx -
                                _MatchingGraphPreviewPainter.nodeSize / 2,
                            top:
                                center.dy -
                                _MatchingGraphPreviewPainter.nodeSize / 2,
                            child: _buildGraphNodeChip(node),
                          );
                        }),
                      ],
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildGraphNodeChip(MatchingNode node) {
    Color bgColor;
    switch (node.group) {
      case MatchingNode.groupLeft:
        bgColor = AppColors.primary500;
        break;
      case MatchingNode.groupRight:
        bgColor = AppColors.success;
        break;
      case MatchingNode.groupNeutral:
      default:
        bgColor = AppColors.neutral700;
        break;
    }
    return Container(
      width: _MatchingGraphPreviewPainter.nodeSize,
      height: _MatchingGraphPreviewPainter.nodeSize,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 1.5),
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
      return words.first.length <= 4
          ? words.first
          : words.first.substring(0, 4);
    }
    return words.take(2).map((w) => w[0]).join().toUpperCase();
  }

  Widget _buildListMode() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty
              ? 'Enter a matching question'
              : content.question,
          style: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: content.question.isEmpty
                ? AppColors.neutral400
                : AppColors.neutral800,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left items
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: content.leftItems.isEmpty
                    ? [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.neutral100,
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(color: AppColors.neutral300),
                          ),
                          child: const Text(
                            'No left items',
                            style: TextStyle(
                              fontSize: AppFontSize.sm,
                              color: AppColors.neutral400,
                            ),
                          ),
                        ),
                      ]
                    : content.leftItems.map((item) {
                        final pairNum = _pairNumberFor(item.id, isLeft: true);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(
                                AppBorderRadius.sm,
                              ),
                              border: Border.all(color: AppColors.neutral300),
                            ),
                            child: Row(
                              children: [
                                if (pairNum != null) ...[
                                  _buildPairBadge(pairNum),
                                  const SizedBox(width: AppSpacing.xs),
                                ],
                                Expanded(
                                  child: Text(
                                    item.text,
                                    style: const TextStyle(
                                      fontSize: AppFontSize.sm,
                                      color: AppColors.neutral700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // Arrow indicator
            const Padding(
              padding: EdgeInsets.only(top: AppSpacing.sm),
              child: Icon(
                Icons.compare_arrows,
                size: 20,
                color: AppColors.neutral400,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // Right items
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: content.rightItems.isEmpty
                    ? [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.neutral100,
                            borderRadius: BorderRadius.circular(
                              AppBorderRadius.sm,
                            ),
                            border: Border.all(color: AppColors.neutral300),
                          ),
                          child: const Text(
                            'No right items',
                            style: TextStyle(
                              fontSize: AppFontSize.sm,
                              color: AppColors.neutral400,
                            ),
                          ),
                        ),
                      ]
                    : content.rightItems.map((item) {
                        final pairNum = _pairNumberFor(item.id, isLeft: false);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(
                                AppBorderRadius.sm,
                              ),
                              border: Border.all(color: AppColors.neutral300),
                            ),
                            child: Row(
                              children: [
                                if (pairNum != null) ...[
                                  _buildPairBadge(pairNum),
                                  const SizedBox(width: AppSpacing.xs),
                                ],
                                Expanded(
                                  child: Text(
                                    item.text,
                                    style: const TextStyle(
                                      fontSize: AppFontSize.sm,
                                      color: AppColors.neutral700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

Offset _matchingNodeCenter(MatchingNode node, Size size) {
  final safeWidth = math.max(
    0.0,
    size.width - _MatchingGraphPreviewPainter.nodeSize,
  );
  final safeHeight = math.max(
    0.0,
    size.height - _MatchingGraphPreviewPainter.nodeSize,
  );
  final x =
      _MatchingGraphPreviewPainter.nodeSize / 2 + safeWidth * (node.x / 100);
  final y =
      _MatchingGraphPreviewPainter.nodeSize / 2 + safeHeight * (node.y / 100);
  return Offset(x, y);
}

class _MatchingGraphPreviewPainter extends CustomPainter {
  static const double nodeSize = 36;

  final List<MatchingNode> nodes;
  final List<MatchingEdge> edges;
  final MatchingRules rules;

  const _MatchingGraphPreviewPainter({
    required this.nodes,
    required this.edges,
    required this.rules,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final nodeMap = <String, MatchingNode>{for (final n in nodes) n.id: n};
    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppColors.neutral400;

    for (final edge in edges) {
      final fromNode = nodeMap[edge.from];
      final toNode = nodeMap[edge.to];
      if (fromNode == null || toNode == null) continue;

      final start = _matchingNodeCenter(fromNode, size);
      final end = _matchingNodeCenter(toNode, size);
      canvas.drawLine(start, end, linePaint);

      final directed = edge.directed ?? rules.directed;
      if (directed) {
        _drawArrow(canvas, start, end);
      }

      final label = edge.label?.trim();
      if (label != null && label.isNotEmpty) {
        _drawLabel(canvas, label, start, end);
      }
    }
  }

  void _drawArrow(Canvas canvas, Offset start, Offset end) {
    final angle = math.atan2(end.dy - start.dy, end.dx - start.dx);
    const arrowLength = 10.0;
    const spread = 0.45;
    final p1 = Offset(
      end.dx - arrowLength * math.cos(angle - spread),
      end.dy - arrowLength * math.sin(angle - spread),
    );
    final p2 = Offset(
      end.dx - arrowLength * math.cos(angle + spread),
      end.dy - arrowLength * math.sin(angle + spread),
    );
    final arrowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppColors.neutral500;
    canvas.drawLine(end, p1, arrowPaint);
    canvas.drawLine(end, p2, arrowPaint);
  }

  void _drawLabel(Canvas canvas, String label, Offset start, Offset end) {
    final midpoint = Offset((start.dx + end.dx) / 2, (start.dy + end.dy) / 2);
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          fontSize: AppFontSize.xs,
          color: AppColors.neutral600,
          fontWeight: FontWeight.w500,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(
        midpoint.dx - textPainter.width / 2,
        midpoint.dy - textPainter.height - 4,
      ),
    );
  }

  @override
  bool shouldRepaint(covariant _MatchingGraphPreviewPainter oldDelegate) {
    return oldDelegate.nodes != nodes ||
        oldDelegate.edges != edges ||
        oldDelegate.rules != rules;
  }
}

/// True/False content
class _TrueFalseBlockContent extends StatelessWidget {
  final TrueFalseContent content;

  const _TrueFalseBlockContent({required this.content});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty
              ? 'Enter a true or false statement'
              : content.question,
          style: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: content.question.isEmpty
                ? AppColors.neutral400
                : AppColors.neutral800,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            _buildAnswerChip('True', content.correctAnswer == true),
            const SizedBox(width: AppSpacing.sm),
            _buildAnswerChip('False', content.correctAnswer == false),
          ],
        ),
      ],
    );
  }

  Widget _buildAnswerChip(String label, bool isCorrect) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: isCorrect
            ? AppColors.success.withValues(alpha: 0.1)
            : AppColors.neutral100,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(
          color: isCorrect ? AppColors.success : AppColors.neutral300,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isCorrect)
            const Padding(
              padding: EdgeInsets.only(right: AppSpacing.xs),
              child: Icon(Icons.check, size: 16, color: AppColors.success),
            ),
          Text(
            label,
            style: TextStyle(
              fontSize: AppFontSize.sm,
              fontWeight: isCorrect ? FontWeight.w600 : FontWeight.normal,
              color: isCorrect ? AppColors.success : AppColors.neutral600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Video content
class _VideoBlockContent extends StatelessWidget {
  final VideoContent content;

  const _VideoBlockContent({required this.content});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: AppColors.neutral800,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.play_circle_outline,
              size: 48,
              color: AppColors.neutral400,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              content.url.isEmpty
                  ? 'Click to add a video'
                  : content.title ?? 'Video',
              style: const TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
