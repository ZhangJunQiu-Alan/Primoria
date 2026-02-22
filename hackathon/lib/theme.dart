import 'package:flutter/material.dart';

class HColors {
  HColors._();

  static const Color bg = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color primary = Color(0xFF00BCD4);
  static const Color purple = Color(0xFF6C63FF);
  static const Color dark = Color(0xFF0F172A);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F172A), Color(0xFF1A1040), Color(0xFF0D2B4E)],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, purple],
  );

  // Feature card accent colors
  static const Color feat1 = Color(0xFF00BCD4);
  static const Color feat2 = Color(0xFF6C63FF);
  static const Color feat3 = Color(0xFF10B981);
  static const Color feat4 = Color(0xFFF59E0B);
}

class HSpacing {
  HSpacing._();

  static const double sectionV = 96.0;
  static const double maxWidth = 1100.0;
}
