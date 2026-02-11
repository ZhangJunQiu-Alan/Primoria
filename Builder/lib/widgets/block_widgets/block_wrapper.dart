import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../theme/design_tokens.dart';
import '../../models/models.dart';
import '../../services/block_registry.dart';
import 'code_playground_widget.dart';

/// Block wrapper - handles selection, delete, and other common behavior
class BlockWrapper extends StatelessWidget {
  final Block block;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final ValueChanged<Block>? onBlockUpdated;

  const BlockWrapper({
    super.key,
    required this.block,
    required this.isSelected,
    required this.onTap,
    required this.onDelete,
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
          const Spacer(),
          // Drag handle
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
              child: Icon(
                Icons.close,
                size: 14,
                color: AppColors.neutral400,
              ),
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
        child: Align(
          alignment: alignment,
          child: _getBlockContentWidget(),
        ),
      ),
    );
  }

  Widget _getBlockContentWidget() {
    switch (block.type) {
      case BlockType.text:
        return _TextBlockContent(
          content: block.content as TextContent,
          textAlign: _alignmentToTextAlign(block.style.alignment),
        );
      case BlockType.image:
        return _ImageBlockContent(content: block.content as ImageContent);
      case BlockType.codeBlock:
        return _CodeBlockContent(content: block.content as CodeBlockContent);
      case BlockType.codePlayground:
        return CodePlaygroundWidget(
          content: block.content as CodePlaygroundContent,
          onCodeChanged: (newCode) {
            if (onBlockUpdated != null) {
              final updatedContent = CodePlaygroundContent(
                language: (block.content as CodePlaygroundContent).language,
                initialCode: newCode,
                expectedOutput: (block.content as CodePlaygroundContent).expectedOutput,
                hints: (block.content as CodePlaygroundContent).hints,
                runnable: (block.content as CodePlaygroundContent).runnable,
              );
              onBlockUpdated!(block.copyWith(content: updatedContent));
            }
          },
        );
      case BlockType.multipleChoice:
        return _MultipleChoiceContent(
            content: block.content as MultipleChoiceContent);
      case BlockType.fillBlank:
        return _FillBlankContent(content: block.content as FillBlankContent);
      case BlockType.trueFalse:
        return _TrueFalseBlockContent(content: block.content as TrueFalseContent);
      case BlockType.matching:
        return _MatchingBlockContent(content: block.content as MatchingContent);
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

/// Text block content
class _TextBlockContent extends StatelessWidget {
  final TextContent content;
  final TextAlign textAlign;

  const _TextBlockContent({
    required this.content,
    required this.textAlign,
  });

  @override
  Widget build(BuildContext context) {
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
      return MarkdownBody(
        data: content.value,
        selectable: true,
        styleSheet: MarkdownStyleSheet(
          p: const TextStyle(fontSize: AppFontSize.md, color: AppColors.neutral700),
          h1: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.neutral800),
          h2: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.neutral800),
          h3: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.neutral800),
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
          codeblockTextStyle: const TextStyle(
            fontSize: AppFontSize.sm,
            fontFamily: 'monospace',
            color: AppColors.neutral100,
          ),
          listBullet: const TextStyle(fontSize: AppFontSize.md, color: AppColors.neutral700),
          a: const TextStyle(color: AppColors.primary500, decoration: TextDecoration.underline),
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
          border: Border.all(color: AppColors.neutral200, style: BorderStyle.solid),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_photo_alternate, size: 32, color: AppColors.neutral400),
              SizedBox(height: AppSpacing.xs),
              Text(
                'Click to add an image',
                style: TextStyle(fontSize: AppFontSize.sm, color: AppColors.neutral400),
              ),
            ],
          ),
        ),
      );
    }
    return Image.network(
      content.url,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => Container(
        height: 120,
        color: AppColors.neutral100,
        child: const Center(
          child: Icon(Icons.broken_image, color: AppColors.neutral400),
        ),
      ),
    );
  }
}

/// Code block content
class _CodeBlockContent extends StatelessWidget {
  final CodeBlockContent content;

  const _CodeBlockContent({required this.content});

  @override
  Widget build(BuildContext context) {
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
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.neutral700,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
                child: Text(
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

/// Multiple choice content
class _MultipleChoiceContent extends StatelessWidget {
  final MultipleChoiceContent content;

  const _MultipleChoiceContent({required this.content});

  @override
  Widget build(BuildContext context) {
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
        ...content.options.map((option) => Padding(
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
                    child: option.id == content.correctAnswer
                        ? Icon(
                            content.multiSelect ? Icons.check : Icons.circle,
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
            )),
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
          content.question.isEmpty ? 'Enter a fill-in-the-blank question' : content.question,
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

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          content.question.isEmpty ? 'Enter a matching question' : content.question,
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
                            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
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
                    : content.leftItems
                        .map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                            child: Container(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
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
                        )
                        .toList(),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // Arrow indicator
            const Padding(
              padding: EdgeInsets.only(top: AppSpacing.sm),
              child: Icon(Icons.compare_arrows, size: 20, color: AppColors.neutral400),
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
                            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
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
                    : content.rightItems
                        .map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                            child: Container(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
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
                        )
                        .toList(),
              ),
            ),
          ],
        ),
      ],
    );
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
          content.question.isEmpty ? 'Enter a true or false statement' : content.question,
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
        color: isCorrect ? AppColors.success.withValues(alpha: 0.1) : AppColors.neutral100,
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
            const Icon(Icons.play_circle_outline,
                size: 48, color: AppColors.neutral400),
            const SizedBox(height: AppSpacing.sm),
            Text(
              content.url.isEmpty ? 'Click to add a video' : content.title ?? 'Video',
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
