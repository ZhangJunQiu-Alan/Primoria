import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../theme/design_tokens.dart';
import '../services/ai_course_generator.dart';
import '../models/course.dart';

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
  String? _errorMessage;
  String? _statusMessage;
  double _progress = 0;

  // PDF data
  dynamic _pdfBytes;
  String? _pdfFileName;

  String _tr(String zh, String en) {
    return widget.t.isZh ? zh : en;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
      ),
      child: Container(
        width: 500,
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
                          '上传 PDF 并生成单课时课程（最多 20 个模块）',
                          'Upload a PDF and generate a one-lesson course (max 20 blocks)',
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

            // PDF upload area
            Text(
              _tr('PDF 文件', 'PDF'),
              style: TextStyle(
                fontSize: AppFontSize.sm,
                fontWeight: FontWeight.w500,
                color: AppColors.neutral700,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            InkWell(
              onTap: _isLoading ? null : _pickPdf,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: _pdfBytes != null
                      ? AppColors.secondary50
                      : AppColors.neutral50,
                  borderRadius: BorderRadius.circular(AppBorderRadius.md),
                  border: Border.all(
                    color: _pdfBytes != null
                        ? AppColors.secondary300
                        : AppColors.neutral200,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _pdfBytes != null
                          ? Icons.check_circle
                          : Icons.upload_file,
                      size: 40,
                      color: _pdfBytes != null
                          ? AppColors.secondary500
                          : AppColors.neutral400,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      _pdfFileName ??
                          _tr('点击选择 PDF 文件', 'Click to choose a PDF file'),
                      style: TextStyle(
                        fontSize: AppFontSize.sm,
                        color: _pdfBytes != null
                            ? AppColors.secondary700
                            : AppColors.neutral500,
                        fontWeight: _pdfBytes != null
                            ? FontWeight.w500
                            : FontWeight.normal,
                      ),
                    ),
                    if (_pdfBytes == null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        _tr(
                          '仅支持 PDF，建议小于 10MB',
                          'PDF only. Recommended file size < 10MB',
                        ),
                        style: TextStyle(
                          fontSize: AppFontSize.xs,
                          color: AppColors.neutral400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
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
            ],

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
          ],
        ),
      ),
    );
  }

  bool _canGenerate() {
    return !_isLoading && _pdfBytes != null;
  }

  Future<void> _pickPdf() async {
    setState(() {
      _errorMessage = null;
    });

    final result = await AICourseGenerator.pickPdfFile();

    if (result.success && result.bytes != null) {
      setState(() {
        _pdfBytes = result.bytes;
        _pdfFileName = result.fileName;
      });
    } else if (result.message != 'No file selected') {
      setState(() {
        _errorMessage = result.message;
      });
    }
  }

  Future<void> _generateCourse() async {
    if (!_canGenerate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusMessage = _tr('正在上传 PDF...', 'Uploading PDF...');
      _progress = 0.1;
    });

    setState(() {
      _statusMessage = _tr('AI 正在分析文档...', 'AI is analyzing the document...');
      _progress = 0.3;
    });

    // Call AI generation
    final result = await AICourseGenerator.generateFromPdfViaApi(
      pdfBytes: _pdfBytes,
      fileName: _pdfFileName!,
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

      // Delay close so user can see success state
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
