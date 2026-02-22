import 'package:flutter/material.dart';
import '../theme.dart';

class SectionLabel extends StatelessWidget {
  final String label;
  const SectionLabel({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: HColors.primary,
        letterSpacing: 2.5,
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final bool isNarrow;
  const SectionTitle({super.key, required this.title, required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      textAlign: TextAlign.center,
      style: TextStyle(
        fontSize: isNarrow ? 30 : 40,
        fontWeight: FontWeight.w800,
        color: HColors.textPrimary,
        height: 1.15,
        letterSpacing: -1.0,
      ),
    );
  }
}
