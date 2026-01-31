import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../services/ai_course_generator.dart';
import '../models/course.dart';

/// AI 课程生成对话框
class AIGenerateDialog extends StatefulWidget {
  final Function(Course course) onCourseGenerated;

  const AIGenerateDialog({
    super.key,
    required this.onCourseGenerated,
  });

  @override
  State<AIGenerateDialog> createState() => _AIGenerateDialogState();
}

class _AIGenerateDialogState extends State<AIGenerateDialog> {
  final _apiKeyController = TextEditingController();
  String? _fileName;
  bool _isLoading = false;
  String? _errorMessage;
  String? _statusMessage;
  double _progress = 0;

  // PDF 数据
  dynamic _pdfBytes;
  String? _pdfFileName;

  @override
  void initState() {
    super.initState();
    // 恢复已保存的 API Key
    final savedKey = AICourseGenerator.apiKey;
    if (savedKey != null) {
      _apiKeyController.text = savedKey;
    }
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
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
            // 标题栏
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
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Course Generator',
                        style: TextStyle(
                          fontSize: AppFontSize.lg,
                          fontWeight: FontWeight.w600,
                          color: AppColors.neutral800,
                        ),
                      ),
                      Text(
                        'Upload a PDF and generate an interactive course',
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

            // API Key 输入
            const Text(
              'Gemini API Key',
              style: TextStyle(
                fontSize: AppFontSize.sm,
                fontWeight: FontWeight.w500,
                color: AppColors.neutral700,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _apiKeyController,
              obscureText: true,
              enabled: !_isLoading,
              decoration: InputDecoration(
                hintText: 'Enter your Gemini API key',
                prefixIcon: const Icon(Icons.key, size: 20),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.info_outline, size: 18),
                  onPressed: () => _showApiKeyHelp(context),
                  tooltip: 'Get API key',
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // PDF 上传区域
            const Text(
              'PDF',
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
                      _pdfFileName ?? 'Click to choose a PDF file',
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
                      const Text(
                        'PDF only. Recommended file size < 10MB',
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

            // 错误信息
            if (_errorMessage != null) ...[
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        size: 20, color: AppColors.error),
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

            // 状态信息
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
                            valueColor: AlwaysStoppedAnimation(AppColors.primary500),
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
                        valueColor:
                            const AlwaysStoppedAnimation(AppColors.primary500),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.lg),

            // 操作按钮
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _isLoading ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
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
                            valueColor:
                                AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : const Icon(Icons.auto_awesome, size: 18),
                  label: Text(_isLoading ? 'Generating...' : 'Generate'),
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
    return !_isLoading &&
        _apiKeyController.text.isNotEmpty &&
        _pdfBytes != null;
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
      _statusMessage = 'Uploading PDF...';
      _progress = 0.1;
    });

    // 保存 API Key
    AICourseGenerator.setApiKey(_apiKeyController.text);

    setState(() {
      _statusMessage = 'AI is analyzing the document...';
      _progress = 0.3;
    });

    // 调用 AI 生成
    final result = await AICourseGenerator.generateFromPdf(
      pdfBytes: _pdfBytes,
      fileName: _pdfFileName!,
    );

    setState(() {
      _progress = 0.9;
      _statusMessage = 'Parsing course structure...';
    });

    if (result.success && result.course != null) {
      setState(() {
        _progress = 1.0;
        _statusMessage = 'Course generated!';
      });

      // 延迟关闭，让用户看到成功状态
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

  void _showApiKeyHelp(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Get Gemini API key'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('1. Visit Google AI Studio:'),
            SizedBox(height: AppSpacing.xs),
            SelectableText(
              'https://aistudio.google.com/apikey',
              style: TextStyle(
                color: AppColors.primary500,
                fontSize: AppFontSize.sm,
              ),
            ),
            SizedBox(height: AppSpacing.md),
            Text('2. Sign in with your Google account'),
            SizedBox(height: AppSpacing.xs),
            Text('3. Click "Create API Key"'),
            SizedBox(height: AppSpacing.xs),
            Text('4. Copy the key and paste it above'),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}
