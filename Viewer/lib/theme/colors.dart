import 'package:flutter/material.dart';

/// Primoria app color system (Duolingo + Brilliant blend)
class AppColors {
  AppColors._();

  // Primary color - Duolingo Feather Green
  static const Color primary = Color(0xFF58CC02);
  static const Color primaryLight = Color(0xFF89E219);
  static const Color primaryDark = Color(0xFF4CAD00);

  // Button shadow color (darker green for 3D button bottom)
  static const Color buttonShadow = Color(0xFF46A302);

  // Accent color - Duolingo golden yellow
  static const Color accent = Color(0xFFFFC800);
  static const Color accentLight = Color(0xFFFFD54F);

  // Functional colors
  static const Color success = Color(0xFF58CC02);
  static const Color successLight = Color(0xFF89E219);
  static const Color successDark = Color(0xFF4CAD00);

  static const Color warning = Color(0xFFFF9600);
  static const Color warningLight = Color(0xFFFFB74D);
  static const Color warningDark = Color(0xFFF57C00);

  static const Color error = Color(0xFFFF4B4B);
  static const Color errorLight = Color(0xFFFF8A80);
  static const Color errorDark = Color(0xFFD32F2F);

  // Course category colors (slightly brightened)
  static const Color courseMath = Color(0xFF6C7BD8); // Math - Indigo
  static const Color courseScience = Color(0xFF2EC4B6); // Science - Teal
  static const Color courseCS = Color(0xFF8E67D4); // Computer - Purple
  static const Color courseLogic = Color(0xFFFF5A5F); // Logic - Red
  static const Color courseData = Color(0xFF4DB8FF); // Data - Blue

  // Dark theme background
  static const Color backgroundDark = Color(0xFF1A1A2E);
  static const Color surfaceDark = Color(0xFF16213E);
  static const Color cardDark = Color(0xFF1F2940);

  // Light theme background
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF7F7F7);
  static const Color card = Color(0xFFFFFFFF);

  // Text colors
  static const Color textPrimary = Color(0xFF3C3C3C);
  static const Color textSecondary = Color(0xFFAFAFAF);
  static const Color textDisabled = Color(0xFFBDBDBD);
  static const Color textOnPrimary = Color(0xFFFFFFFF);
  static const Color textOnDark = Color(0xFFFFFFFF);
  static const Color textSecondaryOnDark = Color(0xFFB0B0B0);

  // Border colors
  static const Color border = Color(0xFFE5E5E5);
  static const Color borderLight = Color(0xFFF3F4F6);
  static const Color borderDark = Color(0xFF374151);

  // Slider component colors
  static const Color sliderTrack = Color(0xFFE0E0E0);
  static const Color sliderActive = Color(0xFF58CC02);
  static const Color sliderThumb = Color(0xFF58CC02);

  // Streak fire colors
  static const Color streakFire = Color(0xFFFF9600);
  static const Color streakFireGlow = Color(0xFFFFC800);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [primary, Color(0xFF89E219)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient streakGradient = LinearGradient(
    colors: [streakFire, streakFireGlow],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [backgroundDark, surfaceDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Course card gradients (slightly brightened)
  static const LinearGradient mathGradient = LinearGradient(
    colors: [Color(0xFF6C7BD8), Color(0xFF4F5FC6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient scienceGradient = LinearGradient(
    colors: [Color(0xFF2EC4B6), Color(0xFF0FA896)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient csGradient = LinearGradient(
    colors: [Color(0xFF8E67D4), Color(0xFF6E45BE)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient logicGradient = LinearGradient(
    colors: [Color(0xFFFF5A5F), Color(0xFFE5484D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Indigo palette (from Figma template)
  static const Color indigo = Color(0xFF4F46E5);
  static const Color indigo50 = Color(0xFFEEF2FF);
  static const Color indigo100 = Color(0xFFE0E7FF);
  static const Color indigo200 = Color(0xFFC7D2FE);
  static const Color indigo500 = Color(0xFF6366F1);
  static const Color indigo600 = Color(0xFF4F46E5);
  static const Color indigo700 = Color(0xFF4338CA);

  // Indigo gradient (course logo)
  static const LinearGradient indigoGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Profile banner gradient
  static const LinearGradient profileBannerGradient = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFFA855F7), Color(0xFFEC4899)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  // Galaxy background gradient
  static const LinearGradient galaxyGradient = LinearGradient(
    colors: [Color(0xFF020617), Color(0xFF1E1B4B), Color(0xFF020617)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
