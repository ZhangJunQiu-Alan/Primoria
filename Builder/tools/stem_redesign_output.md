Here is a redesigned Flutter UI/UX course editor based on the style you provided. I will create `design_tokens.dart` and `theme.dart`, and update component code to apply the new theme.

**1. `design_tokens.dart`**

```dart
/// Design Tokens - unified design token definitions
/// Reference PRD 5.3 Design Tokens spec
/// Based on STEM tech feel + bright and fresh + modern + education-friendly style

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
  static const Color secondary500 = Color(0xFF4CAF50); // electric green - for emphasis
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
          color: Colors.black.withOpacity(0.04), // lower opacity
          blurRadius: 6, // increase blur
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get md => [
        BoxShadow(
          color: Colors.black.withOpacity(0.08), // lower opacity
          blurRadius: 12, // increase blur
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get lg => [
        BoxShadow(
          color: Colors.black.withOpacity(0.12), // lower opacity
          blurRadius: 18, // increase blur
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get xl => [
        BoxShadow(
          color: Colors.black.withOpacity(0.16), // lower opacity
          blurRadius: 24, // increase blur
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
```

**2. `theme.dart`**

```dart
/// App theme configuration
/// Build a unified theme based on Design Tokens
/// Matches STEM tech feel + bright and fresh + modern + education-friendly style

import 'package:flutter/material.dart';
import 'design_tokens.dart';

class AppTheme {
  AppTheme._();

  /// Light theme
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        fontFamily: 'SF Pro Display', // use a more modern font

        // ColorScheme
        colorScheme: ColorScheme.light(
          primary: AppColors.primary500, // tech blue
          onPrimary: Colors.white,
          secondary: AppColors.secondary500, // electric green
          onSecondary: Colors.white,
          surface: AppColors.surface, // white
          onSurface: AppColors.neutral800,
          error: AppColors.error,
          onError: Colors.white,
          background: AppColors.background, // light background
          onBackground: AppColors.neutral800,
        ),

        // Scaffold background
        scaffoldBackgroundColor: AppColors.background,

        // AppBar theme
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.neutral800,
          elevation: 1, // softer shadow
          centerTitle: true, // centered title
          titleTextStyle: const TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral800,
          ),
        ),

        // Card theme
        cardTheme: CardTheme(
          color: AppColors.surface,
          elevation: 1, // softer shadow
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral200),
          ),
          margin: EdgeInsets.zero, // remove default margin
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
            elevation: 2, // softer shadow
            shadowColor: AppColors.primary500.withOpacity(0.4), // button shadow color
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
            elevation: 0, // remove shadow
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
            borderSide: BorderSide.none, // remove border line
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none, // remove border line
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
        iconTheme: const IconThemeData(
            color: AppColors.neutral600
        ),

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
        fontFamily: 'SF Pro Display', // use a more modern font

        // ColorScheme
        colorScheme: ColorScheme.dark(
          primary: AppColors.primary400, // tech blue
          onPrimary: Colors.white,
          secondary: AppColors.secondary400, // electric green
          onSecondary: Colors.white,
          surface: AppColors.surfaceDark, // dark surface
          onSurface: AppColors.neutral100,
          error: AppColors.error,
          onError: Colors.white,
          background: AppColors.backgroundDark, // dark background
          onBackground: AppColors.neutral100,
        ),

        // Scaffold background
        scaffoldBackgroundColor: AppColors.backgroundDark,

        // AppBar theme
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.surfaceDark,
          foregroundColor: AppColors.neutral100,
          elevation: 1, // softer shadow
          centerTitle: true, // centered title
          titleTextStyle: const TextStyle(
            fontSize: AppFontSize.lg,
            fontWeight: FontWeight.w600,
            color: AppColors.neutral100,
          ),
        ),

        // Card theme
        cardTheme: CardTheme(
          color: AppColors.surfaceDark,
          elevation: 1, // softer shadow
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.lg),
            side: const BorderSide(color: AppColors.neutral700),
          ),
          margin: EdgeInsets.zero, // remove default margin
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
            elevation: 2, // softer shadow
            shadowColor: AppColors.primary500.withOpacity(0.4), // button shadow color
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
            elevation: 0, // remove shadow
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
            borderSide: BorderSide.none, // remove border line
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
            borderSide: BorderSide.none, // remove border line
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
        iconTheme: const IconThemeData(
            color: AppColors.neutral400
        ),

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
```

**3. Component Updates**

Below are code changes to components that reflect the new design tokens. For brevity, only modified code is shown and other files remain unchanged.

```dart
// Update ModulePanel widget
import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../models/block_type.dart';
import '../services/block_registry.dart';

/// Left module panel - shows draggable module list
class ModulePanel extends StatelessWidget {
  const ModulePanel({super.key});

  @override
  Widget build(BuildContext context) {
    final modules = BlockRegistry.mvpTypes;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 120;

        return Container( // add Container
          decoration: BoxDecoration( // apply background and radius
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppBorderRadius.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Panel title / logo
              Container(
                padding: EdgeInsets.all(isCompact ? AppSpacing.sm : AppSpacing.md),
                alignment: isCompact ? Alignment.center : Alignment.centerLeft,
                child: isCompact
                    ? const Icon(
                        Icons.school,
                        color: AppColors.primary500,
                        size: 24,
                      )
                    : const Text(
                        'Module Library',
                        style: TextStyle(
                          fontSize: AppFontSize.md,
                          fontWeight: FontWeight.w600,
                          color: AppColors.neutral800,
                        ),
                      ),
              ),
              const Divider(height: 1),
              // Module list
              Expanded(
                child: ListView.builder(
                  padding: EdgeInsets.all(isCompact ? AppSpacing.xs : AppSpacing.sm),
                  itemCount: modules.length,
                  itemBuilder: (context, index) {
                    final info = modules[index];
                    return _ModuleItem(
                      icon: info.icon,
                      label: info.name,
                      description: info.description,
                      type: info.type,
                      compact: isCompact,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Single module item
class _ModuleItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final BlockType type;
  final bool compact;

  const _ModuleItem({
    required this.icon,
    required this.label,
    required this.description,
    required this.type,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: compact ? AppSpacing.xs : AppSpacing.xs),
      child: Draggable<BlockType>(
        data: type,
        feedback: Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(AppBorderRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary500,
              borderRadius: BorderRadius.circular(AppBorderRadius.md),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: Colors.white, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: AppFontSize.sm,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        childWhenDragging: Opacity(
          opacity: 0.5,
          child: _buildContent(),
        ),
        child: Tooltip(
          message: description,
          child: _buildContent(),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (compact) {
      return Container(
        height: 40,
        width: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.neutral50,
          borderRadius: BorderRadius.circular(AppBorderRadius.md),
          border: Border.all(color: AppColors.neutral200),
        ),
        child: Icon(icon, color: AppColors.neutral600, size: 20),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.neutral50,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.neutral600, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral700,
              ),
            ),
          ),
          const Icon(
            Icons.drag_indicator,
            color: AppColors.neutral300,
            size: 16,
          ),
        ],
      ),
    );
  }
}
```

```dart
// Update PropertyPanel widget
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/design_tokens.dart';
import '../providers/builder_state.dart';
import '../providers/course_provider.dart';
import '../models/models.dart';
import '../services/block_registry.dart';

/// Right properties panel - shows properties for the selected module
class PropertyPanel extends ConsumerWidget {
  const PropertyPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builderState = ref.watch(builderStateProvider);
    final course = ref.watch(courseProvider);
    final selectedBlockId = builderState.selectedBlockId;

    // Find selected block
    Block? selectedBlock;
    if (selectedBlockId != null) {
      final page = course.getPage(builderState.currentPageIndex);
      if (page != null) {
        for (final block in page.blocks) {
          if (block.id == selectedBlockId) {
            selectedBlock = block;
            break;
          }
        }
      }
    }

    return Container(
      decoration: BoxDecoration( // apply background and radius
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        boxShadow: AppShadows.sm, // add shadow
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Panel title
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: const Text(
              'Properties',
              style: TextStyle(
                fontSize: AppFontSize.md,
                fontWeight: FontWeight.w600,
                color: AppColors.neutral800,
              ),
            ),
          ),
          const Divider(height: 1),
          // Properties content
          Expanded(
            child: selectedBlock == null
                ? _buildEmptyState()
                : _BlockPropertyEditor(
                    key: ValueKey(selectedBlock.id),
                    block: selectedBlock,
                    pageIndex: builderState.currentPageIndex,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.touch_app,
              size: 48,
              color: AppColors.neutral300,
            ),
            SizedBox(height: AppSpacing.md),
            Text(
              'Click a module on the canvas\n to view and edit properties',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Block property editor
class _BlockPropertyEditor extends ConsumerStatefulWidget {
  final Block block;
  final int pageIndex;

  const _BlockPropertyEditor({
    super.key,
    required this.block,
    required this.pageIndex,
  });

  @override
  ConsumerState<_BlockPropertyEditor> createState() => _BlockPropertyEditorState();
}

class _BlockPropertyEditorState extends ConsumerState<_BlockPropertyEditor> {
  void _updateBlock(Block updatedBlock) {
    ref.read(courseProvider.notifier).updateBlock(widget.pageIndex, updatedBlock);
    ref.read(builderStateProvider.notifier).markAsUnsaved();
  }

  @override
  Widget build(BuildContext context) {
    final info = BlockRegistry.getInfo(widget.block.type);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        // Module info
        _PropertySection(
          title: 'Module Info',
          children: [
        // ...
```
