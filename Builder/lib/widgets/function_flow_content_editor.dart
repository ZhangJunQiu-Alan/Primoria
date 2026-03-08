import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/design_tokens.dart';
import 'app_dropdown.dart';

class FunctionFlowContentEditor extends StatelessWidget {
  final BuilderLocalizations t;
  final FunctionFlowContent content;
  final ValueChanged<FunctionFlowContent> onChanged;

  const FunctionFlowContentEditor({
    super.key,
    required this.t,
    required this.content,
    required this.onChanged,
  });

  String _tr(String zh, String en) {
    return t.isZh ? zh : en;
  }

  @override
  Widget build(BuildContext context) {
    final nodeIds = content.nodes.map((n) => n.id).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _tr('函数流程', 'Function Flow'),
          style: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral700,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          initialValue: content.title,
          decoration: InputDecoration(
            labelText: _tr('标题', 'Title'),
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            onChanged(content.copyWith(title: value));
          },
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: Text(
                _tr('步骤时长', 'Step Duration'),
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            Text(
              '${content.style.stepDurationMs} ms',
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
        ),
        Slider(
          value: content.style.stepDurationMs.toDouble(),
          min: 200,
          max: 8000,
          divisions: 78,
          label: '${content.style.stepDurationMs} ms',
          onChanged: (value) {
            onChanged(
              content.copyWith(
                style: content.style.copyWith(stepDurationMs: value.round()),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.xs),
        AppDropdown<String>(
          value: content.style.theme,
          labelText: _tr('主题', 'Theme'),
          items: [
            AppDropdownItem(value: 'indigo', label: _tr('靛蓝', 'Indigo')),
            AppDropdownItem(value: 'emerald', label: _tr('祖母绿', 'Emerald')),
            AppDropdownItem(value: 'amber', label: _tr('琥珀', 'Amber')),
          ],
          onChanged: (value) {
            if (value == null) return;
            onChanged(
              content.copyWith(style: content.style.copyWith(theme: value)),
            );
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: Text(
                _tr('显示箭头', 'Show arrows'),
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            Switch(
              value: content.style.showArrows,
              onChanged: (value) {
                onChanged(
                  content.copyWith(
                    style: content.style.copyWith(showArrows: value),
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        AppDropdown<String?>(
          value: content.entryNodeId,
          labelText: _tr('入口节点', 'Entry Node'),
          items: [
            AppDropdownItem<String?>(
              value: null,
              label: _tr('无', 'None'),
            ),
            ...content.nodes.map(
              (node) => AppDropdownItem<String?>(
                value: node.id,
                label: '${node.label} (${node.id})',
              ),
            ),
          ],
          onChanged: (value) {
            if (value == null || value.isEmpty) {
              onChanged(content.copyWith(clearEntryNodeId: true));
              return;
            }
            onChanged(content.copyWith(entryNodeId: value));
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        _buildNodesSection(),
        const SizedBox(height: AppSpacing.lg),
        _buildEdgesSection(nodeIds),
        const SizedBox(height: AppSpacing.lg),
        _buildStepsSection(),
      ],
    );
  }

  Widget _buildNodesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                _tr('节点', 'Nodes'),
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: _tr('添加节点', 'Add node'),
              onPressed: () {
                final id = _generateNodeId(content.nodes);
                final nodes = [
                  ...content.nodes,
                  FunctionFlowNode(
                    id: id,
                    label: '${_tr('函数', 'function')}${content.nodes.length + 1}()',
                    x: 20 + (content.nodes.length % 5) * 18,
                    y: 20 + (content.nodes.length % 3) * 24,
                    kind: FunctionFlowNode.kindFunction,
                  ),
                ];
                final next = content.copyWith(
                  nodes: nodes,
                  entryNodeId: content.entryNodeId ?? id,
                );
                onChanged(next);
              },
            ),
          ],
        ),
        if (content.nodes.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Text(
              _tr('添加第一个函数节点', 'Add first function node'),
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...content.nodes.asMap().entries.map((entry) {
            final index = entry.key;
            final node = entry.value;
            return _NodeEditorCard(
              key: ValueKey('node_${node.id}'),
              t: t,
              node: node,
              canRemove: content.nodes.length > 1,
              onChanged: (updated) {
                final nodes = [...content.nodes];
                nodes[index] = updated;
                var next = content.copyWith(nodes: nodes);

                if (next.entryNodeId == null ||
                    !nodes.any((n) => n.id == next.entryNodeId)) {
                  next = next.copyWith(
                    entryNodeId: nodes.isEmpty ? null : nodes.first.id,
                    clearEntryNodeId: nodes.isEmpty,
                  );
                }

                final sanitized = _sanitizeEdgesAndSteps(
                  nodes: nodes,
                  edges: next.edges,
                  steps: next.steps,
                );
                onChanged(
                  next.copyWith(edges: sanitized.$1, steps: sanitized.$2),
                );
              },
              onRemove: () {
                final removed = node;
                final nodes = [...content.nodes]..removeAt(index);
                final edges = content.edges
                    .where(
                      (edge) =>
                          edge.from != removed.id && edge.to != removed.id,
                    )
                    .toList();
                final steps = _sanitizeSteps(content.steps, edges.length);

                String? entryNodeId = content.entryNodeId;
                var clearEntry = false;
                if (entryNodeId == removed.id) {
                  if (nodes.isEmpty) {
                    entryNodeId = null;
                    clearEntry = true;
                  } else {
                    entryNodeId = nodes.first.id;
                  }
                }

                onChanged(
                  content.copyWith(
                    nodes: nodes,
                    edges: edges,
                    steps: steps,
                    entryNodeId: entryNodeId,
                    clearEntryNodeId: clearEntry,
                  ),
                );
              },
            );
          }),
      ],
    );
  }

  Widget _buildEdgesSection(List<String> nodeIds) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                _tr('连线', 'Edges'),
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: _tr('添加连线', 'Add edge'),
              onPressed: content.nodes.length < 2
                  ? null
                  : () {
                      final from = content.nodes.first.id;
                      final to = content.nodes.length > 1
                          ? content.nodes[1].id
                          : content.nodes.first.id;
                      final edges = [
                        ...content.edges,
                        FunctionFlowEdge(
                          from: from,
                          to: to,
                          label: '${_tr('步骤', 'step')} ${content.edges.length + 1}',
                        ),
                      ];
                      onChanged(
                        content.copyWith(
                          edges: edges,
                          steps: _sanitizeSteps(content.steps, edges.length),
                        ),
                      );
                    },
            ),
          ],
        ),
        if (content.edges.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Text(
              _tr('添加连接边（调用者 -> 被调用者）', 'Add a connection edge (caller -> callee)'),
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...content.edges.asMap().entries.map((entry) {
            final index = entry.key;
            final edge = entry.value;
            return _EdgeEditorCard(
              key: ValueKey('edge_$index'),
              t: t,
              edge: edge,
              nodeIds: nodeIds,
              onChanged: (updated) {
                final edges = [...content.edges];
                edges[index] = updated;
                onChanged(content.copyWith(edges: edges));
              },
              onRemove: () {
                final edges = [...content.edges]..removeAt(index);
                final steps = content.steps
                    .map((step) {
                      if (step.edgeIndex == index) return null;
                      if (step.edgeIndex > index) {
                        return step.copyWith(edgeIndex: step.edgeIndex - 1);
                      }
                      return step;
                    })
                    .whereType<FunctionFlowStep>()
                    .toList();
                onChanged(content.copyWith(edges: edges, steps: steps));
              },
            );
          }),
      ],
    );
  }

  Widget _buildStepsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                _tr('步骤（可选）', 'Steps (Optional)'),
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: _tr('添加步骤', 'Add step'),
              onPressed: content.edges.isEmpty
                  ? null
                  : () {
                      final steps = [
                        ...content.steps,
                        const FunctionFlowStep(edgeIndex: 0),
                      ];
                      onChanged(content.copyWith(steps: steps));
                    },
            ),
          ],
        ),
        Text(
          _tr('若为空，将按连线列表顺序播放。', 'If empty, edges are played in listed order.'),
          style: TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        if (content.steps.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Text(
              _tr('尚未配置自定义步骤。', 'No custom steps configured.'),
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...content.steps.asMap().entries.map((entry) {
            final index = entry.key;
            final step = entry.value;
            return _StepEditorCard(
              key: ValueKey('step_$index'),
              t: t,
              index: index,
              step: step,
              edgeCount: content.edges.length,
              onChanged: (updated) {
                final steps = [...content.steps];
                steps[index] = updated;
                onChanged(content.copyWith(steps: steps));
              },
              onRemove: () {
                final steps = [...content.steps]..removeAt(index);
                onChanged(content.copyWith(steps: steps));
              },
            );
          }),
      ],
    );
  }

  String _generateNodeId(List<FunctionFlowNode> nodes) {
    final used = nodes.map((n) => n.id).toSet();
    var seq = nodes.length + 1;
    while (true) {
      final id = 'n$seq';
      if (!used.contains(id)) return id;
      seq += 1;
    }
  }

  (List<FunctionFlowEdge>, List<FunctionFlowStep>) _sanitizeEdgesAndSteps({
    required List<FunctionFlowNode> nodes,
    required List<FunctionFlowEdge> edges,
    required List<FunctionFlowStep> steps,
  }) {
    final nodeIds = nodes.map((n) => n.id).toSet();
    final filteredEdges = edges
        .where(
          (edge) => nodeIds.contains(edge.from) && nodeIds.contains(edge.to),
        )
        .toList();
    final filteredSteps = _sanitizeSteps(steps, filteredEdges.length);
    return (filteredEdges, filteredSteps);
  }

  List<FunctionFlowStep> _sanitizeSteps(
    List<FunctionFlowStep> steps,
    int edgeCount,
  ) {
    return steps
        .where((step) => step.edgeIndex >= 0 && step.edgeIndex < edgeCount)
        .toList();
  }
}

class _NodeEditorCard extends StatelessWidget {
  final BuilderLocalizations t;
  final FunctionFlowNode node;
  final bool canRemove;
  final ValueChanged<FunctionFlowNode> onChanged;
  final VoidCallback onRemove;

  const _NodeEditorCard({
    super.key,
    required this.t,
    required this.node,
    required this.canRemove,
    required this.onChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
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
                    node.id,
                    style: const TextStyle(
                      fontSize: AppFontSize.xs,
                      color: AppColors.neutral500,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.remove_circle_outline,
                    color: AppColors.error,
                    size: 20,
                  ),
                  onPressed: canRemove ? onRemove : null,
                ),
              ],
            ),
            TextFormField(
              initialValue: node.label,
              decoration: InputDecoration(
                labelText: t.isZh ? '标签' : 'Label',
                isDense: true,
              ),
              onChanged: (value) {
                onChanged(node.copyWith(label: value));
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            AppDropdown<String>(
              value: node.kind,
              labelText: t.isZh ? '类型' : 'Kind',
              isDense: true,
              items: [
                AppDropdownItem(
                  value: FunctionFlowNode.kindStart,
                  label: t.isZh ? '开始' : 'start',
                ),
                AppDropdownItem(
                  value: FunctionFlowNode.kindFunction,
                  label: t.isZh ? '函数' : 'function',
                ),
                AppDropdownItem(
                  value: FunctionFlowNode.kindEnd,
                  label: t.isZh ? '结束' : 'end',
                ),
              ],
              onChanged: (value) {
                if (value == null) return;
                onChanged(node.copyWith(kind: value));
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _CoordinateSlider(
                    label: 'X',
                    value: node.x,
                    onChanged: (value) => onChanged(node.copyWith(x: value)),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _CoordinateSlider(
                    label: 'Y',
                    value: node.y,
                    onChanged: (value) => onChanged(node.copyWith(y: value)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              initialValue: node.description ?? '',
              decoration: InputDecoration(
                labelText: t.isZh ? '描述（可选）' : 'Description (optional)',
                isDense: true,
              ),
              onChanged: (value) {
                onChanged(
                  node.copyWith(
                    description: value.isEmpty ? null : value,
                    clearDescription: value.isEmpty,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _CoordinateSlider extends StatelessWidget {
  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  const _CoordinateSlider({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label ${value.toStringAsFixed(0)}',
          style: const TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral500,
          ),
        ),
        Slider(
          value: value,
          min: 0,
          max: 100,
          divisions: 100,
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _EdgeEditorCard extends StatelessWidget {
  final BuilderLocalizations t;
  final FunctionFlowEdge edge;
  final List<String> nodeIds;
  final ValueChanged<FunctionFlowEdge> onChanged;
  final VoidCallback onRemove;

  const _EdgeEditorCard({
    super.key,
    required this.t,
    required this.edge,
    required this.nodeIds,
    required this.onChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: AppDropdown<String>(
                    value: nodeIds.contains(edge.from) ? edge.from : null,
                    labelText: t.isZh ? '起点' : 'From',
                    isDense: true,
                    items: nodeIds
                        .map(
                          (id) => AppDropdownItem<String>(
                            value: id,
                            label: id,
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      onChanged(edge.copyWith(from: value));
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: AppDropdown<String>(
                    value: nodeIds.contains(edge.to) ? edge.to : null,
                    labelText: t.isZh ? '终点' : 'To',
                    isDense: true,
                    items: nodeIds
                        .map(
                          (id) => AppDropdownItem<String>(
                            value: id,
                            label: id,
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      onChanged(edge.copyWith(to: value));
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                IconButton(
                  icon: const Icon(
                    Icons.remove_circle_outline,
                    color: AppColors.error,
                    size: 20,
                  ),
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints.tightFor(
                    width: 28,
                    height: 28,
                  ),
                  onPressed: onRemove,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              initialValue: edge.label ?? '',
              decoration: InputDecoration(
                labelText: t.isZh ? '标签（可选）' : 'Label (optional)',
                isDense: true,
              ),
              onChanged: (value) {
                onChanged(
                  edge.copyWith(
                    label: value.isEmpty ? null : value,
                    clearLabel: value.isEmpty,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StepEditorCard extends StatelessWidget {
  final BuilderLocalizations t;
  final int index;
  final FunctionFlowStep step;
  final int edgeCount;
  final ValueChanged<FunctionFlowStep> onChanged;
  final VoidCallback onRemove;

  const _StepEditorCard({
    super.key,
    required this.t,
    required this.index,
    required this.step,
    required this.edgeCount,
    required this.onChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final edgeIndexes = List<int>.generate(edgeCount, (i) => i);

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${t.isZh ? '步骤' : 'Step'} ${index + 1}',
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    fontWeight: FontWeight.w600,
                    color: AppColors.neutral600,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(
                    Icons.remove_circle_outline,
                    color: AppColors.error,
                    size: 20,
                  ),
                  onPressed: onRemove,
                ),
              ],
            ),
            AppDropdown<int>(
              value: edgeIndexes.contains(step.edgeIndex)
                  ? step.edgeIndex
                  : null,
              labelText: t.isZh ? '连线索引' : 'Edge index',
              isDense: true,
              items: edgeIndexes
                  .map(
                    (i) => AppDropdownItem<int>(value: i, label: i.toString()),
                  )
                  .toList(),
              onChanged: (value) {
                if (value == null) return;
                onChanged(step.copyWith(edgeIndex: value));
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              initialValue: step.durationMs?.toString() ?? '',
              decoration: InputDecoration(
                labelText: t.isZh ? '时长毫秒（可选）' : 'Duration ms (optional)',
                isDense: true,
              ),
              keyboardType: TextInputType.number,
              onChanged: (value) {
                final parsed = int.tryParse(value.trim());
                onChanged(
                  step.copyWith(
                    durationMs: parsed,
                    clearDuration: value.trim().isEmpty,
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              initialValue: step.note ?? '',
              decoration: InputDecoration(
                labelText: t.isZh ? '备注（可选）' : 'Note (optional)',
                isDense: true,
              ),
              onChanged: (value) {
                onChanged(
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
  }
}
