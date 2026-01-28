/// 应用主题配置
/// 基于 Design Tokens 构建统一主题

import 'package:flutter/material.dart';
import 'design_tokens.dart';

class AppTheme {
  AppTheme._();

  /// 亮色主题
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: ColorScheme.light(
          primary: AppColors.primary500,
          onPrimary: Colors.white,
          secondary: AppColors.primary400,
          onSecondary: Colors.white,
          surface: AppColors.surface,
          onSurface: AppColors.neutral800,
          error: AppColors.error,
          onError: Colors.white,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.neutral800,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral200),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary500,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary500,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            side: const BorderSide(color: AppColors.primary500),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary500,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.neutral50,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.neutral200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.neutral200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: const BorderSide(color: AppColors.primary500, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.neutral200,
          thickness: 1,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: AppFontSize.xxxl,
            fontWeight: FontWeight.bold,
            color: AppColors.neutral900,
          ),
          headlineMedium: TextStyle(
            fontSize: AppFontSize.xxl,
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
          bodyLarge: TextStyle(
            fontSize: AppFontSize.md,
            color: AppColors.neutral700,
          ),
          bodyMedium: TextStyle(
            fontSize: AppFontSize.sm,
            color: AppColors.neutral600,
          ),
          labelLarge: TextStyle(
            fontSize: AppFontSize.sm,
            fontWeight: FontWeight.w500,
            color: AppColors.neutral600,
          ),
        ),
      );

  /// 暗色主题
  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.dark(
          primary: AppColors.primary400,
          onPrimary: Colors.white,
          secondary: AppColors.primary300,
          onSecondary: Colors.white,
          surface: AppColors.surfaceDark,
          onSurface: AppColors.neutral100,
          error: AppColors.error,
          onError: Colors.white,
        ),
        scaffoldBackgroundColor: AppColors.backgroundDark,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surfaceDark,
          foregroundColor: AppColors.neutral100,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: AppColors.surfaceDark,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral700),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary500,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.neutral700,
          thickness: 1,
        ),
      );
}
