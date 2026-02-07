import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';
import '../../models/block.dart';
import '../../services/code_runner.dart';

/// Code Playground widget - runnable code editor
class CodePlaygroundWidget extends StatefulWidget {
  final CodePlaygroundContent content;
  final ValueChanged<String>? onCodeChanged;

  const CodePlaygroundWidget({
    super.key,
    required this.content,
    this.onCodeChanged,
  });

  @override
  State<CodePlaygroundWidget> createState() => _CodePlaygroundWidgetState();
}

class _CodePlaygroundWidgetState extends State<CodePlaygroundWidget> {
  late TextEditingController _codeController;
  String _output = '';
  bool _isRunning = false;
  bool _hasRun = false;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.content.initialCode);
  }

  @override
  void didUpdateWidget(covariant CodePlaygroundWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.content.initialCode != widget.content.initialCode) {
      _codeController.text = widget.content.initialCode;
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _runCode() async {
    setState(() {
      _isRunning = true;
      _output = '';
    });

    final result = await CodeRunner.instance.runCode(
      _codeController.text,
      language: widget.content.language,
    );

    setState(() {
      _isRunning = false;
      _hasRun = true;
      _output = result.success ? result.output : (result.error ?? 'Run error');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Code editor area
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.neutral800,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header toolbar
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: const BoxDecoration(
                  color: AppColors.neutral700,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(AppBorderRadius.sm),
                    topRight: Radius.circular(AppBorderRadius.sm),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.neutral600,
                        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                      ),
                      child: Text(
                        widget.content.language,
                        style: const TextStyle(
                          fontSize: AppFontSize.xs,
                          color: AppColors.neutral300,
                        ),
                      ),
                    ),
                    const Spacer(),
                    // Run button
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _isRunning ? null : _runCode,
                        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _isRunning
                                ? AppColors.neutral600
                                : AppColors.success,
                            borderRadius:
                                BorderRadius.circular(AppBorderRadius.sm),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (_isRunning)
                                const SizedBox(
                                  width: 12,
                                  height: 12,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              else
                                const Icon(Icons.play_arrow,
                                    size: 14, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(
                                _isRunning ? 'Running...' : 'Run',
                                style: const TextStyle(
                                  fontSize: AppFontSize.xs,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Code input area
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: TextField(
                  controller: _codeController,
                  maxLines: 8,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral100,
                  ),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    filled: true,
                    fillColor: AppColors.neutral800,
                    contentPadding: EdgeInsets.zero,
                    hintText: '# Enter code here',
                    hintStyle: const TextStyle(
                      color: AppColors.neutral500,
                      fontFamily: 'monospace',
                    ),
                  ),
                  onChanged: widget.onCodeChanged,
                ),
              ),
            ],
          ),
        ),

        // Output area
        if (_hasRun) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral100,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.terminal,
                        size: 14, color: AppColors.neutral500),
                    const SizedBox(width: AppSpacing.xs),
                    const Text(
                      'Output',
                      style: TextStyle(
                        fontSize: AppFontSize.xs,
                        fontWeight: FontWeight.w500,
                        color: AppColors.neutral500,
                      ),
                    ),
                    const Spacer(),
                    // Check if output matches expected
                    if (widget.content.expectedOutput != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: _output == widget.content.expectedOutput
                              ? AppColors.success
                              : AppColors.warning,
                          borderRadius:
                              BorderRadius.circular(AppBorderRadius.sm),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _output == widget.content.expectedOutput
                                  ? Icons.check
                                  : Icons.info_outline,
                              size: 12,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              _output == widget.content.expectedOutput
                                  ? 'Correct'
                                  : 'Try again',
                              style: const TextStyle(
                                fontSize: AppFontSize.xs,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  _output,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral700,
                  ),
                ),
              ],
            ),
          ),
        ],

        // Hints
        if (widget.content.hints.isNotEmpty && !_hasRun) ...[
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              const Icon(Icons.lightbulb_outline,
                  size: 14, color: AppColors.warning),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  'Hint: ${widget.content.hints.first}',
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral500,
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
