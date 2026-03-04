import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/file_picker.dart' as file_picker;
import 'code_execution_content_editor.dart';
import 'function_flow_content_editor.dart';
import 'matching_content_editor.dart';

/// Right properties panel - shows properties of the selected module
class PropertyPanel extends ConsumerWidget {
  const PropertyPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);
    final course = ref.watch(courseProvider);
    final selectedBlockId = builderState.selectedBlockId;

    // Find selected block
    Block? selectedBlock;
    if (selectedBlockId != null) {
      final lesson = course.getLesson(builderState.currentLessonIndex);
      if (lesson != null) {
        for (final block in lesson.blocks) {
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
        // Panel title
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: const Text(
            'Properties',
            style: TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral800,
            ),
          ),
        ),
        const Divider(height: 1),
        // Properties content
        Expanded(
          child: selectedBlock == null
              ? _buildEmptyState()
              : _BlockPropertyEditor(
                  key: ValueKey(selectedBlock.id),
                  block: selectedBlock,
                  lessonIndex: builderState.currentLessonIndex,
                ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildMetadataRow('Block', 'None selected'),
          const SizedBox(height: AppSpacing.sm),
          _buildMetadataRow('Type', '--'),
          const SizedBox(height: AppSpacing.sm),
          _buildMetadataRow('Status', '--'),
          const SizedBox(height: AppSpacing.sm),
          _buildMetadataRow('Last update', '--'),
        ],
      ),
    );
  }

  Widget _buildMetadataRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral600,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral400,
            ),
          ),
        ),
      ],
    );
  }
}

/// Block property editor
class _BlockPropertyEditor extends ConsumerStatefulWidget {
  final Block block;
  final int lessonIndex;

  const _BlockPropertyEditor({
    super.key,
    required this.block,
    required this.lessonIndex,
  });

  @override
  ConsumerState<_BlockPropertyEditor> createState() =>
      _BlockPropertyEditorState();
}

class _BlockPropertyEditorState extends ConsumerState<_BlockPropertyEditor> {
  void _updateBlock(Block updatedBlock) {
    ref
        .read(courseProvider.notifier)
        .updateBlock(widget.lessonIndex, updatedBlock);
    ref.read(builderStateProvider.notifier).markAsUnsaved();
  }

  Future<void> _pickLocalImage(ImageContent content) async {
    final result = await file_picker.pickImageFile();
    if (!mounted) return;

    if (!result.success || (result.content ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final updatedBlock = widget.block.copyWith(
      content: ImageContent(
        url: result.content!,
        alt: content.alt,
        caption: content.caption,
      ),
    );
    _updateBlock(updatedBlock);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.fileName == null
              ? 'Local image imported'
              : 'Imported: ${result.fileName}',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final info = BlockRegistry.getInfo(widget.block.type);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        // Module info
        _PropertySection(
          title: 'Block',
          children: [
            Row(
              children: [
                Icon(
                  info?.icon ?? Icons.widgets,
                  size: 16,
                  color: AppColors.primary500,
                ),
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
            Builder(
              builder: (context) {
                final blockId = widget.block.id;
                final displayId = blockId.length > 20
                    ? '${blockId.substring(0, 20)}...'
                    : blockId;
                return Text(
                  'ID: $displayId',
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral400,
                    fontFamily: 'monospace',
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Style settings
        _PropertySection(
          title: 'Style',
          children: [
            _PropertyField(
              label: 'Align',
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'left',
                    icon: Icon(Icons.format_align_left, size: 16),
                  ),
                  ButtonSegment(
                    value: 'center',
                    icon: Icon(Icons.format_align_center, size: 16),
                  ),
                  ButtonSegment(
                    value: 'right',
                    icon: Icon(Icons.format_align_right, size: 16),
                  ),
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
              label: 'Spacing',
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
                  DropdownMenuItem(value: 'xs', child: Text('Extra small')),
                  DropdownMenuItem(value: 'sm', child: Text('Small')),
                  DropdownMenuItem(value: 'md', child: Text('Medium')),
                  DropdownMenuItem(value: 'lg', child: Text('Large')),
                  DropdownMenuItem(value: 'xl', child: Text('Extra large')),
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

        // Visibility rule
        _PropertySection(
          title: 'Visibility',
          children: [
            DropdownButtonFormField<String>(
              initialValue: widget.block.visibilityRule,
              decoration: const InputDecoration(
                isDense: true,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'always',
                  child: Text('Always visible'),
                ),
                DropdownMenuItem(
                  value: 'afterPreviousCorrect',
                  child: Text('After previous correct'),
                ),
              ],
              onChanged: (value) {
                if (value != null) {
                  _updateBlock(widget.block.copyWith(visibilityRule: value));
                }
              },
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Content editor (by type)
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
      case BlockType.codeExecution:
        return _buildCodeExecutionEditor();
      case BlockType.functionFlow:
        return _buildFunctionFlowEditor();
      case BlockType.multipleChoice:
        return _buildMultipleChoiceEditor();
      case BlockType.trueFalse:
        return _buildTrueFalseEditor();
      case BlockType.matching:
        return _buildMatchingEditor();
      case BlockType.animation:
        return _buildAnimationEditor();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTextEditor() {
    final content = widget.block.content as TextContent;
    return _PropertySection(
      title: 'Text',
      children: [
        _PropertyField(
          label: 'Format',
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'markdown', label: Text('Markdown')),
              ButtonSegment(value: 'plain', label: Text('Plain')),
            ],
            selected: {content.format},
            onSelectionChanged: (value) {
              final updatedBlock = widget.block.copyWith(
                content: content.copyWith(format: value.first),
              );
              _updateBlock(updatedBlock);
            },
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.value,
          maxLines: 8,
          style: TextStyle(
            fontFamily: content.format == 'markdown' ? 'monospace' : null,
            fontSize: AppFontSize.sm,
          ),
          decoration: InputDecoration(
            hintText: content.format == 'markdown'
                ? '# Heading\n\n**Bold** and *italic*\n\n- List item'
                : 'Enter text...',
            border: const OutlineInputBorder(),
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
    final isLocalImage = content.url.startsWith('data:image/');
    return _PropertySection(
      title: 'Image',
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _pickLocalImage(content),
            icon: const Icon(Icons.upload_file),
            label: const Text('Import Local Image'),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.url,
          decoration: InputDecoration(
            labelText: 'Image URL',
            hintText: isLocalImage
                ? 'Local image is stored as data URL'
                : 'https://...',
            border: const OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: ImageContent(
                url: value,
                alt: content.alt,
                caption: content.caption,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.xs),
        const Text(
          'Supports both local import and network URLs.',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.caption ?? '',
          decoration: const InputDecoration(
            labelText: 'Caption',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: ImageContent(
                url: content.url,
                alt: content.alt,
                caption: value,
              ),
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
      title: 'Code Block',
      children: [
        DropdownButtonFormField<String>(
          initialValue: content.language,
          decoration: const InputDecoration(
            labelText: 'Language',
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
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: AppFontSize.sm,
          ),
          decoration: const InputDecoration(
            labelText: 'Code',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: CodeBlockContent(
                language: content.language,
                code: value,
              ),
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
      title: 'Code Playground',
      children: [
        TextFormField(
          initialValue: content.initialCode,
          maxLines: 8,
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: AppFontSize.sm,
          ),
          decoration: const InputDecoration(
            labelText: 'Starter code',
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
            labelText: 'Expected output',
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

  Widget _buildFunctionFlowEditor() {
    final content = widget.block.content as FunctionFlowContent;
    return FunctionFlowContentEditor(
      content: content,
      onChanged: (updatedContent) {
        _updateBlock(widget.block.copyWith(content: updatedContent));
      },
    );
  }

  Widget _buildCodeExecutionEditor() {
    final content = widget.block.content as CodeExecutionContent;
    return CodeExecutionContentEditor(
      content: content,
      onChanged: (updatedContent) {
        _updateBlock(widget.block.copyWith(content: updatedContent));
      },
    );
  }

  Widget _buildMultipleChoiceEditor() {
    final content = widget.block.content as MultipleChoiceContent;
    final correctAnswerIds = content.normalizedCorrectAnswers.toSet();
    return _PropertySection(
      title: 'Multiple Choice',
      children: [
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: false, label: Text('Single Select')),
            ButtonSegment(value: true, label: Text('Multi Select')),
          ],
          selected: {content.multiSelect},
          onSelectionChanged: (value) {
            final isMultiSelect = value.first;
            final nextAnswers = content.normalizedCorrectAnswers;
            final constrainedAnswers = isMultiSelect
                ? nextAnswers
                : (nextAnswers.isEmpty ? <String>[] : [nextAnswers.first]);

            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(
                multiSelect: isMultiSelect,
                correctAnswers: constrainedAnswers,
                correctAnswer: constrainedAnswers.isEmpty
                    ? ''
                    : constrainedAnswers.first,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: content.question,
          decoration: const InputDecoration(
            labelText: 'Question',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(question: value),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          content.multiSelect
              ? 'Options (select all correct answers)'
              : 'Options (select the correct answer)',
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
          final isCorrect = correctAnswerIds.contains(option.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(
                    content.multiSelect
                        ? (isCorrect
                              ? Icons.check_box
                              : Icons.check_box_outline_blank)
                        : (isCorrect
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked),
                    color: isCorrect ? AppColors.success : AppColors.neutral400,
                  ),
                  onPressed: () {
                    List<String> updatedCorrectAnswers;
                    if (content.multiSelect) {
                      updatedCorrectAnswers = [
                        ...content.normalizedCorrectAnswers,
                      ];
                      if (isCorrect) {
                        updatedCorrectAnswers.remove(option.id);
                      } else {
                        updatedCorrectAnswers.add(option.id);
                      }
                    } else {
                      updatedCorrectAnswers = [option.id];
                    }

                    final updatedBlock = widget.block.copyWith(
                      content: content.copyWith(
                        correctAnswers: updatedCorrectAnswers,
                        correctAnswer: updatedCorrectAnswers.isEmpty
                            ? ''
                            : updatedCorrectAnswers.first,
                      ),
                    );
                    _updateBlock(updatedBlock);
                  },
                ),
                Expanded(
                  child: TextFormField(
                    initialValue: option.text,
                    decoration: InputDecoration(
                      labelText: 'Option ${String.fromCharCode(65 + index)}',
                      isDense: true,
                    ),
                    onChanged: (value) {
                      final updatedOptions = [...content.options];
                      updatedOptions[index] = ChoiceOption(
                        id: option.id,
                        text: value,
                      );
                      final updatedBlock = widget.block.copyWith(
                        content: content.copyWith(options: updatedOptions),
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
            labelText: 'Explanation',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(
                explanation: value.isEmpty ? null : value,
                clearExplanation: value.isEmpty,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildTrueFalseEditor() {
    final content = widget.block.content as TrueFalseContent;
    return _PropertySection(
      title: 'True/False',
      children: [
        TextFormField(
          initialValue: content.question,
          decoration: const InputDecoration(
            labelText: 'Question',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(question: value),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.md),
        const Text(
          'Correct Answer',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('True')),
            ButtonSegment(value: false, label: Text('False')),
          ],
          selected: {content.correctAnswer},
          onSelectionChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(correctAnswer: value.first),
            );
            _updateBlock(updatedBlock);
          },
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: content.explanation ?? '',
          decoration: const InputDecoration(
            labelText: 'Explanation',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            final updatedBlock = widget.block.copyWith(
              content: content.copyWith(
                explanation: value.isEmpty ? null : value,
              ),
            );
            _updateBlock(updatedBlock);
          },
        ),
      ],
    );
  }

  Widget _buildAnimationEditor() {
    final content = widget.block.content as AnimationContent;

    return _PropertySection(
      title: 'Animation',
      children: [
        DropdownButtonFormField<String>(
          initialValue: content.preset,
          decoration: const InputDecoration(
            labelText: 'Preset',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
              value: AnimationContent.presetBouncingDot,
              child: Text('Bouncing Dot'),
            ),
            DropdownMenuItem(
              value: AnimationContent.presetPulseBars,
              child: Text('Pulse Bars'),
            ),
          ],
          onChanged: (value) {
            if (value == null) return;
            _updateBlock(
              widget.block.copyWith(content: content.copyWith(preset: value)),
            );
          },
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            const Text(
              'Duration',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            const Spacer(),
            Text(
              '${content.durationMs} ms',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
        ),
        Slider(
          value: content.durationMs.toDouble(),
          min: 300,
          max: 10000,
          divisions: 97,
          label: '${content.durationMs} ms',
          onChanged: (value) {
            _updateBlock(
              widget.block.copyWith(
                content: content.copyWith(durationMs: value.round()),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            const Text(
              'Loop',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            const Spacer(),
            Switch(
              value: content.loop,
              onChanged: (value) {
                _updateBlock(
                  widget.block.copyWith(content: content.copyWith(loop: value)),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            const Text(
              'Speed',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            const Spacer(),
            Text(
              '${content.speed.toStringAsFixed(2)}x',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
        ),
        Slider(
          value: content.speed,
          min: 0.25,
          max: 3.0,
          divisions: 11,
          label: '${content.speed.toStringAsFixed(2)}x',
          onChanged: (value) {
            _updateBlock(
              widget.block.copyWith(content: content.copyWith(speed: value)),
            );
          },
        ),
      ],
    );
  }

  Widget _buildMatchingEditor() {
    final content = widget.block.content as MatchingContent;
    return _PropertySection(
      title: 'Matching',
      children: [
        MatchingContentEditor(
          content: content,
          onChanged: (updatedContent) {
            _updateBlock(widget.block.copyWith(content: updatedContent));
          },
        ),
      ],
    );
  }
}

/// Property section
class _PropertySection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _PropertySection({required this.title, required this.children});

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

/// Single property field
class _PropertyField extends StatelessWidget {
  final String label;
  final Widget child;

  const _PropertyField({required this.label, required this.child});

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
