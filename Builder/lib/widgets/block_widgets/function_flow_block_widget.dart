import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/models.dart';
import '../../theme/design_tokens.dart';

/// Visual + interactive renderer for `function-flow` blocks.
class FunctionFlowBlockWidget extends StatefulWidget {
  final FunctionFlowContent content;
  final bool showControls;
  final bool showHeader;

  const FunctionFlowBlockWidget({
    super.key,
    required this.content,
    this.showControls = true,
    this.showHeader = true,
  });

  @override
  State<FunctionFlowBlockWidget> createState() =>
      _FunctionFlowBlockWidgetState();
}

class _FunctionFlowBlockWidgetState extends State<FunctionFlowBlockWidget>
    with SingleTickerProviderStateMixin {
  static const _nodeSize = 44.0;

  late final AnimationController _pulseController;
  Timer? _playTimer;

  int _currentStep = -1;
  bool _isPlaying = false;
  String? _selectedNodeId;
  String? _hoveredNodeId;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _selectedNodeId = _initialSelection();
  }

  @override
  void didUpdateWidget(covariant FunctionFlowBlockWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.content != widget.content) {
      final steps = _resolvedSteps;
      if (_currentStep >= steps.length) {
        _currentStep = steps.isEmpty ? -1 : steps.length - 1;
      }

      final nodeIds = widget.content.nodes.map((n) => n.id).toSet();
      if (_selectedNodeId != null && !nodeIds.contains(_selectedNodeId)) {
        _selectedNodeId = _initialSelection();
      }

      if (steps.isEmpty && _isPlaying) {
        _stopPlaying();
      }
    }
  }

  @override
  void dispose() {
    _playTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  String? _initialSelection() {
    final entry = widget.content.entryNodeId;
    if (entry != null &&
        entry.isNotEmpty &&
        widget.content.nodes.any((node) => node.id == entry)) {
      return entry;
    }
    return widget.content.nodes.isEmpty ? null : widget.content.nodes.first.id;
  }

  List<_ResolvedFlowStep> get _resolvedSteps {
    final edges = widget.content.edges;
    if (edges.isEmpty) return const [];

    if (widget.content.steps.isEmpty) {
      return List.generate(edges.length, (index) {
        return _ResolvedFlowStep(
          edgeIndex: index,
          edge: edges[index],
          durationMs: widget.content.style.stepDurationMs,
          note: null,
        );
      });
    }

    final resolved = <_ResolvedFlowStep>[];
    for (final step in widget.content.steps) {
      if (step.edgeIndex < 0 || step.edgeIndex >= edges.length) continue;
      resolved.add(
        _ResolvedFlowStep(
          edgeIndex: step.edgeIndex,
          edge: edges[step.edgeIndex],
          durationMs: step.durationMs ?? widget.content.style.stepDurationMs,
          note: step.note,
        ),
      );
    }

    if (resolved.isEmpty) {
      return List.generate(edges.length, (index) {
        return _ResolvedFlowStep(
          edgeIndex: index,
          edge: edges[index],
          durationMs: widget.content.style.stepDurationMs,
          note: null,
        );
      });
    }

    return resolved;
  }

  _ResolvedFlowStep? get _activeStep {
    final steps = _resolvedSteps;
    if (_currentStep < 0 || _currentStep >= steps.length) return null;
    return steps[_currentStep];
  }

  FunctionFlowNode? get _selectedNode {
    final id = _selectedNodeId;
    if (id == null) return null;
    for (final node in widget.content.nodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  Color _themePrimaryColor() {
    switch (widget.content.style.theme) {
      case 'emerald':
        return const Color(0xFF059669);
      case 'amber':
        return const Color(0xFFF59E0B);
      case 'indigo':
      default:
        return AppColors.primary500;
    }
  }

  void _togglePlayPause() {
    if (_isPlaying) {
      _stopPlaying();
      return;
    }

    if (_resolvedSteps.isEmpty) return;

    setState(() {
      _isPlaying = true;
      if (_currentStep < 0) {
        _currentStep = 0;
      }
      _selectedNodeId = _resolvedSteps[_currentStep].edge.to;
    });
    _scheduleNextTick();
  }

  void _scheduleNextTick() {
    _playTimer?.cancel();
    if (!_isPlaying || !mounted) return;

    final step = _activeStep;
    final durationMs = step?.durationMs ?? widget.content.style.stepDurationMs;
    _playTimer = Timer(Duration(milliseconds: durationMs), () {
      if (!mounted || !_isPlaying) return;
      _stepForward();
      _scheduleNextTick();
    });
  }

  void _stopPlaying() {
    _playTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _isPlaying = false;
    });
  }

  void _stepForward() {
    final steps = _resolvedSteps;
    if (steps.isEmpty) return;

    setState(() {
      if (_currentStep < 0) {
        _currentStep = 0;
      } else {
        _currentStep = (_currentStep + 1) % steps.length;
      }
      _selectedNodeId = steps[_currentStep].edge.to;
    });
  }

  void _reset() {
    _stopPlaying();
    setState(() {
      _currentStep = -1;
      _selectedNodeId = _initialSelection();
    });
  }

  @override
  Widget build(BuildContext context) {
    final totalSteps = _resolvedSteps.length;
    final activeStep = _activeStep;
    final activeEdgeIndex = activeStep?.edgeIndex;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.neutral50,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.showHeader)
            Row(
              children: [
                Icon(Icons.hub, size: 16, color: _themePrimaryColor()),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    widget.content.title.isEmpty
                        ? 'Function Flow'
                        : widget.content.title,
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      fontWeight: FontWeight.w600,
                      color: AppColors.neutral700,
                    ),
                  ),
                ),
                Text(
                  'Step ${_currentStep >= 0 ? _currentStep + 1 : 0}/$totalSteps',
                  key: const Key('function_flow_step_indicator'),
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral500,
                  ),
                ),
              ],
            ),
          if (widget.showHeader) const SizedBox(height: AppSpacing.sm),
          LayoutBuilder(
            builder: (context, constraints) {
              return Container(
                height: 220,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  border: Border.all(color: AppColors.neutral200),
                ),
                child: AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, _) {
                    final pulse = _pulseController.value;
                    return Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _FunctionFlowPainter(
                              content: widget.content,
                              activeEdgeIndex: activeEdgeIndex,
                              activeNodeId: activeStep?.edge.to,
                              themeColor: _themePrimaryColor(),
                              pulse: pulse,
                            ),
                          ),
                        ),
                        ...widget.content.nodes.map((node) {
                          final center = _nodeCenter(node, constraints.biggest);
                          final isActive = activeStep?.edge.to == node.id;
                          final isSelected = _selectedNodeId == node.id;
                          final isHovered = _hoveredNodeId == node.id;

                          return Positioned(
                            left: center.dx - _nodeSize / 2,
                            top: center.dy - _nodeSize / 2,
                            child: MouseRegion(
                              onEnter: (_) =>
                                  setState(() => _hoveredNodeId = node.id),
                              onExit: (_) =>
                                  setState(() => _hoveredNodeId = null),
                              child: Tooltip(
                                message:
                                    node.description?.trim().isNotEmpty == true
                                    ? '${node.label}\n${node.description}'
                                    : node.label,
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedNodeId = node.id;
                                    });
                                  },
                                  child: _buildNodeChip(
                                    node: node,
                                    isActive: isActive,
                                    isSelected: isSelected,
                                    isHovered: isHovered,
                                    pulse: pulse,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    );
                  },
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          _buildSelectionPanel(activeStep),
          if (widget.showControls) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                OutlinedButton.icon(
                  key: const Key('function_flow_play'),
                  onPressed: totalSteps == 0 ? null : _togglePlayPause,
                  icon: Icon(
                    _isPlaying ? Icons.pause_circle_outline : Icons.play_circle,
                  ),
                  label: Text(_isPlaying ? 'Pause' : 'Play'),
                ),
                OutlinedButton.icon(
                  key: const Key('function_flow_step'),
                  onPressed: totalSteps == 0 ? null : _stepForward,
                  icon: const Icon(Icons.skip_next),
                  label: const Text('Step'),
                ),
                OutlinedButton.icon(
                  key: const Key('function_flow_reset'),
                  onPressed: totalSteps == 0 ? null : _reset,
                  icon: const Icon(Icons.restart_alt),
                  label: const Text('Reset'),
                ),
                Text(
                  '${widget.content.style.stepDurationMs} ms/step',
                  style: const TextStyle(
                    fontSize: AppFontSize.xs,
                    color: AppColors.neutral500,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSelectionPanel(_ResolvedFlowStep? activeStep) {
    final node = _selectedNode;
    if (node == null) {
      return const Text(
        'Tap a node to inspect details.',
        style: TextStyle(fontSize: AppFontSize.xs, color: AppColors.neutral500),
      );
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
          Row(
            children: [
              Expanded(
                child: Text(
                  node.label,
                  style: const TextStyle(
                    fontSize: AppFontSize.sm,
                    fontWeight: FontWeight.w600,
                    color: AppColors.neutral800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: _nodeBaseColor(node.kind).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
                child: Text(
                  node.kind,
                  style: TextStyle(
                    fontSize: AppFontSize.xs,
                    fontWeight: FontWeight.w600,
                    color: _nodeBaseColor(node.kind),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Node ID: ${node.id}',
            style: const TextStyle(
              fontSize: AppFontSize.xs,
              color: AppColors.neutral500,
              fontFamily: 'monospace',
            ),
          ),
          if (node.description?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              node.description!,
              style: const TextStyle(
                fontSize: AppFontSize.xs,
                color: AppColors.neutral600,
              ),
            ),
          ],
          if (activeStep?.note?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Current step: ${activeStep!.note}',
              style: TextStyle(
                fontSize: AppFontSize.xs,
                color: _themePrimaryColor(),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNodeChip({
    required FunctionFlowNode node,
    required bool isActive,
    required bool isSelected,
    required bool isHovered,
    required double pulse,
  }) {
    final baseColor = _nodeBaseColor(node.kind);
    final safePulse = pulse.isFinite ? pulse : 0.0;
    final scale = isActive ? 1.0 + safePulse * 0.08 : 1.0;

    return AnimatedScale(
      duration: const Duration(milliseconds: 120),
      scale: scale,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: _nodeSize,
        height: _nodeSize,
        decoration: BoxDecoration(
          color: baseColor.withValues(alpha: isHovered ? 0.95 : 0.88),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: isActive
                  ? baseColor.withValues(alpha: 0.45)
                  : Colors.black.withValues(alpha: 0.08),
              blurRadius: isActive ? 14 : 6,
              spreadRadius: isActive ? 2 : 0,
            ),
          ],
          border: Border.all(
            color: isSelected
                ? Colors.black.withValues(alpha: 0.8)
                : Colors.white,
            width: isSelected ? 2.0 : 1.5,
          ),
        ),
        child: Center(
          child: Text(
            _nodeShortLabel(node),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  String _nodeShortLabel(FunctionFlowNode node) {
    if (node.label.trim().isEmpty) return '?';
    final words = node.label.trim().split(RegExp(r'\s+'));
    if (words.length == 1) {
      final single = words.first;
      if (single.length <= 4) return single;
      return single.substring(0, 4);
    }
    final initials = words.take(2).map((word) => word[0]).join();
    return initials.toUpperCase();
  }

  Color _nodeBaseColor(String kind) {
    switch (kind) {
      case FunctionFlowNode.kindStart:
        return AppColors.success;
      case FunctionFlowNode.kindEnd:
        return AppColors.error;
      case FunctionFlowNode.kindFunction:
      default:
        return _themePrimaryColor();
    }
  }
}

Offset _nodeCenter(FunctionFlowNode node, Size size) {
  final safeNodeX = node.x.isFinite ? node.x : 0.0;
  final safeNodeY = node.y.isFinite ? node.y : 0.0;
  final safeWidthValue = size.width.isFinite ? size.width : 0.0;
  final safeHeightValue = size.height.isFinite ? size.height : 0.0;
  final safeWidth = math.max(
    0.0,
    safeWidthValue - _FunctionFlowBlockWidgetState._nodeSize,
  );
  final safeHeight = math.max(
    0.0,
    safeHeightValue - _FunctionFlowBlockWidgetState._nodeSize,
  );
  final x =
      _FunctionFlowBlockWidgetState._nodeSize / 2 +
      safeWidth * (safeNodeX / 100);
  final y =
      _FunctionFlowBlockWidgetState._nodeSize / 2 +
      safeHeight * (safeNodeY / 100);
  return Offset(x, y);
}

class _FunctionFlowPainter extends CustomPainter {
  final FunctionFlowContent content;
  final int? activeEdgeIndex;
  final String? activeNodeId;
  final Color themeColor;
  final double pulse;

  const _FunctionFlowPainter({
    required this.content,
    required this.activeEdgeIndex,
    required this.activeNodeId,
    required this.themeColor,
    required this.pulse,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final safePulse = pulse.isFinite ? pulse : 0.0;
    final nodeMap = <String, FunctionFlowNode>{
      for (final node in content.nodes) node.id: node,
    };

    final gridPaint = Paint()
      ..color = AppColors.neutral200.withValues(alpha: 0.55)
      ..strokeWidth = 1;
    for (int i = 1; i < 4; i++) {
      final y = size.height * (i / 4);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    for (int i = 0; i < content.edges.length; i++) {
      final edge = content.edges[i];
      final fromNode = nodeMap[edge.from];
      final toNode = nodeMap[edge.to];
      if (fromNode == null || toNode == null) continue;

      final start = _nodeCenter(fromNode, size);
      final end = _nodeCenter(toNode, size);
      final control = Offset(
        (start.dx + end.dx) / 2,
        math.min(start.dy, end.dy) - 26,
      );

      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..quadraticBezierTo(control.dx, control.dy, end.dx, end.dy);

      final isActive = i == activeEdgeIndex;
      final baseColor = isActive
          ? themeColor.withValues(alpha: 0.95)
          : AppColors.neutral400.withValues(alpha: 0.9);

      if (isActive) {
        final glow = Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = content.style.lineWidth + 6
          ..strokeCap = StrokeCap.round
          ..color = themeColor.withValues(alpha: 0.25 + safePulse * 0.25);
        canvas.drawPath(path, glow);
      }

      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = isActive
            ? content.style.lineWidth + 1.8 + safePulse * 1.2
            : content.style.lineWidth
        ..strokeCap = StrokeCap.round
        ..color = baseColor;
      canvas.drawPath(path, paint);

      if (content.style.showArrows) {
        _drawArrow(canvas, path, baseColor);
      }

      if ((edge.label ?? '').trim().isNotEmpty) {
        _drawEdgeLabel(canvas, path, edge.label!.trim(), isActive);
      }
    }

    if (activeNodeId != null && nodeMap.containsKey(activeNodeId)) {
      final node = nodeMap[activeNodeId]!;
      final center = _nodeCenter(node, size);
      final ringPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = themeColor.withValues(alpha: 0.35 + safePulse * 0.4);
      canvas.drawCircle(center, 30 + safePulse * 3, ringPaint);
    }
  }

  void _drawArrow(Canvas canvas, Path path, Color color) {
    final metricsIterator = path.computeMetrics().iterator;
    if (!metricsIterator.moveNext()) return;
    final metric = metricsIterator.current;
    if (!metric.length.isFinite || metric.length <= 2) return;
    final tangent = metric.getTangentForOffset(metric.length - 2);
    if (tangent == null) return;

    final p = tangent.position;
    final angle = tangent.angle;
    if (!p.dx.isFinite || !p.dy.isFinite || !angle.isFinite) return;
    const arrowLength = 9.0;
    const arrowSpread = 0.45;

    final p1 = Offset(
      p.dx - arrowLength * math.cos(angle - arrowSpread),
      p.dy - arrowLength * math.sin(angle - arrowSpread),
    );
    final p2 = Offset(
      p.dx - arrowLength * math.cos(angle + arrowSpread),
      p.dy - arrowLength * math.sin(angle + arrowSpread),
    );

    final arrowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = color;
    canvas.drawLine(p, p1, arrowPaint);
    canvas.drawLine(p, p2, arrowPaint);
  }

  void _drawEdgeLabel(Canvas canvas, Path path, String label, bool isActive) {
    final metricsIterator = path.computeMetrics().iterator;
    if (!metricsIterator.moveNext()) return;
    final metric = metricsIterator.current;
    final tangent = metric.getTangentForOffset(metric.length * 0.5);
    if (tangent == null) return;

    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: TextStyle(
          fontSize: AppFontSize.xs,
          color: isActive ? themeColor : AppColors.neutral600,
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final offset = Offset(
      tangent.position.dx - textPainter.width / 2,
      tangent.position.dy - textPainter.height - 6,
    );

    final bgRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        offset.dx - 4,
        offset.dy - 2,
        textPainter.width + 8,
        textPainter.height + 4,
      ),
      const Radius.circular(6),
    );
    final bgPaint = Paint()..color = Colors.white.withValues(alpha: 0.9);
    canvas.drawRRect(bgRect, bgPaint);

    textPainter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _FunctionFlowPainter oldDelegate) {
    return oldDelegate.content != content ||
        oldDelegate.activeEdgeIndex != activeEdgeIndex ||
        oldDelegate.activeNodeId != activeNodeId ||
        oldDelegate.themeColor != themeColor ||
        oldDelegate.pulse != pulse;
  }
}

class _ResolvedFlowStep {
  final int edgeIndex;
  final FunctionFlowEdge edge;
  final int durationMs;
  final String? note;

  const _ResolvedFlowStep({
    required this.edgeIndex,
    required this.edge,
    required this.durationMs,
    required this.note,
  });
}
