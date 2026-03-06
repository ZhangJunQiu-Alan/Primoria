import 'package:flutter/material.dart';

/// Unified surface card style for Viewer pages.
class ViewerSurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double radius;
  final Color? backgroundColor;
  final BorderSide? borderSide;
  final List<BoxShadow>? shadows;

  const ViewerSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin,
    this.radius = 16,
    this.backgroundColor,
    this.borderSide,
    this.shadows,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(radius),
        border: Border.fromBorderSide(
          borderSide ?? const BorderSide(color: Color(0xFFF1F5F9)),
        ),
        boxShadow:
            shadows ??
            const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
      ),
      child: child,
    );
  }
}
