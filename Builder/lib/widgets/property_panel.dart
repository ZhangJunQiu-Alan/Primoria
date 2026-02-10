import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';

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
                  pageIndex: builderState.currentPageIndex,
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
        // Module info
        _PropertySection(
          title: 'Block',
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

        // Style settings
        _PropertySection(
          title: 'Style',
          children: [
            _PropertyField(
              label: 'Align',
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
      case BlockType.multipleChoice:
        return _buildMultipleChoiceEditor();
      case BlockType.trueFalse:
        return _buildTrueFalseEditor();
      case BlockType.matching:
        return _buildMatchingEditor();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTextEditor() {
    final content = widget.block.content as TextContent;
    return _PropertySection(
      title: 'Text',
      children: [
        TextFormField(
          initialValue: content.value,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'Enter text...',
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
      title: 'Image',
      children: [
        TextFormField(
          initialValue: content.url,
          decoration: const InputDecoration(
            labelText: 'Image URL',
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
            labelText: 'Caption',
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
          style: const TextStyle(fontFamily: 'monospace', fontSize: AppFontSize.sm),
          decoration: const InputDecoration(
            labelText: 'Code',
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
      title: 'Code Playground',
      children: [
        TextFormField(
          initialValue: content.initialCode,
          maxLines: 8,
          style: const TextStyle(fontFamily: 'monospace', fontSize: AppFontSize.sm),
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

  Widget _buildMultipleChoiceEditor() {
    final content = widget.block.content as MultipleChoiceContent;
    return _PropertySection(
      title: 'Multiple Choice',
      children: [
        TextFormField(
          initialValue: content.question,
          decoration: const InputDecoration(
            labelText: 'Question',
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
          'Options (select the correct answer)',
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
                      labelText: 'Option ${String.fromCharCode(65 + index)}',
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
            labelText: 'Explanation',
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

  Widget _buildMatchingEditor() {
    final content = widget.block.content as MatchingContent;
    return _PropertySection(
      title: 'Matching',
      children: [
        // Question
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

        // Left Items
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Left Items',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              onPressed: () {
                final newItem = MatchingItem(
                  id: 'l${content.leftItems.length + 1}',
                  text: 'Item ${content.leftItems.length + 1}',
                );
                final updatedBlock = widget.block.copyWith(
                  content: content.copyWith(
                    leftItems: [...content.leftItems, newItem],
                  ),
                );
                _updateBlock(updatedBlock);
              },
              tooltip: 'Add left item',
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ...content.leftItems.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: item.text,
                    decoration: InputDecoration(
                      labelText: 'Left ${index + 1}',
                      isDense: true,
                    ),
                    onChanged: (value) {
                      final updatedItems = [...content.leftItems];
                      updatedItems[index] = item.copyWith(text: value);
                      final updatedBlock = widget.block.copyWith(
                        content: content.copyWith(leftItems: updatedItems),
                      );
                      _updateBlock(updatedBlock);
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline, size: 20, color: AppColors.error),
                  onPressed: content.leftItems.length > 1
                      ? () {
                          final updatedItems = [...content.leftItems];
                          updatedItems.removeAt(index);
                          // Remove related pairs
                          final updatedPairs = content.correctPairs
                              .where((p) => p.leftId != item.id)
                              .toList();
                          final updatedBlock = widget.block.copyWith(
                            content: content.copyWith(
                              leftItems: updatedItems,
                              correctPairs: updatedPairs,
                            ),
                          );
                          _updateBlock(updatedBlock);
                        }
                      : null,
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: AppSpacing.md),

        // Right Items
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Right Items',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              onPressed: () {
                final newItem = MatchingItem(
                  id: 'r${content.rightItems.length + 1}',
                  text: 'Match ${content.rightItems.length + 1}',
                );
                final updatedBlock = widget.block.copyWith(
                  content: content.copyWith(
                    rightItems: [...content.rightItems, newItem],
                  ),
                );
                _updateBlock(updatedBlock);
              },
              tooltip: 'Add right item',
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ...content.rightItems.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: item.text,
                    decoration: InputDecoration(
                      labelText: 'Right ${index + 1}',
                      isDense: true,
                    ),
                    onChanged: (value) {
                      final updatedItems = [...content.rightItems];
                      updatedItems[index] = item.copyWith(text: value);
                      final updatedBlock = widget.block.copyWith(
                        content: content.copyWith(rightItems: updatedItems),
                      );
                      _updateBlock(updatedBlock);
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline, size: 20, color: AppColors.error),
                  onPressed: content.rightItems.length > 1
                      ? () {
                          final updatedItems = [...content.rightItems];
                          updatedItems.removeAt(index);
                          // Remove related pairs
                          final updatedPairs = content.correctPairs
                              .where((p) => p.rightId != item.id)
                              .toList();
                          final updatedBlock = widget.block.copyWith(
                            content: content.copyWith(
                              rightItems: updatedItems,
                              correctPairs: updatedPairs,
                            ),
                          );
                          _updateBlock(updatedBlock);
                        }
                      : null,
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: AppSpacing.md),

        // Correct Pairs
        const Text(
          'Correct Pairs (tap to set)',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ...content.leftItems.map((leftItem) {
          final existingPair = content.correctPairs.firstWhere(
            (p) => p.leftId == leftItem.id,
            orElse: () => const MatchingPair(leftId: '', rightId: ''),
          );
          final selectedRightId = existingPair.leftId == leftItem.id ? existingPair.rightId : null;

          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    leftItem.text,
                    style: const TextStyle(fontSize: AppFontSize.sm),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.arrow_forward, size: 16, color: AppColors.neutral400),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String>(
                    initialValue: selectedRightId,
                    decoration: const InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                    ),
                    hint: const Text('Select match'),
                    items: content.rightItems.map((rightItem) {
                      return DropdownMenuItem(
                        value: rightItem.id,
                        child: Text(
                          rightItem.text,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (rightId) {
                      if (rightId != null) {
                        // Remove existing pair for this left item
                        final updatedPairs = content.correctPairs
                            .where((p) => p.leftId != leftItem.id)
                            .toList();
                        // Add new pair
                        updatedPairs.add(MatchingPair(leftId: leftItem.id, rightId: rightId));
                        final updatedBlock = widget.block.copyWith(
                          content: content.copyWith(correctPairs: updatedPairs),
                        );
                        _updateBlock(updatedBlock);
                      }
                    },
                  ),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: AppSpacing.sm),

        // Explanation
        TextFormField(
          initialValue: content.explanation ?? '',
          decoration: const InputDecoration(
            labelText: 'Explanation',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
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
}

/// Property section
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

/// Single property field
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
