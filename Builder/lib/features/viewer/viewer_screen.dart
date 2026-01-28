/// Viewer 首页 - 课程渲染器入口
/// 占位页面，用于预览构建的课程

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
          title: Text(course.metadata.title.isEmpty ? '课程预览' : course.metadata.title),
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
                      .map((entry) => Tab(text: '第 ${entry.key + 1} 页'))
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
            '课程预览',
            style: TextStyle(
              fontSize: AppFontSize.xxl,
              fontWeight: FontWeight.bold,
              color: AppColors.neutral800,
            ),
          ),
          SizedBox(height: AppSpacing.sm),
          Text(
            '暂无课程内容，请先在 Builder 中创建',
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
            '该页面暂无内容',
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
