/// Design Tokens - unified design token definitions
/// Reference PRD 5.3 Design Tokens spec
/// Based on STEM tech feel + bright and fresh + modern + education-friendly style
library;

import 'package:flutter/material.dart';

/// Color tokens
class AppColors {
  AppColors._();

  // Primary colors (tech blue)
  static const Color primary50 = Color(0xFFE0F7FA); // light blue
  static const Color primary100 = Color(0xFFB2EBF2);
  static const Color primary200 = Color(0xFF80DEEA);
  static const Color primary300 = Color(0xFF4DD0E1);
  static const Color primary400 = Color(0xFF26C6DA);
  static const Color primary500 = Color(0xFF00BCD4); // tech blue - primary brand color
  static const Color primary600 = Color(0xFF00ACC1);
  static const Color primary700 = Color(0xFF0097A7);
  static const Color primary800 = Color(0xFF00838F);
  static const Color primary900 = Color(0xFF006064);

  // Secondary colors (electric green)
  static const Color secondary50 = Color(0xFFE8F5E9); // light green
  static const Color secondary100 = Color(0xFFC8E6C9);
  static const Color secondary200 = Color(0xFFA5D6A7);
  static const Color secondary300 = Color(0xFF81C784);
  static const Color secondary400 = Color(0xFF66BB6A);
  static const Color secondary500 = Color(0xFF4CAF50); // electric green - accent
  static const Color secondary600 = Color(0xFF43A047);
  static const Color secondary700 = Color(0xFF388E3C);
  static const Color secondary800 = Color(0xFF2E7D32);
  static const Color secondary900 = Color(0xFF1B5E20);

  // Accent colors (vibrant orange)
  static const Color accent50 = Color(0xFFFFF3E0); // light orange
  static const Color accent100 = Color(0xFFFFE0B2);
  static const Color accent200 = Color(0xFFFFCC80);
  static const Color accent300 = Color(0xFFFFB74D);
  static const Color accent400 = Color(0xFFFF9800);
  static const Color accent500 = Color(0xFFFB8C00); // vibrant orange - accent
  static const Color accent600 = Color(0xFFF57C00);
  static const Color accent700 = Color(0xFFEF6C00);
  static const Color accent800 = Color(0xFFE65100);
  static const Color accent900 = Color(0xFFBF360C);

  // Neutral colors
  static const Color neutral50 = Color(0xFFFAFAFA); // lightest gray - background
  static const Color neutral100 = Color(0xFFF5F5F5); // light gray - card background
  static const Color neutral200 = Color(0xFFEEEEEE); // border color
  static const Color neutral300 = Color(0xFFE0E0E0); // divider, disabled
  static const Color neutral400 = Color(0xFFBDBDBD); // placeholder text
  static const Color neutral500 = Color(0xFF9E9E9E); // secondary text
  static const Color neutral600 = Color(0xFF757575); // primary text
  static const Color neutral700 = Color(0xFF616161); // title
  static const Color neutral800 = Color(0xFF424242); // subtitle
  static const Color neutral900 = Color(0xFF212121); // important text, icons

  // Semantic colors
  static const Color success = Color(0xFF43A047); // success
  static const Color error = Color(0xFFE53935); // error
  static const Color warning = Color(0xFFFDD835); // warning
  static const Color info = Color(0xFF29B6F6); // info

  // Background colors
  static const Color background = Color(0xFFF8F9FA); // light background
  static const Color surface = Color(0xFFFFFFFF); // white surface
  static const Color backgroundDark = Color(0xFF303030); // dark background
  static const Color surfaceDark = Color(0xFF424242); // dark surface

  // Glassmorphism
  static const Color glassWhite = Color(0xCCFFFFFF); // translucent white
  static const Color glassBlack = Color(0xCC000000); // translucent black
}

/// Spacing tokens
class AppSpacing {
  AppSpacing._();

  static const double xxs = 2.0;
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

/// Font size tokens
class AppFontSize {
  AppFontSize._();

  static const double xxs = 10.0;
  static const double xs = 12.0;
  static const double sm = 14.0;
  static const double md = 16.0;
  static const double lg = 18.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  static const double huge = 48.0;
}

/// Border radius tokens
class AppBorderRadius {
  AppBorderRadius._();

  static const double none = 0.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double pill = 40.0; // pill shape
  static const double circle = 50.0; // circle
  static const double full = 9999.0;
}

/// Shadow tokens
class AppShadows {
  AppShadows._();

  static List<BoxShadow> get sm => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get md => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get lg => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.12),
          blurRadius: 18,
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get xl => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.16),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];
}

/// Motion duration tokens
class AppDurations {
  AppDurations._();

  static const Duration fast = Duration(milliseconds: 150);
  static const Duration moderate = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
}
