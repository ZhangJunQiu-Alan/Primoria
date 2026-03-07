import 'dart:convert';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/design_tokens.dart';
import 'app_dropdown.dart';

class CodeExecutionContentEditor extends StatelessWidget {
  final CodeExecutionContent content;
  final ValueChanged<CodeExecutionContent> onChanged;

  const CodeExecutionContentEditor({
    super.key,
    required this.content,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final traceSteps = content.traceSteps;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Code Execution',
          style: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral700,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.title,
          decoration: const InputDecoration(
            labelText: 'Title',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) => onChanged(content.copyWith(title: value)),
        ),
        const SizedBox(height: AppSpacing.sm),
        AppDropdown<String>(
          value: content.language,
          labelText: 'Language',
          items: const [
            AppDropdownItem(value: 'python', label: 'Python'),
            AppDropdownItem(value: 'javascript', label: 'JavaScript'),
            AppDropdownItem(value: 'dart', label: 'Dart'),
            AppDropdownItem(value: 'java', label: 'Java'),
            AppDropdownItem(value: 'cpp', label: 'C++'),
          ],
          onChanged: (value) {
            if (value == null) return;
            onChanged(content.copyWith(language: value));
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.sourceCode,
          maxLines: 8,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
          decoration: const InputDecoration(
            labelText: 'Source Code',
            hintText: 'Add source code with line breaks',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) => onChanged(content.copyWith(sourceCode: value)),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            const Expanded(
              child: Text(
                'Step Duration',
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            Text(
              '${content.controls.stepDurationMs} ms',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
        ),
        Slider(
          value: content.controls.stepDurationMs.toDouble(),
          min: 200,
          max: 10000,
          divisions: 98,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                controls: content.controls.copyWith(
                  stepDurationMs: value.round(),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.xs),
        AppDropdown<String>(
          value: content.style.theme,
          labelText: 'Theme',
          items: const [
            AppDropdownItem(value: 'indigo', label: 'Indigo'),
            AppDropdownItem(value: 'emerald', label: 'Emerald'),
            AppDropdownItem(value: 'amber', label: 'Amber'),
            AppDropdownItem(value: 'slate', label: 'Slate'),
          ],
          onChanged: (value) {
            if (value == null) return;
            onChanged(
              content.copyWith(style: content.style.copyWith(theme: value)),
            );
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        _buildBoolSwitch(
          label: 'Autoplay',
          value: content.controls.autoplay,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                controls: content.controls.copyWith(autoplay: value),
              ),
            );
          },
        ),
        _buildBoolSwitch(
          label: 'Allow scrub',
          value: content.controls.allowScrub,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                controls: content.controls.copyWith(allowScrub: value),
              ),
            );
          },
        ),
        _buildBoolSwitch(
          label: 'Show line numbers',
          value: content.style.showLineNumbers,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                style: content.style.copyWith(showLineNumbers: value),
              ),
            );
          },
        ),
        _buildBoolSwitch(
          label: 'Show variables panel',
          value: content.style.showVariablesPanel,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                style: content.style.copyWith(showVariablesPanel: value),
              ),
            );
          },
        ),
        _buildBoolSwitch(
          label: 'Show stdout panel',
          value: content.style.showStdoutPanel,
          onChanged: (value) {
            onChanged(
              content.copyWith(
                style: content.style.copyWith(showStdoutPanel: value),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        _buildTraceStepsSection(traceSteps),
        const SizedBox(height: AppSpacing.lg),
        _buildCheckpointsSection(traceSteps.length),
      ],
    );
  }

  Widget _buildBoolSwitch({
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
          ),
          Switch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }

  Widget _buildTraceStepsSection(List<CodeExecutionTraceStep> steps) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Trace Steps',
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Add trace step',
              onPressed: () {
                final next = [
                  ...steps,
                  const CodeExecutionTraceStep(line: 1, variables: {}),
                ];
                onChanged(content.copyWith(traceSteps: next));
              },
            ),
          ],
        ),
        if (steps.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: const Text(
              'Add source code and first trace step',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...steps.asMap().entries.map((entry) {
            final index = entry.key;
            final step = entry.value;
            final callStackText = (step.callStack ?? const <String>[]).join(', ');
            final variablesText = jsonEncode(step.variables);

            return Card(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Step ${index + 1}',
                            style: const TextStyle(
                              fontSize: AppFontSize.xs,
                              fontWeight: FontWeight.w700,
                              color: AppColors.neutral700,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.remove_circle_outline,
                            size: 20,
                            color: AppColors.error,
                          ),
                          visualDensity: VisualDensity.compact,
                          onPressed: steps.length <= 1
                              ? null
                              : () {
                                  final updated = [...steps]..removeAt(index);
                                  onChanged(
                                    content.copyWith(
                                      traceSteps: updated,
                                      checkpoints: _sanitizeCheckpoints(
                                        content.checkpoints,
                                        updated.length,
                                      ),
                                    ),
                                  );
                                },
                        ),
                      ],
                    ),
                    TextFormField(
                      initialValue: '${step.line}',
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Line Number (1-based)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final parsed = int.tryParse(value.trim());
                        if (parsed == null) return;
                        _updateStep(index, step.copyWith(line: parsed));
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: step.stdoutDelta ?? '',
                      decoration: const InputDecoration(
                        labelText: 'stdoutDelta (optional)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        _updateStep(
                          index,
                          step.copyWith(
                            stdoutDelta: value.isEmpty ? null : value,
                            clearStdoutDelta: value.isEmpty,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: variablesText,
                      decoration: const InputDecoration(
                        labelText: 'Variables JSON',
                        hintText: '{"x": 1, "name": "demo"}',
                        helperText: 'Only valid JSON object will be applied',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final parsed = _tryParseJsonMap(value);
                        if (parsed == null) return;
                        _updateStep(index, step.copyWith(variables: parsed));
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: callStackText,
                      decoration: const InputDecoration(
                        labelText: 'Call Stack (comma separated)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final parsed = _parseCommaList(value);
                        _updateStep(
                          index,
                          step.copyWith(
                            callStack: parsed.isEmpty ? null : parsed,
                            clearCallStack: parsed.isEmpty,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: step.note ?? '',
                      decoration: const InputDecoration(
                        labelText: 'Teaching Note (optional)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        _updateStep(
                          index,
                          step.copyWith(
                            note: value.isEmpty ? null : value,
                            clearNote: value.isEmpty,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCheckpointsSection(int stepCount) {
    final checkpoints = content.checkpoints;
    final stepIndexes = List<int>.generate(stepCount, (i) => i);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Checkpoints',
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Add checkpoint',
              onPressed: stepCount == 0
                  ? null
                  : () {
                      final next = [
                        ...checkpoints,
                        const CodeExecutionCheckpoint(
                          stepIndex: 0,
                          question: 'What happens next?',
                          options: ['Option A', 'Option B'],
                          correctIndex: 0,
                        ),
                      ];
                      onChanged(content.copyWith(checkpoints: next));
                    },
            ),
          ],
        ),
        if (checkpoints.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: const Text(
              'Optional: add checkpoint questions for learner prediction.',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...checkpoints.asMap().entries.map((entry) {
            final index = entry.key;
            final checkpoint = entry.value;
            final optionsText = checkpoint.options.join(', ');
            final validStepIndex = stepCount == 0
                ? 0
                : checkpoint.stepIndex.clamp(0, stepCount - 1);
            final maxCorrectIndex = checkpoint.options.isEmpty
                ? 0
                : checkpoint.options.length - 1;
            final validCorrectIndex = checkpoint.correctIndex.clamp(
              0,
              maxCorrectIndex,
            );

            return Card(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Checkpoint ${index + 1}',
                            style: const TextStyle(
                              fontSize: AppFontSize.xs,
                              fontWeight: FontWeight.w700,
                              color: AppColors.neutral700,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.remove_circle_outline,
                            size: 20,
                            color: AppColors.error,
                          ),
                          visualDensity: VisualDensity.compact,
                          onPressed: () {
                            final updated = [...checkpoints]..removeAt(index);
                            onChanged(content.copyWith(checkpoints: updated));
                          },
                        ),
                      ],
                    ),
                    AppDropdown<int>(
                      value: stepCount == 0 ? null : validStepIndex,
                      labelText: 'Trigger Step',
                      isDense: true,
                      items: stepIndexes
                          .map(
                            (stepIndex) => AppDropdownItem<int>(
                              value: stepIndex,
                              label: 'Step ${stepIndex + 1}',
                            ),
                          )
                          .toList(),
                      onChanged: stepCount == 0
                          ? null
                          : (value) {
                              if (value == null) return;
                              _updateCheckpoint(
                                index,
                                checkpoint.copyWith(stepIndex: value),
                              );
                            },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: checkpoint.question,
                      decoration: const InputDecoration(
                        labelText: 'Question',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        _updateCheckpoint(
                          index,
                          checkpoint.copyWith(question: value),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: optionsText,
                      decoration: const InputDecoration(
                        labelText: 'Options (comma separated)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final options = _parseCommaList(value);
                        final adjustedIndex = options.isEmpty
                            ? 0
                            : validCorrectIndex.clamp(0, options.length - 1);
                        _updateCheckpoint(
                          index,
                          checkpoint.copyWith(
                            options: options,
                            correctIndex: adjustedIndex,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppDropdown<int>(
                      value: checkpoint.options.isEmpty ? null : validCorrectIndex,
                      labelText: 'Correct Option Index',
                      isDense: true,
                      items: checkpoint.options.isEmpty
                          ? const []
                          : List.generate(
                              checkpoint.options.length,
                              (optionIndex) => AppDropdownItem<int>(
                                value: optionIndex,
                                label: 'Option ${optionIndex + 1}',
                              ),
                            ),
                      onChanged: checkpoint.options.isEmpty
                          ? null
                          : (value) {
                              if (value == null) return;
                              _updateCheckpoint(
                                index,
                                checkpoint.copyWith(correctIndex: value),
                              );
                            },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: checkpoint.explanation ?? '',
                      decoration: const InputDecoration(
                        labelText: 'Explanation (optional)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        _updateCheckpoint(
                          index,
                          checkpoint.copyWith(
                            explanation: value.isEmpty ? null : value,
                            clearExplanation: value.isEmpty,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  void _updateStep(int index, CodeExecutionTraceStep updated) {
    final next = [...content.traceSteps];
    next[index] = updated;
    onChanged(content.copyWith(traceSteps: next));
  }

  void _updateCheckpoint(int index, CodeExecutionCheckpoint updated) {
    final next = [...content.checkpoints];
    next[index] = updated;
    onChanged(content.copyWith(checkpoints: next));
  }

  Map<String, dynamic>? _tryParseJsonMap(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return {};

    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is! Map) return null;
      return Map<String, dynamic>.from(decoded);
    } catch (_) {
      return null;
    }
  }

  List<String> _parseCommaList(String raw) {
    return raw
        .split(',')
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
  }

  List<CodeExecutionCheckpoint> _sanitizeCheckpoints(
    List<CodeExecutionCheckpoint> checkpoints,
    int stepCount,
  ) {
    if (stepCount <= 0) return const [];
    return checkpoints
        .where((checkpoint) => checkpoint.stepIndex < stepCount)
        .toList();
  }
}
