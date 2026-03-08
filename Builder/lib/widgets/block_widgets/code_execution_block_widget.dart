import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../models/models.dart';
import '../../theme/design_tokens.dart';

/// Visual + interactive renderer for `code-execution` blocks.
class CodeExecutionBlockWidget extends StatefulWidget {
  final CodeExecutionContent content;
  final bool showControls;
  final bool showHeader;
  final BuilderLocalizations? t;

  const CodeExecutionBlockWidget({
    super.key,
    required this.content,
    this.showControls = true,
    this.showHeader = true,
    this.t,
  });

  @override
  State<CodeExecutionBlockWidget> createState() =>
      _CodeExecutionBlockWidgetState();
}

class _CodeExecutionBlockWidgetState extends State<CodeExecutionBlockWidget> {
  Timer? _playTimer;

  int _currentStepIndex = -1;
  bool _isPlaying = false;
  late int _stepDurationMs;

  int? _selectedLine;
  int? _hoveredLine;

  int? _pendingCheckpointIndex;
  int? _selectedCheckpointOption;
  bool _checkpointSubmitted = false;
  bool? _checkpointCorrect;
  final Set<int> _completedCheckpointIndices = <int>{};

  String _tr(String zh, String en) => (widget.t?.isZh ?? false) ? zh : en;

  @override
  void initState() {
    super.initState();
    _stepDurationMs = _normalizeStepDuration(
      widget.content.controls.stepDurationMs,
    );

    if (widget.content.controls.autoplay && _traceSteps.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _advanceOneStep();
        _startPlayback();
      });
    }
  }

  @override
  void didUpdateWidget(covariant CodeExecutionBlockWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.content == widget.content) return;

    final maxIndex = _traceSteps.isEmpty ? -1 : _traceSteps.length - 1;
    if (_currentStepIndex > maxIndex) {
      _currentStepIndex = maxIndex;
    }

    if (_pendingCheckpointIndex != null &&
        _pendingCheckpointIndex! >= widget.content.checkpoints.length) {
      _clearCheckpointPrompt();
    }

    _completedCheckpointIndices.removeWhere(
      (index) => index >= widget.content.checkpoints.length,
    );

    _stepDurationMs = _normalizeStepDuration(
      widget.content.controls.stepDurationMs,
    );
    _syncCheckpointForCurrentStep();

    if (_traceSteps.isEmpty && _isPlaying) {
      _stopPlayback();
    }
  }

  @override
  void dispose() {
    _playTimer?.cancel();
    super.dispose();
  }

  List<String> get _sourceLines {
    if (widget.content.sourceCode.trim().isEmpty) return const [];
    return widget.content.sourceCode.split('\n');
  }

  List<CodeExecutionTraceStep> get _traceSteps => widget.content.traceSteps;

  CodeExecutionTraceStep? get _activeStep {
    if (_currentStepIndex < 0 || _currentStepIndex >= _traceSteps.length) {
      return null;
    }
    return _traceSteps[_currentStepIndex];
  }

  CodeExecutionCheckpoint? get _pendingCheckpoint {
    final pendingIndex = _pendingCheckpointIndex;
    if (pendingIndex == null ||
        pendingIndex < 0 ||
        pendingIndex >= widget.content.checkpoints.length) {
      return null;
    }
    return widget.content.checkpoints[pendingIndex];
  }

  bool get _hasBlockingCheckpoint =>
      _pendingCheckpoint != null && !_checkpointSubmitted;

  bool get _canStepBack =>
      widget.content.controls.allowScrub && _currentStepIndex >= 0;

  bool get _canStepForward {
    if (_traceSteps.isEmpty) return false;
    if (_hasBlockingCheckpoint) return false;
    return _currentStepIndex < _traceSteps.length - 1;
  }

  int _normalizeStepDuration(int value) {
    if (value < 200) return 200;
    if (value > 10000) return 10000;
    return value;
  }

  void _togglePlayPause() {
    if (_isPlaying) {
      _stopPlayback();
      return;
    }
    _startPlayback();
  }

  void _startPlayback() {
    if (_traceSteps.isEmpty || _hasBlockingCheckpoint) return;

    if (_currentStepIndex < 0) {
      _advanceOneStep();
      if (_hasBlockingCheckpoint) return;
    }

    setState(() {
      _isPlaying = true;
    });
    _scheduleNextTick();
  }

  void _stopPlayback() {
    _playTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _isPlaying = false;
    });
  }

  void _scheduleNextTick() {
    _playTimer?.cancel();
    if (!_isPlaying || !mounted) return;

    _playTimer = Timer(Duration(milliseconds: _stepDurationMs), () {
      if (!mounted || !_isPlaying) return;
      if (!_canStepForward) {
        _stopPlayback();
        return;
      }
      _advanceOneStep();
      if (_hasBlockingCheckpoint || !_canStepForward) {
        _stopPlayback();
        return;
      }
      _scheduleNextTick();
    });
  }

  void _advanceOneStep() {
    if (_traceSteps.isEmpty || _hasBlockingCheckpoint) return;

    final nextStep = _currentStepIndex < 0
        ? 0
        : (_currentStepIndex + 1).clamp(0, _traceSteps.length - 1);

    setState(() {
      _currentStepIndex = nextStep;
      _selectedLine = _traceSteps[nextStep].line;
      _syncCheckpointForCurrentStep();
    });
  }

  void _stepBack() {
    if (!_canStepBack) return;

    final next = (_currentStepIndex - 1).clamp(-1, _traceSteps.length - 1);
    setState(() {
      _currentStepIndex = next;
      if (_currentStepIndex >= 0) {
        _selectedLine = _traceSteps[_currentStepIndex].line;
      }
      _clearCheckpointPrompt();
      _syncCheckpointForCurrentStep();
    });
  }

  void _reset() {
    _playTimer?.cancel();
    setState(() {
      _isPlaying = false;
      _currentStepIndex = -1;
      _selectedLine = null;
      _hoveredLine = null;
      _clearCheckpointPrompt();
      _completedCheckpointIndices.clear();
    });
  }

  void _jumpToStep(double value) {
    if (_traceSteps.isEmpty || !widget.content.controls.allowScrub) return;

    final nextIndex = value.round().clamp(0, _traceSteps.length - 1);
    _playTimer?.cancel();
    setState(() {
      _isPlaying = false;
      _currentStepIndex = nextIndex;
      _selectedLine = _traceSteps[nextIndex].line;
      _clearCheckpointPrompt();
      _syncCheckpointForCurrentStep();
    });
  }

  void _syncCheckpointForCurrentStep() {
    if (_currentStepIndex < 0) {
      _clearCheckpointPrompt();
      return;
    }

    final nextPending = _nextUnresolvedCheckpoint(_currentStepIndex);
    if (nextPending == null) {
      _clearCheckpointPrompt();
      return;
    }

    _pendingCheckpointIndex = nextPending;
    _selectedCheckpointOption = null;
    _checkpointSubmitted = false;
    _checkpointCorrect = null;
    _isPlaying = false;
    _playTimer?.cancel();
  }

  int? _nextUnresolvedCheckpoint(int stepIndex) {
    for (int i = 0; i < widget.content.checkpoints.length; i++) {
      final checkpoint = widget.content.checkpoints[i];
      if (checkpoint.stepIndex == stepIndex &&
          !_completedCheckpointIndices.contains(i)) {
        return i;
      }
    }
    return null;
  }

  void _clearCheckpointPrompt() {
    _pendingCheckpointIndex = null;
    _selectedCheckpointOption = null;
    _checkpointSubmitted = false;
    _checkpointCorrect = null;
  }

  void _submitCheckpoint() {
    final checkpoint = _pendingCheckpoint;
    final checkpointIndex = _pendingCheckpointIndex;
    if (checkpoint == null || checkpointIndex == null) return;
    if (_selectedCheckpointOption == null) return;

    final isCorrect = _selectedCheckpointOption == checkpoint.correctIndex;
    setState(() {
      _checkpointSubmitted = true;
      _checkpointCorrect = isCorrect;
      _completedCheckpointIndices.add(checkpointIndex);
      _isPlaying = false;
      _playTimer?.cancel();
    });
  }

  void _continueAfterCheckpoint() {
    if (_pendingCheckpointIndex == null) return;

    setState(() {
      final next = _nextUnresolvedCheckpoint(_currentStepIndex);
      if (next == null) {
        _clearCheckpointPrompt();
      } else {
        _pendingCheckpointIndex = next;
        _selectedCheckpointOption = null;
        _checkpointSubmitted = false;
        _checkpointCorrect = null;
      }
    });
  }

  Map<String, dynamic> _variablesAtStep(int stepIndex) {
    final merged = <String, dynamic>{...widget.content.initialVariables};
    if (stepIndex < 0) return merged;

    final safeUpper = stepIndex.clamp(0, _traceSteps.length - 1);
    for (int i = 0; i <= safeUpper; i++) {
      merged.addAll(_traceSteps[i].variables);
    }
    return merged;
  }

  Set<String> _changedVariableKeys(int stepIndex) {
    if (stepIndex < 0) return const <String>{};

    final current = _variablesAtStep(stepIndex);
    final previous = stepIndex == 0
        ? <String, dynamic>{...widget.content.initialVariables}
        : _variablesAtStep(stepIndex - 1);

    final allKeys = <String>{...current.keys, ...previous.keys};
    final changed = <String>{};
    for (final key in allKeys) {
      final now = current[key];
      final before = previous[key];
      if (jsonEncode(now) != jsonEncode(before)) {
        changed.add(key);
      }
    }
    return changed;
  }

  String _stdoutAtStep(int stepIndex) {
    if (stepIndex < 0) return '';

    final buffer = StringBuffer();
    final safeUpper = stepIndex.clamp(0, _traceSteps.length - 1);
    for (int i = 0; i <= safeUpper; i++) {
      final delta = _traceSteps[i].stdoutDelta;
      if (delta == null || delta.isEmpty) continue;
      buffer.write(delta);
      if (!delta.endsWith('\n')) {
        buffer.write('\n');
      }
    }
    return buffer.toString().trimRight();
  }

  _CodeExecutionTheme _resolveTheme() {
    switch (widget.content.style.theme) {
      case 'emerald':
        return const _CodeExecutionTheme(
          accent: Color(0xFF059669),
          accentSoft: Color(0xFFD1FAE5),
          accentBorder: Color(0xFF6EE7B7),
        );
      case 'amber':
        return const _CodeExecutionTheme(
          accent: Color(0xFFD97706),
          accentSoft: Color(0xFFFFF3C4),
          accentBorder: Color(0xFFFCD34D),
        );
      case 'slate':
        return const _CodeExecutionTheme(
          accent: Color(0xFF334155),
          accentSoft: Color(0xFFE2E8F0),
          accentBorder: Color(0xFF94A3B8),
        );
      case 'indigo':
      default:
        return const _CodeExecutionTheme(
          accent: AppColors.primary600,
          accentSoft: Color(0xFFE0E7FF),
          accentBorder: Color(0xFFA5B4FC),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = _resolveTheme();
    final hasSource = _sourceLines.isNotEmpty;
    final hasTraceSteps = _traceSteps.isNotEmpty;
    final activeLine = _activeStep?.line;
    final activeVariables = _variablesAtStep(_currentStepIndex);
    final changedVariables = _changedVariableKeys(_currentStepIndex);
    final stdoutText = _stdoutAtStep(_currentStepIndex);

    final contentBody = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.showHeader)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.play_arrow_outlined, size: 16, color: theme.accent),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  widget.content.title.trim().isEmpty
                      ? _tr('代码执行', 'Code Execution')
                      : widget.content.title,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    fontWeight: FontWeight.w600,
                    color: AppColors.neutral700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: theme.accentSoft,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
                child: Text(
                  widget.content.language,
                  style: TextStyle(
                    fontSize: AppFontSize.xs,
                    color: theme.accent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '${_tr('步骤', 'Step')} ${_currentStepIndex >= 0 ? _currentStepIndex + 1 : 0}/${_traceSteps.length}',
                key: const Key('code_execution_step_indicator'),
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),
            ],
          ),
        if (widget.showHeader) const SizedBox(height: AppSpacing.sm),
        if (!hasSource || !hasTraceSteps)
          _buildEmptyState()
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 780;
              final variablesPanel = widget.content.style.showVariablesPanel
                  ? _buildVariablesPanel(
                      activeVariables,
                      changedVariables,
                      theme,
                    )
                  : const SizedBox.shrink();
              final stdoutPanel = widget.content.style.showStdoutPanel
                  ? _buildStdoutPanel(stdoutText)
                  : const SizedBox.shrink();
              final callStackPanel = _buildCallStackPanel(
                _activeStep?.callStack,
              );

              if (compact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildCodePanel(activeLine, theme),
                    if (widget.content.style.showVariablesPanel) ...[
                      const SizedBox(height: AppSpacing.sm),
                      variablesPanel,
                    ],
                    if (widget.content.style.showStdoutPanel) ...[
                      const SizedBox(height: AppSpacing.sm),
                      stdoutPanel,
                    ],
                    if (_activeStep?.callStack != null &&
                        _activeStep!.callStack!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.sm),
                      callStackPanel,
                    ],
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: _buildCodePanel(activeLine, theme)),
                  if (widget.content.style.showVariablesPanel ||
                      widget.content.style.showStdoutPanel ||
                      (_activeStep?.callStack?.isNotEmpty ?? false))
                    const SizedBox(width: AppSpacing.sm),
                  if (widget.content.style.showVariablesPanel ||
                      widget.content.style.showStdoutPanel ||
                      (_activeStep?.callStack?.isNotEmpty ?? false))
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (widget.content.style.showVariablesPanel)
                            variablesPanel,
                          if (widget.content.style.showVariablesPanel &&
                              widget.content.style.showStdoutPanel)
                            const SizedBox(height: AppSpacing.sm),
                          if (widget.content.style.showStdoutPanel) stdoutPanel,
                          if ((_activeStep?.callStack?.isNotEmpty ??
                              false)) ...[
                            const SizedBox(height: AppSpacing.sm),
                            callStackPanel,
                          ],
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        if (widget.showControls) ...[
          const SizedBox(height: AppSpacing.sm),
          _buildControlBar(theme),
        ],
        if (widget.showControls && widget.content.controls.allowScrub) ...[
          const SizedBox(height: AppSpacing.sm),
          _buildScrubBar(),
        ],
        if (_pendingCheckpoint != null) ...[
          const SizedBox(height: AppSpacing.sm),
          _buildCheckpointCard(theme),
        ],
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final shouldScroll = constraints.maxHeight.isFinite;
        final body = shouldScroll
            ? SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: constraints.maxWidth),
                  child: contentBody,
                ),
              )
            : contentBody;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.neutral50,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: body,
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Text(
        _tr('请先添加源码和第一步执行轨迹', 'Add source code and first trace step'),
        style: const TextStyle(
          fontSize: AppFontSize.sm,
          color: AppColors.neutral500,
        ),
      ),
    );
  }

  Widget _buildCodePanel(int? activeLine, _CodeExecutionTheme theme) {
    return Container(
      constraints: const BoxConstraints(minHeight: 220),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _sourceLines.asMap().entries.map((entry) {
            final lineNo = entry.key + 1;
            final lineText = entry.value;
            final isActive = lineNo == activeLine;
            final isSelected = lineNo == _selectedLine;
            final isHovered = lineNo == _hoveredLine;

            final bgColor = isActive
                ? theme.accentSoft
                : (isSelected
                      ? theme.accentSoft.withValues(alpha: 0.55)
                      : (isHovered
                            ? AppColors.neutral100
                            : Colors.transparent));
            final borderColor = isActive
                ? theme.accentBorder
                : Colors.transparent;

            return MouseRegion(
              onEnter: (_) {
                if (!mounted) return;
                setState(() {
                  _hoveredLine = lineNo;
                });
              },
              onExit: (_) {
                if (!mounted) return;
                setState(() {
                  if (_hoveredLine == lineNo) {
                    _hoveredLine = null;
                  }
                });
              },
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedLine = lineNo;
                  });
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 140),
                  key: Key('code_execution_line_$lineNo'),
                  margin: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs,
                    vertical: 1,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (widget.content.style.showLineNumbers)
                        SizedBox(
                          width: 34,
                          child: Text(
                            '$lineNo',
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              fontSize: AppFontSize.xs,
                              fontWeight: isActive
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              color: isActive
                                  ? theme.accent
                                  : AppColors.neutral400,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      if (widget.content.style.showLineNumbers)
                        const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          lineText.isEmpty ? ' ' : lineText,
                          style: TextStyle(
                            fontSize: AppFontSize.sm,
                            color: AppColors.neutral800,
                            height: 1.4,
                            fontFamily: 'monospace',
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildVariablesPanel(
    Map<String, dynamic> variables,
    Set<String> changedKeys,
    _CodeExecutionTheme theme,
  ) {
    return Container(
      key: const Key('code_execution_variables'),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('变量', 'Variables'),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral600,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          if (variables.isEmpty)
            Text(
              _tr('当前步骤没有变量。', 'No variables at this step.'),
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            )
          else
            ...variables.entries.map((entry) {
              final changed = changedKeys.contains(entry.key);
              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: changed
                      ? theme.accentSoft.withValues(alpha: 0.65)
                      : AppColors.neutral50,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(
                    color: changed ? theme.accentBorder : AppColors.neutral200,
                  ),
                ),
                child: Text(
                  '${entry.key} = ${_valueToDisplay(entry.value)}',
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral700,
                    fontFamily: 'monospace',
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildStdoutPanel(String stdoutText) {
    return Container(
      key: const Key('code_execution_stdout'),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('标准输出', 'Stdout'),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral600,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 56),
            padding: const EdgeInsets.all(AppSpacing.xs),
            decoration: BoxDecoration(
              color: AppColors.neutral900,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            ),
            child: Text(
              stdoutText.isEmpty
                  ? _tr('（暂无输出）', '(no output yet)')
                  : stdoutText,
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral100,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCallStackPanel(List<String>? callStack) {
    if (callStack == null || callStack.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('调用栈', 'Call Stack'),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral600,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: callStack
                .map(
                  (frame) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.neutral100,
                      borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                    ),
                    child: Text(
                      frame,
                      style: const TextStyle(
                        fontSize: AppFontSize.xs,
                        color: AppColors.neutral700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildControlBar(_CodeExecutionTheme theme) {
    final isAtInitial = _currentStepIndex < 0;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: [
              OutlinedButton.icon(
                key: const Key('code_execution_play'),
                onPressed: (_traceSteps.isEmpty || _hasBlockingCheckpoint)
                    ? null
                    : _togglePlayPause,
                icon: Icon(
                  _isPlaying ? Icons.pause_circle_outline : Icons.play_circle,
                  color: theme.accent,
                ),
                label: Text(
                  _isPlaying ? _tr('暂停', 'Pause') : _tr('播放', 'Play'),
                ),
              ),
              OutlinedButton.icon(
                key: const Key('code_execution_step'),
                onPressed: _canStepForward ? _advanceOneStep : null,
                icon: const Icon(Icons.skip_next),
                label: Text(_tr('前进', 'Step')),
              ),
              OutlinedButton.icon(
                key: const Key('code_execution_back'),
                onPressed: _canStepBack ? _stepBack : null,
                icon: const Icon(Icons.skip_previous),
                label: Text(_tr('后退', 'Back')),
              ),
              OutlinedButton.icon(
                key: const Key('code_execution_reset'),
                onPressed: (isAtInitial && _completedCheckpointIndices.isEmpty)
                    ? null
                    : _reset,
                icon: const Icon(Icons.restart_alt),
                label: Text(_tr('重置', 'Reset')),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Text(
                _tr('步进时长', 'Step Duration'),
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Slider(
                  value: _stepDurationMs.toDouble(),
                  min: 200,
                  max: 6000,
                  divisions: 58,
                  onChanged: (value) {
                    setState(() {
                      _stepDurationMs = _normalizeStepDuration(value.round());
                    });
                    if (_isPlaying) {
                      _scheduleNextTick();
                    }
                  },
                ),
              ),
              Text(
                widget.t?.isZh == true
                    ? '$_stepDurationMs 毫秒'
                    : '$_stepDurationMs ms',
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScrubBar() {
    if (_traceSteps.isEmpty) return const SizedBox.shrink();

    final sliderValue = _currentStepIndex < 0
        ? 0.0
        : _currentStepIndex.toDouble();
    final max = (_traceSteps.length - 1).toDouble();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('时间线', 'Timeline'),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
              fontWeight: FontWeight.w600,
            ),
          ),
          Slider(
            key: const Key('code_execution_scrub'),
            value: sliderValue.clamp(0.0, max),
            min: 0,
            max: max,
            divisions: _traceSteps.length > 1 ? _traceSteps.length - 1 : null,
            onChanged: (value) => _jumpToStep(value),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckpointCard(_CodeExecutionTheme theme) {
    final checkpoint = _pendingCheckpoint;
    if (checkpoint == null) return const SizedBox.shrink();

    final safeCorrectIndex = checkpoint.correctIndex.clamp(
      0,
      checkpoint.options.isEmpty ? 0 : checkpoint.options.length - 1,
    );

    return Container(
      key: const Key('code_execution_checkpoint'),
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: theme.accentSoft.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: theme.accentBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('检查点', 'Checkpoint'),
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            checkpoint.question,
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral800,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          ...checkpoint.options.asMap().entries.map((entry) {
            final index = entry.key;
            final option = entry.value;
            final selected = _selectedCheckpointOption == index;

            Color borderColor = AppColors.neutral300;
            Color bgColor = Colors.white;
            if (_checkpointSubmitted) {
              if (index == safeCorrectIndex) {
                borderColor = AppColors.success;
                bgColor = AppColors.success.withValues(alpha: 0.08);
              } else if (selected) {
                borderColor = AppColors.error;
                bgColor = AppColors.error.withValues(alpha: 0.08);
              }
            } else if (selected) {
              borderColor = theme.accent;
              bgColor = theme.accentSoft.withValues(alpha: 0.5);
            }

            return GestureDetector(
              key: Key('code_execution_checkpoint_option_$index'),
              onTap: _checkpointSubmitted
                  ? null
                  : () {
                      setState(() {
                        _selectedCheckpointOption = index;
                      });
                    },
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                padding: const EdgeInsets.all(AppSpacing.xs),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(color: borderColor),
                ),
                child: Text(
                  option,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    color: AppColors.neutral700,
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: AppSpacing.xs),
          if (!_checkpointSubmitted)
            FilledButton.icon(
              key: const Key('code_execution_checkpoint_submit'),
              onPressed: _selectedCheckpointOption == null
                  ? null
                  : _submitCheckpoint,
              style: FilledButton.styleFrom(backgroundColor: theme.accent),
              icon: const Icon(Icons.check_circle_outline),
              label: Text(_tr('提交', 'Submit')),
            )
          else
            Row(
              children: [
                Icon(
                  _checkpointCorrect == true
                      ? Icons.check_circle
                      : Icons.cancel,
                  size: 16,
                  color: _checkpointCorrect == true
                      ? AppColors.success
                      : AppColors.error,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    _checkpointCorrect == true
                        ? _tr('正确', 'Correct')
                        : _tr('错误', 'Incorrect'),
                    style: TextStyle(
                      fontSize: AppFontSize.sm,
                      fontWeight: FontWeight.w600,
                      color: _checkpointCorrect == true
                          ? AppColors.success
                          : AppColors.error,
                    ),
                  ),
                ),
                TextButton(
                  key: const Key('code_execution_checkpoint_continue'),
                  onPressed: _continueAfterCheckpoint,
                  child: Text(_tr('继续', 'Continue')),
                ),
              ],
            ),
          if (_checkpointSubmitted &&
              checkpoint.explanation != null &&
              checkpoint.explanation!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              checkpoint.explanation!,
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _valueToDisplay(dynamic value) {
    if (value == null) return 'null';
    if (value is String) return '"$value"';
    if (value is num || value is bool) return value.toString();
    try {
      return jsonEncode(value);
    } catch (_) {
      return value.toString();
    }
  }
}

class _CodeExecutionTheme {
  final Color accent;
  final Color accentSoft;
  final Color accentBorder;

  const _CodeExecutionTheme({
    required this.accent,
    required this.accentSoft,
    required this.accentBorder,
  });
}
