import 'package:flutter/material.dart';

/// Primoria app color system (Brilliant style)
class AppColors {
  AppColors._();

  // Primary color - Brilliant style orange-yellow
  static const Color primary = Color(0xFFFF6B00);
  static const Color primaryLight = Color(0xFFFF9500);
  static const Color primaryDark = Color(0xFFE55A00);

  // Accent color
  static const Color accent = Color(0xFFFFB800);
  static const Color accentLight = Color(0xFFFFD54F);

  // Functional colors
  static const Color success = Color(0xFF00C853);
  static const Color successLight = Color(0xFF69F0AE);
  static const Color successDark = Color(0xFF00A844);

  static const Color warning = Color(0xFFFF9800);
  static const Color warningLight = Color(0xFFFFB74D);
  static const Color warningDark = Color(0xFFF57C00);

  static const Color error = Color(0xFFFF5252);
  static const Color errorLight = Color(0xFFFF8A80);
  static const Color errorDark = Color(0xFFD32F2F);

  // Course category colors
  static const Color courseMath = Color(0xFF5C6BC0);      // Math - Indigo
  static const Color courseScience = Color(0xFF26A69A);   // Science - Teal
  static const Color courseCS = Color(0xFF7E57C2);        // Computer - Purple
  static const Color courseLogic = Color(0xFFEF5350);     // Logic - Red
  static const Color courseData = Color(0xFF42A5F5);      // Data - Blue

  // Dark theme background
  static const Color backgroundDark = Color(0xFF1A1A2E);
  static const Color surfaceDark = Color(0xFF16213E);
  static const Color cardDark = Color(0xFF1F2940);

  // Light theme background
  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF5F5F5);
  static const Color card = Color(0xFFFFFFFF);

  // Text colors
  static const Color textPrimary = Color(0xFF1A1A2E);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textDisabled = Color(0xFFBDBDBD);
  static const Color textOnPrimary = Color(0xFFFFFFFF);
  static const Color textOnDark = Color(0xFFFFFFFF);
  static const Color textSecondaryOnDark = Color(0xFFB0B0B0);

  // Border colors
  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFF3F4F6);
  static const Color borderDark = Color(0xFF374151);

  // Slider component colors
  static const Color sliderTrack = Color(0xFFE0E0E0);
  static const Color sliderActive = Color(0xFFFF6B00);
  static const Color sliderThumb = Color(0xFFFF6B00);

  // Streak fire colors
  static const Color streakFire = Color(0xFFFF6B00);
  static const Color streakFireGlow = Color(0xFFFFB800);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [primary, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [backgroundDark, surfaceDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Course card gradients
  static const LinearGradient mathGradient = LinearGradient(
    colors: [Color(0xFF5C6BC0), Color(0xFF3F51B5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient scienceGradient = LinearGradient(
    colors: [Color(0xFF26A69A), Color(0xFF00897B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient csGradient = LinearGradient(
    colors: [Color(0xFF7E57C2), Color(0xFF5E35B1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient logicGradient = LinearGradient(
    colors: [Color(0xFFEF5350), Color(0xFFE53935)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
