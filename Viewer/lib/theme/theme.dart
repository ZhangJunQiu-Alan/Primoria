import 'package:flutter/material.dart';
import 'colors.dart';
import 'typography.dart';
import 'spacing.dart';

export 'colors.dart';
export 'typography.dart';
export 'spacing.dart';

/// Primoria app theme (Duolingo + Brilliant blend)
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.background,

      // Color scheme
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
      ),

      // AppBar theme
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTypography.title,
      ),

      // Button theme - Duolingo 3D raised style
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return AppColors.border;
            return AppColors.primary;
          }),
          foregroundColor: WidgetStateProperty.all(AppColors.textOnPrimary),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(
              horizontal: 28,
              vertical: 16,
            ),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: AppRadius.borderRadiusFull,
            ),
          ),
          textStyle: WidgetStateProperty.all(AppTypography.button),
          elevation: WidgetStateProperty.all(0),
          shadowColor: WidgetStateProperty.all(Colors.transparent),
          overlayColor: WidgetStateProperty.all(AppColors.primaryDark.withValues(alpha: 0.2)),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(
            horizontal: 28,
            vertical: 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.borderRadiusFull,
          ),
          side: const BorderSide(color: AppColors.primary, width: 2),
          textStyle: AppTypography.button.copyWith(color: AppColors.primary),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTypography.button.copyWith(color: AppColors.primary),
        ),
      ),

      // Card theme - rounder
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderRadiusXl,
        ),
        margin: EdgeInsets.zero,
      ),

      // Input field theme - rounder with green focus
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.error),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        hintStyle: AppTypography.body1.copyWith(color: AppColors.textDisabled),
      ),

      // Slider theme - green
      sliderTheme: SliderThemeData(
        activeTrackColor: AppColors.sliderActive,
        inactiveTrackColor: AppColors.sliderTrack,
        thumbColor: AppColors.sliderThumb,
        overlayColor: AppColors.primary.withValues(alpha: 0.2),
        trackHeight: 8,
        thumbShape: const RoundSliderThumbShape(
          enabledThumbRadius: 14,
          elevation: 4,
        ),
        overlayShape: const RoundSliderOverlayShape(overlayRadius: 24),
      ),

      // Dialog theme - rounder
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderRadiusXxl,
        ),
        titleTextStyle: AppTypography.headline3,
        contentTextStyle: AppTypography.body1,
      ),

      // Progress indicator theme - green
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.border,
      ),
    );
  }

  /// Dark theme
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundDark,

      // Color scheme
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceDark,
        error: AppColors.error,
      ),

      // AppBar theme
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceDark,
        foregroundColor: AppColors.textOnDark,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTypography.title.copyWith(color: AppColors.textOnDark),
      ),

      // Button theme - Duolingo 3D raised style
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return AppColors.borderDark;
            return AppColors.primary;
          }),
          foregroundColor: WidgetStateProperty.all(AppColors.textOnPrimary),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(
              horizontal: 28,
              vertical: 16,
            ),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: AppRadius.borderRadiusFull,
            ),
          ),
          textStyle: WidgetStateProperty.all(AppTypography.button),
          elevation: WidgetStateProperty.all(0),
          shadowColor: WidgetStateProperty.all(Colors.transparent),
          overlayColor: WidgetStateProperty.all(AppColors.primaryDark.withValues(alpha: 0.2)),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(
            horizontal: 28,
            vertical: 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.borderRadiusFull,
          ),
          side: const BorderSide(color: AppColors.primary, width: 2),
          textStyle: AppTypography.button.copyWith(color: AppColors.primary),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTypography.button.copyWith(color: AppColors.primary),
        ),
      ),

      // Card theme - rounder
      cardTheme: CardThemeData(
        color: AppColors.cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderRadiusXl,
        ),
        margin: EdgeInsets.zero,
      ),

      // Input field theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.cardDark,
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderRadiusLg,
          borderSide: const BorderSide(color: AppColors.error),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        hintStyle: AppTypography.body1.copyWith(color: AppColors.textSecondaryOnDark),
      ),

      // Slider theme
      sliderTheme: SliderThemeData(
        activeTrackColor: AppColors.sliderActive,
        inactiveTrackColor: AppColors.borderDark,
        thumbColor: AppColors.sliderThumb,
        overlayColor: AppColors.primary.withValues(alpha: 0.2),
        trackHeight: 8,
        thumbShape: const RoundSliderThumbShape(
          enabledThumbRadius: 14,
          elevation: 4,
        ),
        overlayShape: const RoundSliderOverlayShape(overlayRadius: 24),
      ),

      // Dialog theme
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderRadiusXxl,
        ),
        titleTextStyle: AppTypography.headline3.copyWith(color: AppColors.textOnDark),
        contentTextStyle: AppTypography.body1.copyWith(color: AppColors.textOnDark),
      ),

      // Progress indicator theme
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.borderDark,
      ),

      // Text theme
      textTheme: TextTheme(
        headlineLarge: AppTypography.headline1.copyWith(color: AppColors.textOnDark),
        headlineMedium: AppTypography.headline2.copyWith(color: AppColors.textOnDark),
        headlineSmall: AppTypography.headline3.copyWith(color: AppColors.textOnDark),
        titleLarge: AppTypography.title.copyWith(color: AppColors.textOnDark),
        bodyLarge: AppTypography.body1.copyWith(color: AppColors.textOnDark),
        bodyMedium: AppTypography.body2.copyWith(color: AppColors.textSecondaryOnDark),
        labelLarge: AppTypography.label.copyWith(color: AppColors.textSecondaryOnDark),
      ),

      // Icon theme
      iconTheme: const IconThemeData(
        color: AppColors.textOnDark,
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: AppColors.borderDark,
      ),
    );
  }
}
