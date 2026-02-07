/// App theme configuration
/// Build a unified theme based on Design Tokens
/// Matches STEM tech feel + bright and fresh + modern + education-friendly style
library;

import 'package:flutter/material.dart';
import 'design_tokens.dart';

class AppTheme {
  AppTheme._();

  /// Light theme
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,

        // ColorScheme configuration
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary500, // tech blue
          onPrimary: Colors.white,
          secondary: AppColors.secondary500, // electric green
          onSecondary: Colors.white,
          tertiary: AppColors.accent500, // vibrant orange
          onTertiary: Colors.white,
          surface: AppColors.surface, // white
          onSurface: AppColors.neutral800,
          error: AppColors.error,
          onError: Colors.white,
        ),

        // Scaffold background
        scaffoldBackgroundColor: AppColors.background,

        // AppBar theme
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.neutral800,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
        ),

        // Card theme
        cardTheme: CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral200),
          ),
          margin: EdgeInsets.zero,
        ),

        // ElevatedButton theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary500,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
              vertical: AppSpacing.md,
            ),
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            elevation: 2,
            shadowColor: AppColors.primary500.withValues(alpha: 0.4),
          ),
        ),

        // OutlinedButton theme
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary500,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
              vertical: AppSpacing.md,
            ),
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            side: const BorderSide(color: AppColors.primary500),
            elevation: 0,
          ),
        ),

        // TextButton theme
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary500,
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),

        // InputDecoration theme
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.neutral50,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.primary500, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.error, width: 2),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.error, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          floatingLabelStyle: const TextStyle(
            color: AppColors.primary500,
            fontSize: AppFontSize.sm,
          ),
          labelStyle: const TextStyle(
            color: AppColors.neutral600,
            fontSize: AppFontSize.md,
          ),
          hintStyle: const TextStyle(
            color: AppColors.neutral400,
            fontSize: AppFontSize.md,
          ),
        ),

        // Divider theme
        dividerTheme: const DividerThemeData(
          color: AppColors.neutral200,
          thickness: 1,
        ),

        // IconTheme
        iconTheme: const IconThemeData(color: AppColors.neutral600),

        // TextTheme
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: AppFontSize.huge,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral900,
          ),
          displayMedium: TextStyle(
            fontSize: AppFontSize.xxxl,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral900,
          ),
          displaySmall: TextStyle(
            fontSize: AppFontSize.xxl,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral900,
          ),
          headlineLarge: TextStyle(
            fontSize: AppFontSize.xxl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
          headlineMedium: TextStyle(
            fontSize: AppFontSize.xl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
          headlineSmall: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
          titleLarge: TextStyle(
            fontSize: AppFontSize.xl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
          titleMedium: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral700,
          ),
          titleSmall: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral700,
          ),
          bodyLarge: TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
          bodyMedium: TextStyle(
            fontSize: AppFontSize.sm,
            color: AppColors.neutral600,
          ),
          bodySmall: TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral600,
          ),
          labelLarge: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral600,
          ),
          labelMedium: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral600,
          ),
          labelSmall: TextStyle(
            fontSize: AppFontSize.xxs,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral600,
          ),
        ),
      );

  /// Dark theme
  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,

        // ColorScheme configuration
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary400, // tech blue
          onPrimary: Colors.white,
          secondary: AppColors.secondary400, // electric green
          onSecondary: Colors.white,
          tertiary: AppColors.accent400, // vibrant orange
          onTertiary: Colors.white,
          surface: AppColors.surfaceDark, // dark surface
          onSurface: AppColors.neutral100,
          error: AppColors.error,
          onError: Colors.white,
        ),

        // Scaffold background
        scaffoldBackgroundColor: AppColors.backgroundDark,

        // AppBar theme
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surfaceDark,
          foregroundColor: AppColors.neutral100,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
        ),

        // Card theme
        cardTheme: CardThemeData(
          color: AppColors.surfaceDark,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral700),
          ),
          margin: EdgeInsets.zero,
        ),

        // ElevatedButton theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary500,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
              vertical: AppSpacing.md,
            ),
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            elevation: 2,
            shadowColor: AppColors.primary500.withValues(alpha: 0.4),
          ),
        ),

        // OutlinedButton theme
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary400,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
              vertical: AppSpacing.md,
            ),
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            side: const BorderSide(color: AppColors.primary400),
            elevation: 0,
          ),
        ),

        // TextButton theme
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary400,
            textStyle: const TextStyle(
              fontSize: AppFontSize.md,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),

        // InputDecoration theme
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.neutral800,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.primary400, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.error, width: 2),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.error, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          floatingLabelStyle: const TextStyle(
            color: AppColors.primary400,
            fontSize: AppFontSize.sm,
          ),
          labelStyle: const TextStyle(
            color: AppColors.neutral500,
            fontSize: AppFontSize.md,
          ),
          hintStyle: const TextStyle(
            color: AppColors.neutral400,
            fontSize: AppFontSize.md,
          ),
        ),

        // Divider theme
        dividerTheme: const DividerThemeData(
          color: AppColors.neutral700,
          thickness: 1,
        ),

        // IconTheme
        iconTheme: const IconThemeData(color: AppColors.neutral400),

        // TextTheme
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: AppFontSize.huge,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral100,
          ),
          displayMedium: TextStyle(
            fontSize: AppFontSize.xxxl,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral100,
          ),
          displaySmall: TextStyle(
            fontSize: AppFontSize.xxl,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral100,
          ),
          headlineLarge: TextStyle(
            fontSize: AppFontSize.xxl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
          headlineMedium: TextStyle(
            fontSize: AppFontSize.xl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
          headlineSmall: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
          titleLarge: TextStyle(
            fontSize: AppFontSize.xl,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
          titleMedium: TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral200,
          ),
          titleSmall: TextStyle(
            fontSize: AppFontSize.md,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral200,
          ),
          bodyLarge: TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral200,
          ),
          bodyMedium: TextStyle(
            fontSize: AppFontSize.sm,
            color: AppColors.neutral300,
          ),
          bodySmall: TextStyle(
            fontSize: AppFontSize.xs,
            color: AppColors.neutral300,
          ),
          labelLarge: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral300,
          ),
          labelMedium: TextStyle(
            fontSize: AppFontSize.xs,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral300,
          ),
          labelSmall: TextStyle(
            fontSize: AppFontSize.xxs,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral300,
          ),
        ),
      );
}
