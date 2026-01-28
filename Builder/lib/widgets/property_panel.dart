import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';

/// 右侧属性面板 - 显示选中模块的属性
class PropertyPanel extends ConsumerWidget {
  const PropertyPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);
    final course = ref.watch(courseProvider);
    final selectedBlockId = builderState.selectedBlockId;

    // 查找选中的 block
    Block? selectedBlock;
    if (selectedBlockId != null) {
      final page = course.getPage(builderState.currentPageIndex);
      if (page != null) {
        for (final block in page.blocks) {
          if (block.id == selectedBlockId) {
            selectedBlock = block;
            break;
          }
        }
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 面板标题
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: const Text(
            '属性',
            style: TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
        ),
        const Divider(height: 1),
        // 属性内容
        Expanded(
          child: selectedBlock == null
              ? _buildEmptyState()
              : _BlockPropertyEditor(
                  key: ValueKey(selectedBlock.id),
                  block: selectedBlock,
                  pageIndex: builderState.currentPageIndex,
                ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.touch_app,
              size: 48,
              color: AppColors.neutral300,
            ),
            SizedBox(height: AppSpacing.md),
            Text(
              '点击画布中的模块\n查看和编辑属性',
              textAlign: TextAlign.center,
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
}

/// Block 属性编辑器
class _BlockPropertyEditor extends ConsumerStatefulWidget {
  final Block block;
  final int pageIndex;

  const _BlockPropertyEditor({
    super.key,
    required this.block,
    required this.pageIndex,
  });

  @override
  ConsumerState<_BlockPropertyEditor> createState() => _BlockPropertyEditorState();
}

class _BlockPropertyEditorState extends ConsumerState<_BlockPropertyEditor> {
  void _updateBlock(Block updatedBlock) {
    ref.read(courseProvider.notifier).updateBlock(widget.pageIndex, updatedBlock);
    ref.read(builderStateProvider.notifier).markAsUnsaved();
  }

  @override
  Widget build(BuildContext context) {
    final info = BlockRegistry.getInfo(widget.block.type);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        // 模块信息
        _PropertySection(
          title: '模块信息',
          children: [
            Row(
              children: [
                Icon(info?.icon ?? Icons.widgets, size: 16, color: AppColors.primary500),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  info?.name ?? widget.block.type.label,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    fontWeight: FontWeight.w500,
                    color: AppColors.neutral700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'ID: ${widget.block.id.substring(0, 20)}...',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral400,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // 样式设置
        _PropertySection(
          title: '样式设置',
          children: [
            _PropertyField(
              label: '对齐',
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'left', icon: Icon(Icons.format_align_left, size: 16)),
                  ButtonSegment(value: 'center', icon: Icon(Icons.format_align_center, size: 16)),
                  ButtonSegment(value: 'right', icon: Icon(Icons.format_align_right, size: 16)),
                ],
                selected: {widget.block.style.alignment},
                onSelectionChanged: (value) {
                  final updatedBlock = widget.block.copyWith(
                    style: widget.block.style.copyWith(alignment: value.first),
                  );
                  _updateBlock(updatedBlock);
                },
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _PropertyField(
              label: '间距',
              child: DropdownButtonFormField<String>(
                initialValue: widget.block.style.spacing,
                decoration: const InputDecoration(
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                ),
                items: const [
                  DropdownMenuItem(value: 'xs', child: Text('极小')),
                  DropdownMenuItem(value: 'sm', child: Text('小')),
                  DropdownMenuItem(value: 'md', child: Text('中')),
                  DropdownMenuItem(value: 'lg', child: Text('大')),
                  DropdownMenuItem(value: 'xl', child: Text('极大')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    final updatedBlock = widget.block.copyWith(
                      style: widget.block.style.copyWith(spacing: value),
                    );
                    _updateBlock(updatedBlock);
                  }
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // 内容编辑（根据类型）
        _buildContentEditor(),
      ],
    );
  }

  Widget _buildContentEditor() {
    switch (widget.block.type) {
      case BlockType.text:
        return _buildTextEditor();
      case BlockType.image:
        return _buildImageEditor();
      case BlockType.codeBlock:
        return _buildCodeBlockEditor();
      case BlockType.codePlayground:
        return _buildCodePlaygroundEditor();
      case BlockType.multipleChoice:
        return _buildMultipleChoiceEditor();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTextEditor() {
    final content = widget.block.content as TextContent;
    return _PropertySection(
      title: '文本内容',
      children: [
        TextFormField(
          initialValue: content.value,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: '输入文本内容...',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(value: value),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildImageEditor() {
    final content = widget.block.content as ImageContent;
    return _PropertySection(
      title: '图片设置',
      children: [
        TextFormField(
          initialValue: content.url,
          decoration: const InputDecoration(
            labelText: '图片 URL',
            hintText: 'https://...',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: ImageContent(url: value, alt: content.alt, caption: content.caption),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.caption ?? '',
          decoration: const InputDecoration(
            labelText: '图片说明',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: ImageContent(url: content.url, alt: content.alt, caption: value),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildCodeBlockEditor() {
    final content = widget.block.content as CodeBlockContent;
    return _PropertySection(
      title: '代码设置',
      children: [
        DropdownButtonFormField<String>(
          initialValue: content.language,
          decoration: const InputDecoration(
            labelText: '语言',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'python', child: Text('Python')),
            DropdownMenuItem(value: 'javascript', child: Text('JavaScript')),
            DropdownMenuItem(value: 'dart', child: Text('Dart')),
            DropdownMenuItem(value: 'java', child: Text('Java')),
            DropdownMenuItem(value: 'cpp', child: Text('C++')),
          ],
          onChanged: (value) {
            if (value != null) {
              final updatedBlock = widget.block.copyWith(
                content: CodeBlockContent(language: value, code: content.code),
              );
              _updateBlock(updatedBlock);
            }
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.code,
          maxLines: 8,
          style: const TextStyle(fontFamily: 'monospace', fontSize: AppFontSize.sm),
          decoration: const InputDecoration(
            labelText: '代码',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: CodeBlockContent(language: content.language, code: value),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildCodePlaygroundEditor() {
    final content = widget.block.content as CodePlaygroundContent;
    return _PropertySection(
      title: '代码运行设置',
      children: [
        TextFormField(
          initialValue: content.initialCode,
          maxLines: 8,
          style: const TextStyle(fontFamily: 'monospace', fontSize: AppFontSize.sm),
          decoration: const InputDecoration(
            labelText: '初始代码',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: CodePlaygroundContent(
                language: content.language,
                initialCode: value,
                expectedOutput: content.expectedOutput,
                hints: content.hints,
                runnable: content.runnable,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.expectedOutput ?? '',
          decoration: const InputDecoration(
            labelText: '预期输出',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: CodePlaygroundContent(
                language: content.language,
                initialCode: content.initialCode,
                expectedOutput: value.isEmpty ? null : value,
                hints: content.hints,
                runnable: content.runnable,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildMultipleChoiceEditor() {
    final content = widget.block.content as MultipleChoiceContent;
    return _PropertySection(
      title: '选择题设置',
      children: [
        TextFormField(
          initialValue: content.question,
          decoration: const InputDecoration(
            labelText: '问题',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: MultipleChoiceContent(
                question: value,
                options: content.options,
                correctAnswer: content.correctAnswer,
                explanation: content.explanation,
                multiSelect: content.multiSelect,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.md),
        const Text(
          '选项（选中正确答案）',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ...content.options.asMap().entries.map((entry) {
          final index = entry.key;
          final option = entry.value;
          final isCorrect = option.id == content.correctAnswer;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(
                    isCorrect ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: isCorrect ? AppColors.success : AppColors.neutral400,
                  ),
                  onPressed: () {
                    final updatedBlock = widget.block.copyWith(
                      content: MultipleChoiceContent(
                        question: content.question,
                        options: content.options,
                        correctAnswer: option.id,
                        explanation: content.explanation,
                        multiSelect: content.multiSelect,
                      ),
                    );
                    _updateBlock(updatedBlock);
                  },
                ),
                Expanded(
                  child: TextFormField(
                    initialValue: option.text,
                    decoration: InputDecoration(
                      labelText: '选项 ${String.fromCharCode(65 + index)}',
                      isDense: true,
                    ),
                    onChanged: (value) {
                      final updatedOptions = [...content.options];
                      updatedOptions[index] = ChoiceOption(id: option.id, text: value);
                      final updatedBlock = widget.block.copyWith(
                        content: MultipleChoiceContent(
                          question: content.question,
                          options: updatedOptions,
                          correctAnswer: content.correctAnswer,
                          explanation: content.explanation,
                          multiSelect: content.multiSelect,
                        ),
                      );
                      _updateBlock(updatedBlock);
                    },
                  ),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.explanation ?? '',
          decoration: const InputDecoration(
            labelText: '答案解释',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: MultipleChoiceContent(
                question: content.question,
                options: content.options,
                correctAnswer: content.correctAnswer,
                explanation: value.isEmpty ? null : value,
                multiSelect: content.multiSelect,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }
}

/// 属性分组
class _PropertySection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _PropertySection({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ...children,
      ],
    );
  }
}

/// 单个属性字段
class _PropertyField extends StatelessWidget {
  final String label;
  final Widget child;

  const _PropertyField({
    required this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 50,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral600,
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}
