import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../models/models.dart';
import '../../theme/design_tokens.dart';

/// Lightweight animation preview for Builder + Viewer.
class AnimationBlockWidget extends StatefulWidget {
  final AnimationContent content;

  const AnimationBlockWidget({super.key, required this.content});

  @override
  State<AnimationBlockWidget> createState() => _AnimationBlockWidgetState();
}

class _AnimationBlockWidgetState extends State<AnimationBlockWidget>
    with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = _buildController();
    _startAnimation();
  }

  @override
  void didUpdateWidget(covariant AnimationBlockWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    final old = oldWidget.content;
    final next = widget.content;
    if (old.preset != next.preset ||
        old.durationMs != next.durationMs ||
        old.loop != next.loop ||
        old.speed != next.speed) {
      _controller.dispose();
      _controller = _buildController();
      _startAnimation();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  AnimationController _buildController() {
    final adjustedDuration = _effectiveDuration();
    return AnimationController(vsync: this, duration: adjustedDuration);
  }

  Duration _effectiveDuration() {
    final base = widget.content.durationMs;
    final speed = widget.content.speed <= 0 ? 1.0 : widget.content.speed;
    final adjusted = (base / speed).round();
    final clamped = adjusted < 120 ? 120 : adjusted;
    return Duration(milliseconds: clamped);
  }

  void _startAnimation() {
    if (widget.content.loop) {
      _controller.repeat();
    } else {
      _controller.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
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
          Row(
            children: [
              const Icon(
                Icons.animation,
                size: 16,
                color: AppColors.primary500,
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(
                _presetLabel(widget.content.preset),
                style: const TextStyle(
                  fontSize: AppFontSize.sm,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral700,
                ),
              ),
              const Spacer(),
              Text(
                '${widget.content.durationMs}ms',
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '${widget.content.speed.toStringAsFixed(2)}x',
                style: const TextStyle(
                  fontSize: AppFontSize.xs,
                  color: AppColors.neutral500,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Icon(
                widget.content.loop ? Icons.repeat : Icons.looks_one,
                size: 14,
                color: AppColors.neutral500,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            height: 140,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                switch (widget.content.preset) {
                  case AnimationContent.presetPulseBars:
                    return _buildPulseBars(_controller.value);
                  case AnimationContent.presetBouncingDot:
                  default:
                    return _buildBouncingDot(_controller.value);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBouncingDot(double t) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const dotSize = 20.0;
        final maxY = constraints.maxHeight - dotSize;
        final bounce = math.sin(t * math.pi).abs();
        final y = maxY * (1 - bounce);
        final shadowOpacity = 0.15 + (1 - bounce) * 0.2;

        return Stack(
          children: [
            Positioned(
              left: 0,
              right: 0,
              bottom: 6,
              child: Center(
                child: Container(
                  width: 36 - bounce * 10,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: shadowOpacity),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
            Positioned(
              left: (constraints.maxWidth - dotSize) / 2,
              top: y,
              child: Container(
                width: dotSize,
                height: dotSize,
                decoration: const BoxDecoration(
                  color: AppColors.primary500,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPulseBars(double t) {
    double barScale(int index) {
      final phase = t * 2 * math.pi + index * (math.pi / 3);
      return 0.3 + 0.7 * ((math.sin(phase) + 1) / 2);
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(4, (index) {
        final scale = barScale(index);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Container(
            width: 12,
            height: 24 + 72 * scale,
            decoration: BoxDecoration(
              color: AppColors.primary500.withValues(alpha: 0.45 + scale * 0.5),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        );
      }),
    );
  }

  String _presetLabel(String preset) {
    switch (preset) {
      case AnimationContent.presetPulseBars:
        return 'Pulse Bars';
      case AnimationContent.presetBouncingDot:
      default:
        return 'Bouncing Dot';
    }
  }
}
