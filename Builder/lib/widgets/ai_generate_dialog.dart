import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/course.dart';
import '../services/ai_course_generator.dart';
import '../services/ai_global_drop_listener.dart';
import '../services/file_picker.dart';
import '../theme/design_tokens.dart';

/// AI course generation dialog
class AIGenerateDialog extends StatefulWidget {
  final BuilderLocalizations t;
  final Function(Course course) onCourseGenerated;

  const AIGenerateDialog({
    super.key,
    required this.t,
    required this.onCourseGenerated,
  });

  @override
  State<AIGenerateDialog> createState() => _AIGenerateDialogState();
}

class _AIGenerateDialogState extends State<AIGenerateDialog> {
  bool _isLoading = false;
  bool _isDragHovering = false;
  String? _errorMessage;
  String? _statusMessage;
  double _progress = 0;

  final List<SourceFilePickResult> _sourceFiles = <SourceFilePickResult>[];
  final TextEditingController _urlController = TextEditingController();
  late final AIGlobalDropListener _dropListener;

  String _tr(String zh, String en) {
    return widget.t.isZh ? zh : en;
  }

  @override
  void initState() {
    super.initState();
    _dropListener = AIGlobalDropListener(
      onFilesDropped: _handleDroppedFiles,
      onDragStateChanged: (hovering) {
        if (!mounted || _isLoading) return;
        setState(() => _isDragHovering = hovering);
      },
    );
    _dropListener.start();
  }

  @override
  void dispose() {
    _dropListener.dispose();
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 560,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.accent100,
                      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: AppColors.accent600,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _tr('AI 课程生成器', 'AI Course Generator'),
                          style: TextStyle(
                            fontSize: AppFontSize.lg,
                            fontWeight: FontWeight.w600,
                            color: AppColors.neutral800,
                          ),
                        ),
                        Text(
                          _tr(
                            '上传文件或粘贴链接，生成单课时课程（最多 20 个模块）',
                            'Drop files or paste links to generate a one-lesson course (max 20 blocks)',
                          ),
                          style: TextStyle(
                            fontSize: AppFontSize.sm,
                            color: AppColors.neutral500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                    style: IconButton.styleFrom(
                      foregroundColor: AppColors.neutral400,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.lg),
              const Divider(),
              const SizedBox(height: AppSpacing.lg),

              // Source files upload area
              Text(
                _tr('素材文件', 'Source files'),
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w500,
                  color: AppColors.neutral700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Stack(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: _sourceFiles.isNotEmpty
                          ? AppColors.secondary50
                          : AppColors.neutral50,
                      borderRadius: BorderRadius.circular(AppBorderRadius.md),
                      border: Border.all(
                        color: _isDragHovering
                            ? AppColors.primary500
                            : _sourceFiles.isNotEmpty
                            ? AppColors.secondary300
                            : AppColors.neutral200,
                        width: _isDragHovering ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          _sourceFiles.isNotEmpty
                              ? Icons.playlist_add_check_circle
                              : Icons.cloud_upload_outlined,
                          size: 40,
                          color: _sourceFiles.isNotEmpty
                              ? AppColors.secondary500
                              : AppColors.neutral400,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          _sourceFiles.isEmpty
                              ? _tr('点击或拖拽文件到此处', 'Click or drag files here')
                              : _tr(
                                  '已选择 ${_sourceFiles.length} 个文件',
                                  '${_sourceFiles.length} file(s) selected',
                                ),
                          style: TextStyle(
                            fontSize: AppFontSize.sm,
                            color: _sourceFiles.isNotEmpty
                                ? AppColors.secondary700
                                : AppColors.neutral500,
                            fontWeight: _sourceFiles.isNotEmpty
                                ? FontWeight.w500
                                : FontWeight.normal,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          _tr(
                            '支持 JPEG/PNG/TIFF/GIF、PDF、Word、PPT、Excel',
                            'Supports JPEG/PNG/TIFF/GIF, PDF, Word, PPT, Excel',
                          ),
                          style: TextStyle(
                            fontSize: AppFontSize.xs,
                            color: AppColors.neutral400,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        OutlinedButton.icon(
                          onPressed: _isLoading ? null : _pickSourceFiles,
                          icon: const Icon(Icons.attach_file, size: 16),
                          label: Text(_tr('浏览文件', 'Browse files')),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.neutral700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              if (_sourceFiles.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: _sourceFiles
                      .asMap()
                      .entries
                      .map(
                        (entry) => Chip(
                          avatar: Icon(
                            _iconForFile(
                              entry.value.fileName,
                              entry.value.mimeType,
                            ),
                            size: 16,
                            color: AppColors.neutral600,
                          ),
                          label: Text(
                            '${entry.value.fileName} (${_formatFileSize(entry.value.sizeBytes)})',
                            overflow: TextOverflow.ellipsis,
                          ),
                          onDeleted: _isLoading
                              ? null
                              : () => _removeFileAt(entry.key),
                          deleteIconColor: AppColors.neutral500,
                        ),
                      )
                      .toList(),
                ),
              ],

              const SizedBox(height: AppSpacing.md),

              // URL links
              Text(
                _tr('参考链接', 'Reference links'),
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w500,
                  color: AppColors.neutral700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _urlController,
                enabled: !_isLoading,
                minLines: 2,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: _tr(
                    '粘贴图片/视频/文档 URL（每行一个）',
                    'Paste image/video/document URLs (one per line)',
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppBorderRadius.md),
                  ),
                  contentPadding: const EdgeInsets.all(AppSpacing.md),
                ),
                onChanged: (_) {
                  setState(() {
                    if (_errorMessage != null) _errorMessage = null;
                  });
                },
              ),

              const SizedBox(height: AppSpacing.xs),
              Text(
                _tr(
                  '输出策略：单页面、最多 20 个模块，自动选择适合课程的模块类型。',
                  'Output strategy: single page, up to 20 blocks, with course-appropriate block types.',
                ),
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),

              // Status message
              if (_statusMessage != null && _isLoading) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.primary50,
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(
                                AppColors.primary500,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              _statusMessage!,
                              style: const TextStyle(
                                fontSize: AppFontSize.sm,
                                color: AppColors.primary700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_progress > 0) ...[
                        const SizedBox(height: AppSpacing.sm),
                        LinearProgressIndicator(
                          value: _progress,
                          backgroundColor: AppColors.primary100,
                          valueColor: const AlwaysStoppedAnimation(
                            AppColors.primary500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.lg),

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    child: Text(_tr('取消', 'Cancel')),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  ElevatedButton.icon(
                    onPressed: _canGenerate() ? _generateCourse : null,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const Icon(Icons.auto_awesome, size: 18),
                    label: Text(
                      _isLoading
                          ? _tr('生成中...', 'Generating...')
                          : _tr('生成', 'Generate'),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent500,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.md,
                      ),
                    ),
                  ),
                ],
              ),

              // Error message
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 20,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            fontSize: AppFontSize.sm,
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconForFile(String fileName, String mimeType) {
    final lower = fileName.toLowerCase();
    if (mimeType.startsWith('image/') ||
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.tif') ||
        lower.endsWith('.tiff')) {
      return Icons.image_outlined;
    }
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf_outlined;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
      return Icons.description_outlined;
    }
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
      return Icons.slideshow_outlined;
    }
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
      return Icons.table_chart_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    final kb = bytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(1)} KB';
    final mb = kb / 1024;
    return '${mb.toStringAsFixed(1)} MB';
  }

  List<String> _parseUrls() {
    return _urlController.text
        .split(RegExp(r'[\n,]+'))
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
  }

  bool _canGenerate() {
    return !_isLoading && (_sourceFiles.isNotEmpty || _parseUrls().isNotEmpty);
  }

  Future<void> _pickSourceFiles() async {
    setState(() {
      _errorMessage = null;
    });

    final files = await AICourseGenerator.pickSourceFiles();
    if (files.isEmpty) {
      return;
    }

    _mergeSourceFiles(files);
  }

  Future<void> _handleDroppedFiles(List<FilePickResult> files) async {
    final mapped = <SourceFilePickResult>[];
    for (final file in files) {
      if (!file.success || file.bytes == null || file.fileName == null) {
        continue;
      }
      mapped.add(
        SourceFilePickResult(
          fileName: file.fileName!,
          bytes: file.bytes!,
          mimeType: (file.mimeType ?? 'application/octet-stream').trim(),
          sizeBytes: file.sizeBytes ?? file.bytes!.length,
        ),
      );
    }
    if (mapped.isEmpty) return;
    _mergeSourceFiles(mapped);
  }

  void _mergeSourceFiles(List<SourceFilePickResult> incoming) {
    final existingKeys = _sourceFiles
        .map((file) => '${file.fileName}|${file.sizeBytes}|${file.mimeType}')
        .toSet();

    var added = 0;
    for (final file in incoming) {
      final key = '${file.fileName}|${file.sizeBytes}|${file.mimeType}';
      if (existingKeys.contains(key)) {
        continue;
      }
      existingKeys.add(key);
      _sourceFiles.add(file);
      added += 1;
    }

    if (added > 0) {
      setState(() {
        _errorMessage = null;
      });
    }
  }

  void _removeFileAt(int index) {
    setState(() {
      _sourceFiles.removeAt(index);
    });
  }

  Future<void> _generateCourse() async {
    if (!_canGenerate()) return;

    final urls = _parseUrls();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusMessage = _tr('正在整理素材...', 'Preparing source materials...');
      _progress = 0.1;
    });

    setState(() {
      _statusMessage = _tr('AI 正在分析素材...', 'AI is analyzing your sources...');
      _progress = 0.35;
    });

    final result = await AICourseGenerator.generateFromSourcesViaApi(
      files: _sourceFiles,
      urls: urls,
    );

    setState(() {
      _progress = 0.9;
      _statusMessage = _tr('正在解析课程结构...', 'Parsing course structure...');
    });

    if (result.success && result.course != null) {
      setState(() {
        _progress = 1.0;
        _statusMessage = result.message;
      });

      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        Navigator.pop(context);
        widget.onCourseGenerated(result.course!);
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = result.message;
        _statusMessage = null;
        _progress = 0;
      });
    }
  }
}
