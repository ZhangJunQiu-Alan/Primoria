import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/ai_animation_generator.dart';
import '../services/ai_course_generator.dart';
import '../services/file_picker.dart' as file_picker;
import 'app_dropdown.dart';
import 'block_widgets/html_animation_widget.dart';
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
  static const Set<String> _supportedVisibilityRules = {
    Block.alwaysVisible,
    Block.afterPreviousCorrect,
  };

  String _safeVisibilityRule(String value) {
    return _supportedVisibilityRules.contains(value)
        ? value
        : Block.alwaysVisible;
  }

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
    final selectedVisibility = _safeVisibilityRule(widget.block.visibilityRule);

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
            if (widget.block.type == BlockType.animation) ...[
              const SizedBox(height: AppSpacing.sm),
              _PropertyField(
                label: 'Width',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Slider(
                            min: 260,
                            max: 1400,
                            divisions: 57,
                            value: ((widget.block.style.width ?? 960).clamp(
                              260.0,
                              1400.0,
                            )).toDouble(),
                            label:
                                '${((widget.block.style.width ?? 960).clamp(260.0, 1400.0)).toStringAsFixed(0)} px',
                            onChanged: (value) {
                              final updatedBlock = widget.block.copyWith(
                                style: widget.block.style.copyWith(
                                  width: value,
                                ),
                              );
                              _updateBlock(updatedBlock);
                            },
                          ),
                        ),
                        SizedBox(
                          width: 62,
                          child: Text(
                            widget.block.style.width == null
                                ? 'Auto'
                                : '${widget.block.style.width!.clamp(260.0, 1400.0).toStringAsFixed(0)}px',
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              fontSize: AppFontSize.xs,
                              color: AppColors.neutral500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () {
                        final updatedBlock = widget.block.copyWith(
                          style: widget.block.style.copyWith(clearWidth: true),
                        );
                        _updateBlock(updatedBlock);
                      },
                      child: const Text('Fill container'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              _PropertyField(
                label: 'Height',
                child: Row(
                  children: [
                    Expanded(
                      child: Slider(
                        min: 180,
                        max: 900,
                        divisions: 36,
                        value: ((widget.block.style.height ?? 300).clamp(
                          180.0,
                          900.0,
                        )).toDouble(),
                        label:
                            '${((widget.block.style.height ?? 300).clamp(180.0, 900.0)).toStringAsFixed(0)} px',
                        onChanged: (value) {
                          final updatedBlock = widget.block.copyWith(
                            style: widget.block.style.copyWith(height: value),
                          );
                          _updateBlock(updatedBlock);
                        },
                      ),
                    ),
                    SizedBox(
                      width: 56,
                      child: Text(
                        '${((widget.block.style.height ?? 300).clamp(180.0, 900.0)).toStringAsFixed(0)}px',
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                          fontSize: AppFontSize.xs,
                          color: AppColors.neutral500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Visibility rule
        _PropertySection(
          title: 'Visibility',
          children: [
            AppDropdown<String>(
              value: selectedVisibility,
              isDense: true,
              items: const [
                AppDropdownItem(
                  value: Block.alwaysVisible,
                  label: 'Always visible',
                ),
                AppDropdownItem(
                  value: Block.afterPreviousCorrect,
                  label: 'After previous correct',
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
        return const SizedBox.shrink();
      case BlockType.image:
        return _buildImageEditor();
      case BlockType.codeBlock:
        return const SizedBox.shrink();
      case BlockType.codePlayground:
        return const SizedBox.shrink();
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
    return _AnimationEditor(
      content: content,
      onChanged: (updated) {
        _updateBlock(widget.block.copyWith(content: updated));
      },
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

// ─────────────────────────────────────────────────────────────────────────────
// Animation Editor — AI generation only
// ─────────────────────────────────────────────────────────────────────────────

class _AnimationEditor extends StatefulWidget {
  final AnimationContent content;
  final ValueChanged<AnimationContent> onChanged;

  const _AnimationEditor({required this.content, required this.onChanged});

  @override
  State<_AnimationEditor> createState() => _AnimationEditorState();
}

class _AnimationEditorState extends State<_AnimationEditor> {
  final _promptController = TextEditingController();
  final _apiKeyController = TextEditingController();
  bool _isGenerating = false;
  String? _generationError;
  String _selectedModel = 'gemini-3.1-flash-lite-preview';
  String _selectedStyle = _animationStyles.first.key;

  static const _modelOptions = [
    'gemini-2.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro',
    'gemini-3.1-flash-lite-preview',
  ];
  late TextEditingController _codeController;
  static const _animationStyles = [
    (
      key: 'anime',
      label: 'Anime',
      description: 'Bold motion, vivid colors, expressive teaching visuals',
    ),
    (
      key: 'minimal',
      label: 'Minimal',
      description: 'Clean layouts, simple geometry, low visual noise',
    ),
    (
      key: 'tech',
      label: 'Tech',
      description: 'HUD-like glow, data overlays, futuristic presentation',
    ),
    (
      key: 'realistic',
      label: 'Realistic',
      description: 'Natural motion, physical spacing, grounded visuals',
    ),
    (
      key: 'playful',
      label: 'Playful Edu',
      description: 'Friendly classroom style, colorful, approachable',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _promptController.text = widget.content.aiPrompt ?? '';
    _apiKeyController.text = AICourseGenerator.apiKey ?? '';
    _codeController = TextEditingController(
      text: widget.content.customHtml ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant _AnimationEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync code editor when HTML changes externally (e.g. after Generate)
    if (oldWidget.content.customHtml != widget.content.customHtml) {
      _codeController.text = widget.content.customHtml ?? '';
    }
  }

  @override
  void dispose() {
    _promptController.dispose();
    _apiKeyController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _generate({
    bool isRegenerate = false,
    String? overridePrompt,
  }) async {
    final rawPrompt = (overridePrompt ?? _promptController.text).trim();
    if (rawPrompt.isEmpty) return;
    final prompt = _composePrompt(rawPrompt);

    final key = _apiKeyController.text.trim();
    if (key.isNotEmpty) AICourseGenerator.setApiKey(key);

    final apiKey = AICourseGenerator.apiKey ?? '';
    if (apiKey.isEmpty) {
      setState(() => _generationError = 'Please enter a Gemini API key.');
      return;
    }

    setState(() {
      _isGenerating = true;
      _generationError = null;
    });

    final result = await AIAnimationGenerator.generate(
      prompt: prompt,
      apiKey: apiKey,
      previousHtml: isRegenerate ? widget.content.customHtml : null,
      model: _selectedModel,
    );

    if (!mounted) return;

    if (result.isSuccess) {
      _codeController.text = result.html!;
      widget.onChanged(
        widget.content.copyWith(
          preset: AnimationContent.presetCustom,
          customHtml: result.html,
          aiPrompt: rawPrompt,
        ),
      );
      setState(() {
        _isGenerating = false;
      });
    } else {
      setState(() {
        _isGenerating = false;
        _generationError = result.error ?? 'Generation failed.';
      });
    }
  }

  String _composePrompt(String prompt) {
    final style = _animationStyles.firstWhere(
      (style) => style.key == _selectedStyle,
      orElse: () => _animationStyles.first,
    );
    return 'Animation style: ${style.label}. ${style.description}. '
        'Create an educational STEM animation for: $prompt';
  }

  void _applyCodeEdit() {
    final html = _codeController.text.trim();
    if (html.isEmpty) return;
    widget.onChanged(
      widget.content.copyWith(
        preset: AnimationContent.presetCustom,
        customHtml: html,
      ),
    );
  }

  Future<void> _showRegenerateDialog() async {
    final controller = TextEditingController();
    setHtmlAnimationInteractionEnabled(false);
    final desc = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Regenerate Animation'),
          content: TextField(
            controller: controller,
            maxLines: 4,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'Describe what to improve...',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Regenerate'),
            ),
          ],
        );
      },
    );
    setHtmlAnimationInteractionEnabled(true);
    controller.dispose();

    if (!mounted) return;
    final improvement = (desc ?? '').trim();
    if (improvement.isEmpty) {
      setState(() {
        _generationError = 'Please describe what to improve before regenerate.';
      });
      return;
    }
    await _generate(isRegenerate: true, overridePrompt: improvement);
  }

  Future<void> _showEditCodeDialog() async {
    final dialogController = TextEditingController(text: _codeController.text);
    setHtmlAnimationInteractionEnabled(false);
    final updatedHtml = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Edit HTML Code'),
          content: SizedBox(
            width: 700,
            child: TextField(
              controller: dialogController,
              maxLines: 18,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: AppFontSize.xs,
              ),
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'Edit HTML…',
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(dialogController.text.trim()),
              child: const Text('Apply'),
            ),
          ],
        );
      },
    );
    setHtmlAnimationInteractionEnabled(true);
    dialogController.dispose();

    if (!mounted) return;
    if (updatedHtml == null || updatedHtml.isEmpty) return;
    _codeController.text = updatedHtml;
    _applyCodeEdit();
  }

  @override
  Widget build(BuildContext context) {
    final hasGenerated =
        widget.content.preset == AnimationContent.presetCustom &&
        widget.content.customHtml != null;

    return _PropertySection(
      title: 'Animation',
      children: [
        // API key field
        TextField(
          controller: _apiKeyController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Gemini API Key',
            hintText: 'Paste your Gemini API key…',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.key, size: 16),
          ),
          style: const TextStyle(fontSize: AppFontSize.sm),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Model selector
        AppDropdown<String>(
          value: _selectedModel,
          labelText: 'Model',
          prefixIcon: const Icon(
            Icons.psychology,
            size: 16,
            color: AppColors.secondary200,
          ),
          items: _modelOptions
              .map((m) => AppDropdownItem(value: m, label: m))
              .toList(),
          onChanged: (v) {
            if (v != null) setState(() => _selectedModel = v);
          },
        ),
        const SizedBox(height: AppSpacing.md),

        const Text(
          'Style',
          style: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral700,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: _animationStyles.map<Widget>((style) {
            final isSelected = style.key == _selectedStyle;
            return ChoiceChip(
              label: Text(style.label),
              selected: isSelected,
              labelStyle: TextStyle(
                fontSize: AppFontSize.xs,
                color: isSelected ? Colors.white : AppColors.neutral700,
              ),
              onSelected: (_) {
                setState(() => _selectedStyle = style.key);
              },
              selectedColor: AppColors.primary500,
              backgroundColor: AppColors.neutral100,
              side: BorderSide(
                color: isSelected ? AppColors.primary500 : AppColors.neutral200,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          _animationStyles
              .firstWhere((style) => style.key == _selectedStyle)
              .description,
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Prompt text field
        TextField(
          controller: _promptController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Describe the animation you want to generate…',
            border: OutlineInputBorder(),
          ),
          style: const TextStyle(fontSize: AppFontSize.sm),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Generate button
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _isGenerating ? null : () => _generate(),
            icon: _isGenerating
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.auto_awesome, size: 16),
            label: Text(_isGenerating ? 'Generating…' : 'Generate'),
          ),
        ),

        // Error
        if (_generationError != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, size: 14, color: AppColors.error),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    _generationError!,
                    style: TextStyle(
                      fontSize: AppFontSize.xs,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Preview + action buttons
        if (hasGenerated) ...[
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isGenerating ? null : _showRegenerateDialog,
                  icon: const Icon(Icons.refresh, size: 14),
                  label: const Text('Regenerate'),
                  style: OutlinedButton.styleFrom(
                    textStyle: const TextStyle(fontSize: AppFontSize.xs),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showEditCodeDialog,
                  icon: const Icon(Icons.code, size: 14),
                  label: const Text('Edit Code'),
                  style: OutlinedButton.styleFrom(
                    textStyle: const TextStyle(fontSize: AppFontSize.xs),
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
