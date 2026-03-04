import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/design_tokens.dart';

class MatchingContentEditor extends StatelessWidget {
  final MatchingContent content;
  final ValueChanged<MatchingContent> onChanged;

  const MatchingContentEditor({
    super.key,
    required this.content,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          initialValue: content.question,
          decoration: const InputDecoration(
            labelText: 'Question',
            border: OutlineInputBorder(),
          ),
          onChanged: (value) {
            onChanged(content.copyWith(question: value));
          },
        ),
        const SizedBox(height: AppSpacing.md),
        const Text(
          'Mode',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: MatchingContent.modeList, label: Text('List')),
            ButtonSegment(
              value: MatchingContent.modeGraph,
              label: Text('Graph'),
            ),
          ],
          selected: {
            MatchingContent.supportedModes.contains(content.mode)
                ? content.mode
                : MatchingContent.modeList,
          },
          onSelectionChanged: (value) {
            final nextMode = value.first;
            if (nextMode == MatchingContent.modeGraph) {
              onChanged(_seedGraphContent(content).copyWith(mode: nextMode));
              return;
            }
            onChanged(content.copyWith(mode: nextMode));
          },
        ),
        const SizedBox(height: AppSpacing.md),
        if (content.mode == MatchingContent.modeGraph)
          _buildGraphEditor()
        else
          _buildListEditor(),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: content.explanation ?? '',
          decoration: const InputDecoration(
            labelText: 'Explanation',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
          onChanged: (value) {
            onChanged(
              content.copyWith(explanation: value.isEmpty ? null : value),
            );
          },
        ),
      ],
    );
  }

  Widget _buildListEditor() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildItemSection(
          title: 'Left Items',
          items: content.leftItems,
          onAdd: () {
            final newItem = MatchingItem(
              id: _generateItemId(content.leftItems, 'l'),
              text: 'Item ${content.leftItems.length + 1}',
            );
            onChanged(
              content.copyWith(leftItems: [...content.leftItems, newItem]),
            );
          },
          onUpdate: (index, value) {
            final updatedItems = [...content.leftItems];
            updatedItems[index] = updatedItems[index].copyWith(text: value);
            onChanged(content.copyWith(leftItems: updatedItems));
          },
          onRemove: (index) {
            final item = content.leftItems[index];
            final updatedItems = [...content.leftItems]..removeAt(index);
            final updatedPairs = content.correctPairs
                .where((p) => p.leftId != item.id)
                .toList();
            onChanged(
              content.copyWith(
                leftItems: updatedItems,
                correctPairs: updatedPairs,
              ),
            );
          },
          canRemove: content.leftItems.length > 1,
          labelPrefix: 'Left',
        ),
        const SizedBox(height: AppSpacing.md),
        _buildItemSection(
          title: 'Right Items',
          items: content.rightItems,
          onAdd: () {
            final newItem = MatchingItem(
              id: _generateItemId(content.rightItems, 'r'),
              text: 'Match ${content.rightItems.length + 1}',
            );
            onChanged(
              content.copyWith(rightItems: [...content.rightItems, newItem]),
            );
          },
          onUpdate: (index, value) {
            final updatedItems = [...content.rightItems];
            updatedItems[index] = updatedItems[index].copyWith(text: value);
            onChanged(content.copyWith(rightItems: updatedItems));
          },
          onRemove: (index) {
            final item = content.rightItems[index];
            final updatedItems = [...content.rightItems]..removeAt(index);
            final updatedPairs = content.correctPairs
                .where((p) => p.rightId != item.id)
                .toList();
            onChanged(
              content.copyWith(
                rightItems: updatedItems,
                correctPairs: updatedPairs,
              ),
            );
          },
          canRemove: content.rightItems.length > 1,
          labelPrefix: 'Right',
        ),
        const SizedBox(height: AppSpacing.md),
        const Text(
          'Correct Pairs',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ...content.leftItems.map((leftItem) {
          final selectedRightId = _selectedRightIdFor(leftItem.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    leftItem.text,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: AppFontSize.sm),
                  ),
                ),
                const Icon(
                  Icons.arrow_forward,
                  size: 16,
                  color: AppColors.neutral400,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String>(
                    initialValue: selectedRightId,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                    ),
                    hint: const Text('Select match'),
                    items: content.rightItems
                        .map(
                          (rightItem) => DropdownMenuItem<String>(
                            value: rightItem.id,
                            child: Text(
                              rightItem.text,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (rightId) {
                      if (rightId == null) return;
                      final updatedPairs =
                          content.correctPairs
                              .where((p) => p.leftId != leftItem.id)
                              .toList()
                            ..add(
                              MatchingPair(
                                leftId: leftItem.id,
                                rightId: rightId,
                              ),
                            );
                      onChanged(content.copyWith(correctPairs: updatedPairs));
                    },
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildGraphEditor() {
    final graphContent = _seedGraphContent(content);
    final ruleMessages = _ruleConflicts(graphContent);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.neutral50,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
            border: Border.all(color: AppColors.neutral200),
          ),
          child: const Text(
            'Graph mode supports one-to-many / many-to-many and directed edges.',
            style: TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral600,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _buildRulesEditor(graphContent),
        const SizedBox(height: AppSpacing.md),
        _buildGraphNodesSection(graphContent),
        const SizedBox(height: AppSpacing.md),
        _buildGraphEdgesSection(graphContent),
        if (ruleMessages.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(
                color: AppColors.warning.withValues(alpha: 0.45),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Rule conflict',
                  style: TextStyle(
                    fontSize: AppFontSize.xs,
                    fontWeight: FontWeight.w700,
                    color: AppColors.warning,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                ...ruleMessages.map(
                  (message) => Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      '- $message',
                      style: const TextStyle(
                        fontSize: AppFontSize.xs,
                        color: AppColors.neutral700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildRulesEditor(MatchingContent graphContent) {
    final relationMode = graphContent.rules.allowManyToMany
        ? 'manyToMany'
        : (graphContent.rules.allowOneToMany ? 'oneToMany' : 'oneToOne');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Rules',
          style: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        DropdownButtonFormField<String>(
          initialValue: relationMode,
          decoration: const InputDecoration(
            labelText: 'Connection pattern',
            isDense: true,
          ),
          items: const [
            DropdownMenuItem(value: 'oneToOne', child: Text('One-to-one')),
            DropdownMenuItem(value: 'oneToMany', child: Text('One-to-many')),
            DropdownMenuItem(value: 'manyToMany', child: Text('Many-to-many')),
          ],
          onChanged: (value) {
            if (value == null) return;
            final rules = switch (value) {
              'manyToMany' => graphContent.rules.copyWith(
                allowManyToMany: true,
                allowOneToMany: true,
              ),
              'oneToMany' => graphContent.rules.copyWith(
                allowManyToMany: false,
                allowOneToMany: true,
              ),
              _ => graphContent.rules.copyWith(
                allowManyToMany: false,
                allowOneToMany: false,
              ),
            };
            onChanged(
              graphContent.copyWith(
                mode: MatchingContent.modeGraph,
                rules: rules,
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            const Expanded(
              child: Text(
                'Directed (A -> B)',
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            Switch(
              value: graphContent.rules.directed,
              onChanged: (value) {
                onChanged(
                  graphContent.copyWith(
                    mode: MatchingContent.modeGraph,
                    rules: graphContent.rules.copyWith(directed: value),
                  ),
                );
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildGraphNodesSection(MatchingContent graphContent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Nodes',
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              tooltip: 'Add node',
              onPressed: () {
                final nextNode = MatchingNode(
                  id: _generateNodeId(graphContent.nodes),
                  label: 'Node ${graphContent.nodes.length + 1}',
                  x: 20 + ((graphContent.nodes.length % 4) * 20),
                  y: 20 + ((graphContent.nodes.length % 3) * 20),
                  group: MatchingNode.groupNeutral,
                );
                onChanged(
                  graphContent.copyWith(
                    mode: MatchingContent.modeGraph,
                    nodes: [...graphContent.nodes, nextNode],
                  ),
                );
              },
            ),
          ],
        ),
        if (graphContent.nodes.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: const Text(
              'Add your first node to start graph matching.',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...graphContent.nodes.asMap().entries.map((entry) {
            final index = entry.key;
            final node = entry.value;
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
                            size: 20,
                            color: AppColors.error,
                          ),
                          onPressed: graphContent.nodes.length <= 1
                              ? null
                              : () {
                                  final updatedNodes = [...graphContent.nodes]
                                    ..removeAt(index);
                                  final nodeIds = updatedNodes
                                      .map((n) => n.id)
                                      .toSet();
                                  final updatedEdges = graphContent.edges
                                      .where(
                                        (edge) =>
                                            nodeIds.contains(edge.from) &&
                                            nodeIds.contains(edge.to),
                                      )
                                      .toList();
                                  onChanged(
                                    graphContent.copyWith(
                                      mode: MatchingContent.modeGraph,
                                      nodes: updatedNodes,
                                      edges: updatedEdges,
                                    ),
                                  );
                                },
                        ),
                      ],
                    ),
                    TextFormField(
                      initialValue: node.label,
                      decoration: const InputDecoration(
                        labelText: 'Label',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final updatedNodes = [...graphContent.nodes];
                        updatedNodes[index] = node.copyWith(label: value);
                        onChanged(
                          graphContent.copyWith(
                            mode: MatchingContent.modeGraph,
                            nodes: updatedNodes,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<String>(
                      initialValue: node.group,
                      decoration: const InputDecoration(
                        labelText: 'Group',
                        isDense: true,
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: MatchingNode.groupLeft,
                          child: Text('left'),
                        ),
                        DropdownMenuItem(
                          value: MatchingNode.groupRight,
                          child: Text('right'),
                        ),
                        DropdownMenuItem(
                          value: MatchingNode.groupNeutral,
                          child: Text('neutral'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        final updatedNodes = [...graphContent.nodes];
                        updatedNodes[index] = node.copyWith(group: value);
                        onChanged(
                          graphContent.copyWith(
                            mode: MatchingContent.modeGraph,
                            nodes: updatedNodes,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: _CoordinateSlider(
                            label: 'X',
                            value: node.x,
                            onChanged: (value) {
                              final updatedNodes = [...graphContent.nodes];
                              updatedNodes[index] = node.copyWith(x: value);
                              onChanged(
                                graphContent.copyWith(
                                  mode: MatchingContent.modeGraph,
                                  nodes: updatedNodes,
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: _CoordinateSlider(
                            label: 'Y',
                            value: node.y,
                            onChanged: (value) {
                              final updatedNodes = [...graphContent.nodes];
                              updatedNodes[index] = node.copyWith(y: value);
                              onChanged(
                                graphContent.copyWith(
                                  mode: MatchingContent.modeGraph,
                                  nodes: updatedNodes,
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildGraphEdgesSection(MatchingContent graphContent) {
    final nodeIds = graphContent.nodes.map((n) => n.id).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Edges',
                style: TextStyle(
                  fontSize: AppFontSize.xs,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              tooltip: 'Add edge',
              onPressed: nodeIds.length < 2
                  ? null
                  : () {
                      final from = nodeIds.first;
                      final to = nodeIds[1];
                      onChanged(
                        graphContent.copyWith(
                          mode: MatchingContent.modeGraph,
                          edges: [
                            ...graphContent.edges,
                            MatchingEdge(
                              from: from,
                              to: to,
                              directed: graphContent.rules.directed,
                            ),
                          ],
                        ),
                      );
                    },
            ),
          ],
        ),
        if (graphContent.edges.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: const Text(
              'Add graph edges to define correct connections.',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral500,
              ),
            ),
          )
        else
          ...graphContent.edges.asMap().entries.map((entry) {
            final index = entry.key;
            final edge = entry.value;
            final directedValue = edge.directed ?? graphContent.rules.directed;
            return Card(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: nodeIds.contains(edge.from)
                                ? edge.from
                                : null,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'From',
                              isDense: true,
                            ),
                            items: nodeIds
                                .map(
                                  (id) => DropdownMenuItem(
                                    value: id,
                                    child: Text(
                                      id,
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) {
                              if (value == null) return;
                              final updatedEdges = [...graphContent.edges];
                              updatedEdges[index] = edge.copyWith(from: value);
                              onChanged(
                                graphContent.copyWith(
                                  mode: MatchingContent.modeGraph,
                                  edges: updatedEdges,
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: nodeIds.contains(edge.to)
                                ? edge.to
                                : null,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'To',
                              isDense: true,
                            ),
                            items: nodeIds
                                .map(
                                  (id) => DropdownMenuItem(
                                    value: id,
                                    child: Text(
                                      id,
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) {
                              if (value == null) return;
                              final updatedEdges = [...graphContent.edges];
                              updatedEdges[index] = edge.copyWith(to: value);
                              onChanged(
                                graphContent.copyWith(
                                  mode: MatchingContent.modeGraph,
                                  edges: updatedEdges,
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        IconButton(
                          icon: const Icon(
                            Icons.remove_circle_outline,
                            size: 20,
                            color: AppColors.error,
                          ),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints.tightFor(
                            width: 28,
                            height: 28,
                          ),
                          onPressed: () {
                            final updatedEdges = [...graphContent.edges]
                              ..removeAt(index);
                            onChanged(
                              graphContent.copyWith(
                                mode: MatchingContent.modeGraph,
                                edges: updatedEdges,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      initialValue: edge.label ?? '',
                      decoration: const InputDecoration(
                        labelText: 'Label (optional)',
                        isDense: true,
                      ),
                      onChanged: (value) {
                        final updatedEdges = [...graphContent.edges];
                        updatedEdges[index] = edge.copyWith(
                          label: value.isEmpty ? null : value,
                          clearLabel: value.isEmpty,
                        );
                        onChanged(
                          graphContent.copyWith(
                            mode: MatchingContent.modeGraph,
                            edges: updatedEdges,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Directed override',
                            style: TextStyle(
                              fontSize: AppFontSize.xs,
                              color: AppColors.neutral500,
                            ),
                          ),
                        ),
                        Switch(
                          value: directedValue,
                          onChanged: (value) {
                            final updatedEdges = [...graphContent.edges];
                            updatedEdges[index] = edge.copyWith(
                              directed: value,
                            );
                            onChanged(
                              graphContent.copyWith(
                                mode: MatchingContent.modeGraph,
                                edges: updatedEdges,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildItemSection({
    required String title,
    required List<MatchingItem> items,
    required VoidCallback onAdd,
    required void Function(int index, String value) onUpdate,
    required void Function(int index) onRemove,
    required bool canRemove,
    required String labelPrefix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral500,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 20),
              onPressed: onAdd,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ...items.asMap().entries.map((entry) {
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
                      labelText: '$labelPrefix ${index + 1}',
                      isDense: true,
                    ),
                    onChanged: (value) => onUpdate(index, value),
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.remove_circle_outline,
                    size: 20,
                    color: AppColors.error,
                  ),
                  onPressed: canRemove ? () => onRemove(index) : null,
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  String? _selectedRightIdFor(String leftId) {
    for (final pair in content.correctPairs) {
      if (pair.leftId == leftId) return pair.rightId;
    }
    return null;
  }

  String _generateItemId(List<MatchingItem> items, String prefix) {
    final used = items.map((i) => i.id).toSet();
    var seq = items.length + 1;
    while (true) {
      final id = '$prefix$seq';
      if (!used.contains(id)) return id;
      seq += 1;
    }
  }

  String _generateNodeId(List<MatchingNode> nodes) {
    final used = nodes.map((n) => n.id).toSet();
    var seq = nodes.length + 1;
    while (true) {
      final id = 'n$seq';
      if (!used.contains(id)) return id;
      seq += 1;
    }
  }

  MatchingContent _seedGraphContent(MatchingContent value) {
    if (value.nodes.isNotEmpty || value.edges.isNotEmpty) return value;

    final nodes = <MatchingNode>[];
    final leftStep = value.leftItems.isEmpty
        ? 50.0
        : 80.0 / (value.leftItems.length + 1);
    for (int i = 0; i < value.leftItems.length; i++) {
      final item = value.leftItems[i];
      nodes.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 18,
          y: 10 + leftStep * (i + 1),
          group: MatchingNode.groupLeft,
        ),
      );
    }

    final rightStep = value.rightItems.isEmpty
        ? 50.0
        : 80.0 / (value.rightItems.length + 1);
    for (int i = 0; i < value.rightItems.length; i++) {
      final item = value.rightItems[i];
      nodes.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 82,
          y: 10 + rightStep * (i + 1),
          group: MatchingNode.groupRight,
        ),
      );
    }

    final edges = value.correctPairs
        .map(
          (pair) => MatchingEdge(
            from: pair.leftId,
            to: pair.rightId,
            directed: value.rules.directed,
          ),
        )
        .toList();

    return value.copyWith(nodes: nodes, edges: edges);
  }

  List<String> _ruleConflicts(MatchingContent value) {
    final messages = <String>{};
    final edges = value.edges;

    final seen = <String>{};
    for (final edge in edges) {
      final effectiveDirected = edge.directed ?? value.rules.directed;
      final key = effectiveDirected
          ? '${edge.from}->${edge.to}'
          : (edge.from.compareTo(edge.to) <= 0
                ? '${edge.from}<->${edge.to}'
                : '${edge.to}<->${edge.from}');
      if (!seen.add(key)) {
        messages.add('Duplicate edge ${edge.from} -> ${edge.to}');
      }
    }

    if (!value.rules.allowManyToMany) {
      final outgoing = <String, int>{};
      final incoming = <String, int>{};
      for (final edge in edges) {
        final outCount = (outgoing[edge.from] ?? 0) + 1;
        outgoing[edge.from] = outCount;
        final inCount = (incoming[edge.to] ?? 0) + 1;
        incoming[edge.to] = inCount;

        if (!value.rules.allowOneToMany && outCount > 1) {
          messages.add(
            'Node ${edge.from} has multiple outgoing edges in one-to-one mode',
          );
        }
        if (inCount > 1) {
          messages.add(
            'Node ${edge.to} has multiple incoming edges but many-to-one is disabled',
          );
        }
      }
    }

    return messages.toList();
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
