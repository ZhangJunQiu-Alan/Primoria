import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';
import '../services/ai_animation_generator.dart';
import '../services/ai_course_generator.dart';
import '../services/ai_visual_generator.dart';
import '../services/file_picker.dart' as file_picker;
import 'app_dropdown.dart';
import 'block_widgets/html_animation_widget.dart';
import 'code_execution_content_editor.dart';
import 'function_flow_content_editor.dart';
import 'matching_content_editor.dart';

/// Right properties panel - shows properties of the selected module
class PropertyPanel extends ConsumerWidget {
  final BuilderLocalizations t;

  const PropertyPanel({super.key, required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);
    final course = ref.watch(courseProvider);
    final selectedBlockId = builderState.selectedBlockId;

    // Find selected block — search the current page first, then all pages as
    // fallback so the inspector works on every page, not just page 0.
    Block? selectedBlock;
    if (selectedBlockId != null) {
      final lesson = course.getLesson(builderState.currentLessonIndex);
      if (lesson != null) {
        outer:
        for (final page in lesson.pages) {
          for (final block in page.blocks) {
            if (block.id == selectedBlockId) {
              selectedBlock = block;
              break outer;
            }
          }
        }
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.xs,
          ),
          child: Text(
            t.isZh ? '属性检查器' : 'Inspector',
            style: TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral900,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppColors.primary400,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  t.isZh ? '模块设置' : 'Block settings',
                  style: TextStyle(
                    fontSize: AppFontSize.xs,
                    fontWeight: FontWeight.w700,
                    color: AppColors.neutral600,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: selectedBlock == null
              ? _buildEmptyState()
              : _BlockPropertyEditor(
                  key: ValueKey(selectedBlock.id),
                  block: selectedBlock,
                  lessonIndex: builderState.currentLessonIndex,
                  pageIndex: builderState.currentPageIndex,
                  t: t,
                ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: const Color(0xFFF7FAFC),
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.touch_app_outlined,
                size: 32,
                color: AppColors.neutral400,
              ),
              SizedBox(height: AppSpacing.md),
              Text(
                t.isZh ? '选择一个模块' : 'Select a block',
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w700,
                  color: AppColors.neutral800,
                ),
              ),
              SizedBox(height: AppSpacing.xs),
              Text(
                t.isZh
                    ? '右侧仅显示当前选中模块相关的设置。'
                    : 'The right sidebar will show only the settings that matter for the selected block.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Block property editor
class _BlockPropertyEditor extends ConsumerStatefulWidget {
  final Block block;
  final int lessonIndex;
  final int pageIndex;
  final BuilderLocalizations t;

  const _BlockPropertyEditor({
    super.key,
    required this.block,
    required this.lessonIndex,
    required this.pageIndex,
    required this.t,
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
  bool _isVideoImporting = false;
  double _videoImportProgress = 0;
  int _videoImportLoadedBytes = 0;
  int _videoImportTotalBytes = 0;
  DateTime? _videoImportStartedAt;

  String _safeVisibilityRule(String value) {
    return _supportedVisibilityRules.contains(value)
        ? value
        : Block.alwaysVisible;
  }

  void _updateBlock(Block updatedBlock) {
    ref
        .read(courseProvider.notifier)
        .updateBlock(widget.lessonIndex, updatedBlock, pageIndex: widget.pageIndex);
    ref.read(builderStateProvider.notifier).markAsUnsaved();
  }

  String _tr(String zh, String en) {
    return widget.t.isZh ? zh : en;
  }

  void _onVideoImportProgress(
    double progress,
    int loadedBytes,
    int totalBytes,
  ) {
    if (!mounted) return;
    setState(() {
      _videoImportProgress = progress.clamp(0.0, 1.0).toDouble();
      _videoImportLoadedBytes = loadedBytes;
      _videoImportTotalBytes = totalBytes;
    });
  }

  String _videoEtaLabel() {
    if (!_isVideoImporting) return '';
    if (_videoImportTotalBytes <= 0 ||
        _videoImportLoadedBytes <= 0 ||
        _videoImportStartedAt == null) {
      return _tr('正在估算剩余时间...', 'Estimating time remaining...');
    }
    final elapsedMs = DateTime.now()
        .difference(_videoImportStartedAt!)
        .inMilliseconds;
    if (elapsedMs <= 0) {
      return _tr('正在估算剩余时间...', 'Estimating time remaining...');
    }

    final speedBytesPerSecond = _videoImportLoadedBytes / (elapsedMs / 1000);
    if (speedBytesPerSecond <= 0 ||
        _videoImportLoadedBytes >= _videoImportTotalBytes) {
      return _tr('即将完成...', 'Almost done...');
    }

    final secondsLeft =
        ((_videoImportTotalBytes - _videoImportLoadedBytes) /
                speedBytesPerSecond)
            .ceil();
    if (secondsLeft <= 1) return _tr('即将完成...', 'Almost done...');
    if (secondsLeft < 60) {
      return _tr('约 $secondsLeft 秒剩余', 'About ${secondsLeft}s remaining');
    }
    final minutes = secondsLeft ~/ 60;
    final seconds = secondsLeft % 60;
    return _tr(
      '约$minutes分$seconds秒剩余',
      'About $minutes min $seconds sec remaining',
    );
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
              ? _tr('已导入本地图片', 'Local image imported')
              : _tr('已导入: ${result.fileName}', 'Imported: ${result.fileName}'),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _pickLocalVideo(VideoContent content) async {
    if (_isVideoImporting) return;

    final result = await file_picker.pickVideoFile(
      onReadStart: () {
        if (!mounted) return;
        setState(() {
          _isVideoImporting = true;
          _videoImportProgress = 0;
          _videoImportLoadedBytes = 0;
          _videoImportTotalBytes = 0;
          _videoImportStartedAt = DateTime.now();
        });
      },
      onProgress: _onVideoImportProgress,
    );
    if (!mounted) return;
    setState(() => _isVideoImporting = false);

    if (!result.success || (result.content ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final inferredTitle = result.fileName?.trim().isNotEmpty == true
        ? result.fileName!.trim()
        : content.title;
    final updatedBlock = widget.block.copyWith(
      content: VideoContent(url: result.content!, title: inferredTitle),
    );
    _updateBlock(updatedBlock);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.fileName == null
              ? _tr('已导入本地视频', 'Local video imported')
              : _tr('已导入: ${result.fileName}', 'Imported: ${result.fileName}'),
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
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.xl,
      ),
      children: [
        _BlockSummaryRow(
          icon: info?.icon ?? Icons.widgets,
          title: info?.name ?? widget.block.type.label,
          meta: _displayId(widget.block.id),
          accentColor: _accentColorFor(widget.block.type),
        ),
        const SizedBox(height: AppSpacing.md),
        _PropertySection(
          title: _tr('可见性', 'Visibility'),
          children: [
            AppDropdown<String>(
              value: selectedVisibility,
              light: true,
              isDense: true,
              items: [
                AppDropdownItem(
                  value: Block.alwaysVisible,
                  label: _tr('始终可见', 'Always visible'),
                ),
                AppDropdownItem(
                  value: Block.afterPreviousCorrect,
                  label: _tr('上一题答对后显示', 'After previous correct'),
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
        const SizedBox(height: AppSpacing.md),
        if (widget.block.type == BlockType.animation) ...[
          _PropertySection(
            title: _tr('布局', 'Layout'),
            children: [
              _PropertyField(
                label: _tr('宽度', 'Width'),
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
                                ? _tr('自动', 'Auto')
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
                      child: Text(_tr('填满容器', 'Fill container')),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              _PropertyField(
                label: _tr('高度', 'Height'),
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
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        _buildContentEditor(),
      ],
    );
  }

  String _displayId(String blockId) {
    return blockId.length > 18 ? '${blockId.substring(0, 18)}…' : blockId;
  }

  Color _accentColorFor(BlockType type) {
    switch (type) {
      case BlockType.text:
      case BlockType.image:
      case BlockType.multipleChoice:
      case BlockType.trueFalse:
      case BlockType.matching:
      case BlockType.fillBlank:
        return AppColors.primary500;
      case BlockType.codeBlock:
      case BlockType.codePlayground:
      case BlockType.codeExecution:
      case BlockType.functionFlow:
        return AppColors.secondary500;
      case BlockType.animation:
      case BlockType.interactiveVisual:
      case BlockType.video:
        return AppColors.accent500;
    }
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
      case BlockType.fillBlank:
        return const SizedBox.shrink();
      case BlockType.animation:
        return _buildAnimationEditor();
      case BlockType.interactiveVisual:
        return _buildInteractiveVisualEditor();
      case BlockType.video:
        return _buildVideoEditor();
    }
  }

  Widget _buildImageEditor() {
    final content = widget.block.content as ImageContent;
    final isLocalImage = content.url.startsWith('data:image/');
    return _PropertySection(
      title: _tr('图片', 'Image'),
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _pickLocalImage(content),
            icon: const Icon(Icons.upload_file),
            label: Text(_tr('导入本地图片', 'Import Local Image')),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.url,
          decoration: InputDecoration(
            labelText: _tr('图片 URL', 'Image URL'),
            hintText: isLocalImage
                ? _tr(
                    '本地图片以 data URL 形式保存',
                    'Local image is stored as data URL',
                  )
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
        Text(
          _tr('支持本地导入与网络 URL。', 'Supports both local import and network URLs.'),
          style: TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.caption ?? '',
          decoration: InputDecoration(
            labelText: _tr('图片说明', 'Caption'),
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

  Widget _buildVideoEditor() {
    final content = widget.block.content as VideoContent;
    final isLocalVideo = content.url.startsWith('data:video/');

    return _PropertySection(
      title: _tr('视频', 'Video'),
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _isVideoImporting
                ? null
                : () => _pickLocalVideo(content),
            icon: const Icon(Icons.upload_file),
            label: Text(
              _isVideoImporting
                  ? _tr('正在导入视频...', 'Importing video...')
                  : _tr('导入本地视频', 'Import Local Video'),
            ),
          ),
        ),
        if (_isVideoImporting) ...[
          const SizedBox(height: AppSpacing.sm),
          Builder(
            builder: (context) {
              final percent = (_videoImportProgress * 100)
                  .clamp(0, 100)
                  .round();
              final determinate =
                  _videoImportProgress > 0 && _videoImportProgress < 1;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _tr('正在导入视频... $percent%', 'Importing video... $percent%'),
                    style: const TextStyle(
                      fontSize: AppFontSize.xs,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppBorderRadius.pill),
                    child: LinearProgressIndicator(
                      value: determinate ? _videoImportProgress : null,
                      minHeight: 6,
                      backgroundColor: AppColors.accent100,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.accent500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _videoEtaLabel(),
                    style: const TextStyle(
                      fontSize: AppFontSize.xs,
                      color: AppColors.neutral500,
                    ),
                  ),
                ],
              );
            },
          ),
        ],
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.url,
          decoration: InputDecoration(
            labelText: _tr('视频 URL', 'Video URL'),
            hintText: isLocalVideo
                ? _tr(
                    '本地视频以 data URL 形式保存',
                    'Local video is stored as data URL',
                  )
                : 'https://...',
            border: const OutlineInputBorder(),
          ),
          onChanged: (value) {
            _updateBlock(
              widget.block.copyWith(
                content: VideoContent(url: value, title: content.title),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          _tr(
            '支持 MP4 / WebM / OGG / MOV / M4V 及浏览器可播放的其他视频格式（建议优先使用可公开访问的 URL）。',
            'Supports MP4 / WebM / OGG / MOV / M4V and other browser-playable video formats (public URLs are recommended for larger files).',
          ),
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.title ?? '',
          decoration: InputDecoration(
            labelText: _tr('视频标题', 'Video Title'),
            border: const OutlineInputBorder(),
          ),
          onChanged: (value) {
            _updateBlock(
              widget.block.copyWith(
                content: VideoContent(
                  url: content.url,
                  title: value.trim().isEmpty ? null : value,
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildFunctionFlowEditor() {
    final content = widget.block.content as FunctionFlowContent;
    return FunctionFlowContentEditor(
      t: widget.t,
      content: content,
      onChanged: (updatedContent) {
        _updateBlock(widget.block.copyWith(content: updatedContent));
      },
    );
  }

  Widget _buildCodeExecutionEditor() {
    final content = widget.block.content as CodeExecutionContent;
    return CodeExecutionContentEditor(
      t: widget.t,
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
      title: _tr('选择题', 'Multiple Choice'),
      children: [
        SegmentedButton<bool>(
          segments: [
            ButtonSegment(
              value: false,
              label: Text(_tr('单选', 'Single Select')),
            ),
            ButtonSegment(value: true, label: Text(_tr('多选', 'Multi Select'))),
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
          decoration: InputDecoration(
            labelText: _tr('题目', 'Question'),
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
              ? _tr('选项（可选多个正确答案）', 'Options (select all correct answers)')
              : _tr('选项（选择一个正确答案）', 'Options (select the correct answer)'),
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
                      labelText: _tr(
                        '选项 ${String.fromCharCode(65 + index)}',
                        'Option ${String.fromCharCode(65 + index)}',
                      ),
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
          decoration: InputDecoration(
            labelText: _tr('解析', 'Explanation'),
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
      title: _tr('判断题', 'True/False'),
      children: [
        TextFormField(
          initialValue: content.question,
          decoration: InputDecoration(
            labelText: _tr('题目', 'Question'),
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
          _tr('正确答案', 'Correct Answer'),
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SegmentedButton<bool>(
          segments: [
            ButtonSegment(value: true, label: Text(_tr('正确', 'True'))),
            ButtonSegment(value: false, label: Text(_tr('错误', 'False'))),
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
          decoration: InputDecoration(
            labelText: _tr('解析', 'Explanation'),
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

  Widget _buildInteractiveVisualEditor() {
    final content = widget.block.content as InteractiveVisualContent;
    return _InteractiveVisualEditor(
      t: widget.t,
      content: content,
      onChanged: (updated) {
        _updateBlock(widget.block.copyWith(content: updated));
      },
    );
  }

  Widget _buildAnimationEditor() {
    final content = widget.block.content as AnimationContent;
    return _AnimationEditor(
      t: widget.t,
      content: content,
      onChanged: (updated) {
        _updateBlock(widget.block.copyWith(content: updated));
      },
    );
  }

  Widget _buildMatchingEditor() {
    final content = widget.block.content as MatchingContent;
    return _PropertySection(
      title: _tr('匹配题', 'Matching'),
      children: [
        MatchingContentEditor(
          t: widget.t,
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
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFEFE),
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w700,
                  color: AppColors.neutral900,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ...children,
            ],
          ),
        ),
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _BlockSummaryRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String meta;
  final Color accentColor;

  const _BlockSummaryRow({
    required this.icon,
    required this.title,
    required this.meta,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: accentColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: Icon(icon, color: accentColor, size: 16),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral900,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          meta,
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Editor — AI generation only
// ─────────────────────────────────────────────────────────────────────────────

class _AnimationEditor extends StatefulWidget {
  final BuilderLocalizations t;
  final AnimationContent content;
  final ValueChanged<AnimationContent> onChanged;

  const _AnimationEditor({
    required this.t,
    required this.content,
    required this.onChanged,
  });

  @override
  State<_AnimationEditor> createState() => _AnimationEditorState();
}

class _AnimationEditorState extends State<_AnimationEditor> {
  final _promptController = TextEditingController();
  final _apiKeyController = TextEditingController();
  bool _isGenerating = false;
  String? _generationError;
  String _selectedModel = 'gemini-3.1-pro-preview';
  String _selectedStyle = _animationStyles.first.key;

  static const _modelOptions = [
    'gemini-3.1-pro-preview',
  ];

  static const _animationStyles = [
    (
      key: 'anime',
      labelEn: 'Anime',
      labelZh: '动漫',
      descriptionEn: 'Bold motion, vivid colors, expressive teaching visuals',
      descriptionZh: '动作感强，色彩鲜明，适合表达式教学',
    ),
    (
      key: 'minimal',
      labelEn: 'Minimal',
      labelZh: '极简',
      descriptionEn: 'Clean layouts, simple geometry, low visual noise',
      descriptionZh: '布局简洁，几何元素清晰，视觉干扰少',
    ),
    (
      key: 'tech',
      labelEn: 'Tech',
      labelZh: '科技',
      descriptionEn: 'HUD-like glow, data overlays, futuristic presentation',
      descriptionZh: 'HUD 发光风格，带数据叠层，未来感展示',
    ),
    (
      key: 'realistic',
      labelEn: 'Realistic',
      labelZh: '写实',
      descriptionEn: 'Natural motion, physical spacing, grounded visuals',
      descriptionZh: '运动自然，空间关系真实，画面稳重',
    ),
    (
      key: 'playful',
      labelEn: 'Playful Edu',
      labelZh: '趣味教学',
      descriptionEn: 'Friendly classroom style, colorful, approachable',
      descriptionZh: '课堂风格友好，色彩活泼，亲和力强',
    ),
  ];

  late TextEditingController _codeController;

  String _tr(String zh, String en) {
    return widget.t.isZh ? zh : en;
  }

  String _styleLabel(
    ({
      String descriptionEn,
      String descriptionZh,
      String key,
      String labelEn,
      String labelZh,
    })
    style,
  ) {
    return widget.t.isZh ? style.labelZh : style.labelEn;
  }

  String _styleDescription(
    ({
      String descriptionEn,
      String descriptionZh,
      String key,
      String labelEn,
      String labelZh,
    })
    style,
  ) {
    return widget.t.isZh ? style.descriptionZh : style.descriptionEn;
  }

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
      setState(() {
        _generationError = _tr(
          '请输入 Gemini API Key。',
          'Please enter a Gemini API key.',
        );
      });
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
        _generationError = result.error ?? _tr('生成失败。', 'Generation failed.');
      });
    }
  }

  String _composePrompt(String prompt) {
    final style = _animationStyles.firstWhere(
      (s) => s.key == _selectedStyle,
      orElse: () => _animationStyles.first,
    );
    final styleLabel = _styleLabel(style);
    final styleDescription = _styleDescription(style);
    return _tr(
      '动画风格：$styleLabel。$styleDescription。请为以下内容生成一段 STEM 教学动画：$prompt',
      'Animation style: $styleLabel. $styleDescription. Create an educational STEM animation for: $prompt',
    );
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
          title: Text(_tr('重新生成动画', 'Regenerate Animation')),
          content: TextField(
            controller: controller,
            maxLines: 4,
            autofocus: true,
            decoration: InputDecoration(
              hintText: _tr('描述希望改进的地方...', 'Describe what to improve...'),
              border: const OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(_tr('取消', 'Cancel')),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(controller.text.trim()),
              child: Text(_tr('重新生成', 'Regenerate')),
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
        _generationError = _tr(
          '请先描述需要改进的内容，再重新生成。',
          'Please describe what to improve before regenerate.',
        );
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
          title: Text(_tr('编辑 HTML 代码', 'Edit HTML Code')),
          content: SizedBox(
            width: 700,
            child: TextField(
              controller: dialogController,
              maxLines: 18,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: AppFontSize.xs,
              ),
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                hintText: _tr('编辑 HTML...', 'Edit HTML...'),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(_tr('取消', 'Cancel')),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(dialogController.text.trim()),
              child: Text(_tr('应用', 'Apply')),
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

    final selectedStyle = _animationStyles.firstWhere(
      (style) => style.key == _selectedStyle,
      orElse: () => _animationStyles.first,
    );

    return _PropertySection(
      title: _tr('动画', 'Animation'),
      children: [
        TextField(
          controller: _apiKeyController,
          obscureText: true,
          decoration: InputDecoration(
            labelText: _tr('Gemini API Key', 'Gemini API Key'),
            hintText: _tr(
              '粘贴你的 Gemini API Key...',
              'Paste your Gemini API key...',
            ),
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.key, size: 16),
          ),
          style: const TextStyle(fontSize: AppFontSize.sm),
        ),
        const SizedBox(height: AppSpacing.sm),
        AppDropdown<String>(
          value: _selectedModel,
          labelText: _tr('模型', 'Model'),
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
        Text(
          _tr('风格', 'Style'),
          style: const TextStyle(
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
              label: Text(_styleLabel(style)),
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
          _styleDescription(selectedStyle),
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextField(
          controller: _promptController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: _tr(
              '描述你想生成的动画...',
              'Describe the animation you want to generate...',
            ),
            border: const OutlineInputBorder(),
          ),
          style: const TextStyle(fontSize: AppFontSize.sm),
        ),
        const SizedBox(height: AppSpacing.sm),
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
            label: Text(
              _isGenerating
                  ? _tr('生成中...', 'Generating...')
                  : _tr('生成', 'Generate'),
            ),
          ),
        ),
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
                const Icon(
                  Icons.error_outline,
                  size: 14,
                  color: AppColors.error,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    _generationError!,
                    style: const TextStyle(
                      fontSize: AppFontSize.xs,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        if (hasGenerated) ...[
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isGenerating ? null : _showRegenerateDialog,
                  icon: const Icon(Icons.refresh, size: 14),
                  label: Text(_tr('重新生成', 'Regenerate')),
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
                  label: Text(_tr('编辑代码', 'Edit Code')),
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

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Visual Editor
// ─────────────────────────────────────────────────────────────────────────────

class _InteractiveVisualEditor extends StatefulWidget {
  final BuilderLocalizations t;
  final InteractiveVisualContent content;
  final ValueChanged<InteractiveVisualContent> onChanged;

  const _InteractiveVisualEditor({
    required this.t,
    required this.content,
    required this.onChanged,
  });

  @override
  State<_InteractiveVisualEditor> createState() =>
      _InteractiveVisualEditorState();
}

// Visual style definitions for Interactive Visual generation
class _VisualStyle {
  final String key;
  final String nameEn;
  final String nameZh;
  final String emoji;
  final String promptHint; // injected into Gemini prompt

  const _VisualStyle({
    required this.key,
    required this.nameEn,
    required this.nameZh,
    required this.emoji,
    required this.promptHint,
  });
}

const _visualStyles = <_VisualStyle>[
  _VisualStyle(
    key: 'watercolor',
    nameEn: 'Watercolor',
    nameZh: '水彩',
    emoji: '🎨',
    promptHint:
        'STYLE: Watercolor aesthetic — soft blurred edges, low contrast, pastel and muted tones, generous white space, color bleeding/wet-on-wet gradients. Avoid sharp lines.',
  ),
  _VisualStyle(
    key: 'papercraft',
    nameEn: 'Papercraft',
    nameZh: '剪纸',
    emoji: '✂️',
    promptHint:
        'STYLE: Papercraft / cut-paper aesthetic — crisp geometric flat shapes, clearly layered elements, subtle drop shadows to suggest paper depth, clean outlines.',
  ),
  _VisualStyle(
    key: 'anime',
    nameEn: 'Anime',
    nameZh: '动漫',
    emoji: '⚡',
    promptHint:
        'STYLE: Anime aesthetic — bold dark outlines, highly saturated vivid colors, dynamic motion blur, dramatic speed lines, cel-shading, energetic composition.',
  ),
  _VisualStyle(
    key: 'whiteboard',
    nameEn: 'Whiteboard',
    nameZh: '白板',
    emoji: '📋',
    promptHint:
        'STYLE: Whiteboard sketch aesthetic — white or near-white background, hand-drawn black marker strokes, arrows, boxes, labels appearing progressively as if being drawn live.',
  ),
  _VisualStyle(
    key: 'retro_print',
    nameEn: 'Retro Print',
    nameZh: '复古印刷',
    emoji: '🗞️',
    promptHint:
        'STYLE: Retro print / vintage magazine infographic aesthetic — restrained color palette (2-3 colors), halftone dot patterns, overprint misalignment, aged paper texture feel.',
  ),
  _VisualStyle(
    key: 'heritage',
    nameEn: 'Heritage',
    nameZh: '经典学术',
    emoji: '🏛️',
    promptHint:
        'STYLE: Heritage / academic textbook aesthetic — classical serif typography, muted scholarly tones (cream, navy, dark green), museum-label layout, dignified and serious.',
  ),
];

class _InteractiveVisualEditorState extends State<_InteractiveVisualEditor> {
  final _promptController = TextEditingController();
  bool _isGenerating = false;
  String? _generationError;
  VisualGenerationStage _stage = VisualGenerationStage.idle;
  bool _showAdvanced = false;
  String? _selectedStyle; // null = not yet chosen (required before generate)

  static const _stageMessages = {
    VisualGenerationStage.analyzing: ('Analyzing prompt...', '正在分析提示词...'),
    VisualGenerationStage.generatingScene: ('Generating visual...', '生成可视化中...'),
    VisualGenerationStage.done: ('Done!', '完成！'),
    VisualGenerationStage.error: ('Generation failed', '生成失败'),
  };

  @override
  void initState() {
    super.initState();
    _promptController.text = widget.content.aiPrompt ?? '';
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    final prompt = _promptController.text.trim();
    if (prompt.isEmpty) return;
    if (_selectedStyle == null) return;

    final style = _visualStyles.firstWhere((s) => s.key == _selectedStyle);
    final fullPrompt = '${style.promptHint}\n\nCONTENT: $prompt';

    setState(() {
      _isGenerating = true;
      _generationError = null;
      _stage = VisualGenerationStage.analyzing;
    });

    await _advanceStage(VisualGenerationStage.generatingScene, 400);

    final result = await AIVisualGenerator.generate(prompt: fullPrompt);

    if (!mounted) return;

    if (result.isSuccess) {
      await _advanceStage(VisualGenerationStage.done, 200);

      widget.onChanged(result.spec!);
      setState(() {
        _isGenerating = false;
        _stage = VisualGenerationStage.idle;
      });
    } else {
      setState(() {
        _isGenerating = false;
        _stage = VisualGenerationStage.error;
        _generationError = result.error;
      });
    }
  }

  Future<void> _advanceStage(VisualGenerationStage stage, int delayMs) async {
    if (!mounted) return;
    setState(() => _stage = stage);
    await Future.delayed(Duration(milliseconds: delayMs));
  }

  @override
  Widget build(BuildContext context) {
    final isZh = widget.t.isZh;
    final content = widget.content;
    final hasSaved = content.legacyCustomHtml != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PropertySection(
          title: isZh ? 'AI 生成' : 'AI Generation',
          children: [
            // ── Style picker ──────────────────────────────────────────
            Text(
              isZh ? '选择风格（必选）' : 'Pick a style (required)',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral600,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
              childAspectRatio: 2.8,
              children: _visualStyles.map((style) {
                final isSelected = _selectedStyle == style.key;
                return GestureDetector(
                  onTap: _isGenerating
                      ? null
                      : () => setState(() => _selectedStyle = style.key),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary500
                          : AppColors.neutral100,
                      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary500
                            : AppColors.neutral200,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(style.emoji,
                            style: const TextStyle(fontSize: 13)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            isZh ? style.nameZh : style.nameEn,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.neutral700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Prompt input ──────────────────────────────────────────
            TextFormField(
              controller: _promptController,
              decoration: InputDecoration(
                hintText:
                    isZh
                        ? '描述你想要的交互可视化，例如：演示理想气体定律 PV=nRT...'
                        : 'Describe the simulation, e.g.: Show how PV=nRT works for ideal gas...',
                hintStyle: const TextStyle(
                  color: AppColors.neutral400,
                  fontSize: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  borderSide: const BorderSide(color: AppColors.neutral200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  borderSide: const BorderSide(color: AppColors.neutral200),
                ),
                contentPadding: const EdgeInsets.all(AppSpacing.sm),
              ),
              style: const TextStyle(fontSize: 12),
              maxLines: 3,
              minLines: 2,
              enabled: !_isGenerating,
            ),
            const SizedBox(height: AppSpacing.sm),

            // Stage indicator (shown during generation)
            if (_isGenerating) ...[
              _buildStageIndicator(isZh),
              const SizedBox(height: AppSpacing.sm),
            ],

            // Error
            if (_generationError != null && !_isGenerating) ...[
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3F0),
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(color: const Color(0xFFFFCDD2)),
                ),
                child: Text(
                  _generationError!,
                  style: const TextStyle(
                    color: Color(0xFFB71C1C),
                    fontSize: 11,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // "Select a style first" nudge
            if (_selectedStyle == null && !_isGenerating) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(color: const Color(0xFFFFE082)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.palette_outlined,
                        size: 13, color: Color(0xFFF57F17)),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        isZh ? '请先选择一个风格' : 'Select a style above first',
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFFF57F17)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // Generate / Regenerate button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: (_isGenerating || _selectedStyle == null)
                    ? null
                    : _generate,
                icon: _isGenerating
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.auto_awesome, size: 14),
                label: Text(
                  _isGenerating
                      ? (isZh ? '生成中...' : 'Generating...')
                      : (hasSaved
                          ? (isZh ? '重新生成' : 'Regenerate')
                          : (isZh ? 'AI 生成' : 'Generate')),
                  style: const TextStyle(fontSize: 12),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.neutral200,
                  disabledForegroundColor: AppColors.neutral400,
                  padding:
                      const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  ),
                ),
              ),
            ),
          ],
        ),

        // Advanced: show spec JSON
        const SizedBox(height: AppSpacing.sm),
        GestureDetector(
          onTap: () => setState(() => _showAdvanced = !_showAdvanced),
          child: Row(
            children: [
              Icon(
                _showAdvanced ? Icons.expand_less : Icons.expand_more,
                size: 16,
                color: AppColors.neutral400,
              ),
              const SizedBox(width: 4),
              Text(
                isZh ? '高级 / 查看 Spec JSON' : 'Advanced / View Spec JSON',
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),
            ],
          ),
        ),
        if (_showAdvanced) ...[
          const SizedBox(height: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: const Color(0xFF161B22),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            ),
            child: SelectableText(
              const JsonEncoder.withIndent('  ').convert(content.toJson()),
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 10,
                color: Color(0xFF8B949E),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStageIndicator(bool isZh) {
    final stages = [
      VisualGenerationStage.analyzing,
      VisualGenerationStage.generatingScene,
    ];
    final currentIdx = stages.indexOf(_stage);
    final msg = _stageMessages[_stage];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isZh ? (msg?.$2 ?? '') : (msg?.$1 ?? ''),
          style: const TextStyle(fontSize: 11, color: AppColors.primary500),
        ),
        const SizedBox(height: 6),
        Row(
          children:
              stages.asMap().entries.map((e) {
                final done = e.key < currentIdx;
                final active = e.key == currentIdx;
                return Expanded(
                  child: Container(
                    height: 3,
                    margin: const EdgeInsets.only(right: 3),
                    decoration: BoxDecoration(
                      color:
                          done
                              ? AppColors.primary500
                              : active
                              ? AppColors.primary400
                              : AppColors.neutral200,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }).toList(),
        ),
      ],
    );
  }
}
