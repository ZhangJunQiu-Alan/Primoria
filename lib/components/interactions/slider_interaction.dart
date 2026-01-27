import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/theme.dart';
import '../../models/unit_model.dart';

/// 滑块互动组件
class InteractiveSlider extends StatefulWidget {
  final SliderConfig config;
  final String description;
  final ValueChanged<double> onChanged;
  final double? initialValue;

  const InteractiveSlider({
    super.key,
    required this.config,
    required this.description,
    required this.onChanged,
    this.initialValue,
  });

  @override
  State<InteractiveSlider> createState() => _InteractiveSliderState();
}

class _InteractiveSliderState extends State<InteractiveSlider>
    with SingleTickerProviderStateMixin {
  late double _currentValue;
  bool _isDragging = false;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _currentValue = widget.initialValue ?? widget.config.defaultValue;

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _onChangeStart(double value) {
    setState(() => _isDragging = true);
    _animationController.forward();
    HapticFeedback.selectionClick();
  }

  void _onChanged(double value) {
    // 根据 step 进行吸附
    final step = widget.config.step;
    final snappedValue = (value / step).round() * step;

    setState(() => _currentValue = snappedValue);
    widget.onChanged(snappedValue);
  }

  void _onChangeEnd(double value) {
    setState(() => _isDragging = false);
    _animationController.reverse();
    HapticFeedback.lightImpact();
  }

  Color _parseColor(String? colorHex, Color defaultColor) {
    if (colorHex == null) return defaultColor;
    try {
      return Color(int.parse(colorHex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return defaultColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = widget.config;
    final activeColor = _parseColor(config.activeColor, AppColors.sliderActive);
    final trackColor = _parseColor(config.trackColor, AppColors.sliderTrack);
    final thumbColor = _parseColor(config.thumbColor, AppColors.sliderThumb);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 题目描述
        Padding(
          padding: AppSpacing.horizontalMd,
          child: Text(
            widget.description,
            style: AppTypography.body1,
            textAlign: TextAlign.center,
          ),
        ),
        AppSpacing.verticalGapLg,

        // 当前值显示
        if (config.showValue) ...[
          AnimatedBuilder(
            animation: _scaleAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: _isDragging
                        ? activeColor.withValues(alpha: 0.1)
                        : AppColors.surfaceVariant,
                    borderRadius: AppRadius.borderRadiusLg,
                    border: Border.all(
                      color: _isDragging ? activeColor : AppColors.border,
                      width: _isDragging ? 2 : 1,
                    ),
                  ),
                  child: Text(
                    '${_currentValue.toStringAsFixed(config.step < 1 ? 1 : 0)}${config.unit}',
                    style: AppTypography.valueMedium.copyWith(
                      color: _isDragging ? activeColor : AppColors.primary,
                    ),
                  ),
                ),
              );
            },
          ),
          AppSpacing.verticalGapLg,
        ],

        // 滑块
        Padding(
          padding: AppSpacing.horizontalMd,
          child: Column(
            children: [
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  activeTrackColor: activeColor,
                  inactiveTrackColor: trackColor,
                  thumbColor: thumbColor,
                  overlayColor: activeColor.withValues(alpha: 0.2),
                  trackHeight: 8,
                  thumbShape: _CustomThumbShape(
                    thumbRadius: _isDragging ? 16 : 14,
                    thumbElevation: _isDragging ? 8 : 4,
                  ),
                  overlayShape: RoundSliderOverlayShape(
                    overlayRadius: _isDragging ? 28 : 24,
                  ),
                ),
                child: Slider(
                  value: _currentValue,
                  min: config.min,
                  max: config.max,
                  divisions: ((config.max - config.min) / config.step).round(),
                  onChangeStart: _onChangeStart,
                  onChanged: _onChanged,
                  onChangeEnd: _onChangeEnd,
                ),
              ),

              // 最小/最大标签
              Padding(
                padding: AppSpacing.horizontalSm,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      config.labels?.minLabel ?? '${config.min.toInt()}',
                      style: AppTypography.label,
                    ),
                    Text(
                      config.labels?.maxLabel ?? '${config.max.toInt()}',
                      style: AppTypography.label,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // 单位提示
        AppSpacing.verticalGapMd,
        Text(
          '单位: ${config.unit}',
          style: AppTypography.label.copyWith(color: AppColors.textDisabled),
        ),
      ],
    );
  }
}

/// 自定义滑块形状
class _CustomThumbShape extends SliderComponentShape {
  final double thumbRadius;
  final double thumbElevation;

  const _CustomThumbShape({
    required this.thumbRadius,
    required this.thumbElevation,
  });

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) {
    return Size.fromRadius(thumbRadius);
  }

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final canvas = context.canvas;

    // 绘制阴影
    final shadowPath = Path()
      ..addOval(Rect.fromCircle(center: center, radius: thumbRadius));
    canvas.drawShadow(shadowPath, Colors.black, thumbElevation, true);

    // 绘制白色边框
    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, thumbRadius, borderPaint);

    // 绘制彩色内圆
    final thumbPaint = Paint()
      ..color = sliderTheme.thumbColor ?? AppColors.sliderThumb
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, thumbRadius - 3, thumbPaint);
  }
}
