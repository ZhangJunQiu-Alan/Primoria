/// Design Tokens - 统一的设计令牌定义
/// 参考 PRD 5.3 Design Tokens 规范
/// 基于 STEM 科技感 + 明亮清新 + 现代感 + 教育友好 设计风格

import 'package:flutter/material.dart';

/// 颜色令牌
class AppColors {
  AppColors._();

  // Primary 颜色 (科技蓝)
  static const Color primary50 = Color(0xFFE0F7FA); // 浅蓝
  static const Color primary100 = Color(0xFFB2EBF2);
  static const Color primary200 = Color(0xFF80DEEA);
  static const Color primary300 = Color(0xFF4DD0E1);
  static const Color primary400 = Color(0xFF26C6DA);
  static const Color primary500 = Color(0xFF00BCD4); // 科技蓝 - 主要品牌色
  static const Color primary600 = Color(0xFF00ACC1);
  static const Color primary700 = Color(0xFF0097A7);
  static const Color primary800 = Color(0xFF00838F);
  static const Color primary900 = Color(0xFF006064);

  // Secondary 颜色 (电子绿)
  static const Color secondary50 = Color(0xFFE8F5E9); // 浅绿
  static const Color secondary100 = Color(0xFFC8E6C9);
  static const Color secondary200 = Color(0xFFA5D6A7);
  static const Color secondary300 = Color(0xFF81C784);
  static const Color secondary400 = Color(0xFF66BB6A);
  static const Color secondary500 = Color(0xFF4CAF50); // 电子绿 - 用于强调
  static const Color secondary600 = Color(0xFF43A047);
  static const Color secondary700 = Color(0xFF388E3C);
  static const Color secondary800 = Color(0xFF2E7D32);
  static const Color secondary900 = Color(0xFF1B5E20);

  // Accent 颜色 (活力橙)
  static const Color accent50 = Color(0xFFFFF3E0); // 浅橙
  static const Color accent100 = Color(0xFFFFE0B2);
  static const Color accent200 = Color(0xFFFFCC80);
  static const Color accent300 = Color(0xFFFFB74D);
  static const Color accent400 = Color(0xFFFF9800);
  static const Color accent500 = Color(0xFFFB8C00); // 活力橙 - 用于点缀
  static const Color accent600 = Color(0xFFF57C00);
  static const Color accent700 = Color(0xFFEF6C00);
  static const Color accent800 = Color(0xFFE65100);
  static const Color accent900 = Color(0xFFBF360C);

  // Neutral 颜色
  static const Color neutral50 = Color(0xFFFAFAFA); // 最浅灰 - 用于背景
  static const Color neutral100 = Color(0xFFF5F5F5); // 浅灰 - 用于卡片背景
  static const Color neutral200 = Color(0xFFEEEEEE); // 边框色
  static const Color neutral300 = Color(0xFFE0E0E0); // 分割线，禁用状态
  static const Color neutral400 = Color(0xFFBDBDBD); // placeholder 文本
  static const Color neutral500 = Color(0xFF9E9E9E); // 二级文本
  static const Color neutral600 = Color(0xFF757575); // 主要文本
  static const Color neutral700 = Color(0xFF616161); // 标题
  static const Color neutral800 = Color(0xFF424242); // 副标题
  static const Color neutral900 = Color(0xFF212121); // 重要文字、icon

  // 语义颜色
  static const Color success = Color(0xFF43A047); // 成功
  static const Color error = Color(0xFFE53935); // 错误
  static const Color warning = Color(0xFFFDD835); // 警告
  static const Color info = Color(0xFF29B6F6); // 信息

  // 背景颜色
  static const Color background = Color(0xFFF8F9FA); // 浅色背景
  static const Color surface = Color(0xFFFFFFFF); // 白色表面
  static const Color backgroundDark = Color(0xFF303030); // 深色背景
  static const Color surfaceDark = Color(0xFF424242); // 深色表面

  // Glassmorphism 玻璃态
  static const Color glassWhite = Color(0xCCFFFFFF); // 半透明白色
  static const Color glassBlack = Color(0xCC000000); // 半透明黑色
}

/// 间距令牌
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

/// 字体大小令牌
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

/// 圆角令牌
class AppBorderRadius {
  AppBorderRadius._();

  static const double none = 0.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double pill = 40.0; // 药丸型
  static const double circle = 50.0; // 正圆形
  static const double full = 9999.0;
}

/// 阴影令牌
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

/// 动效时间令牌
class AppDurations {
  AppDurations._();

  static const Duration fast = Duration(milliseconds: 150);
  static const Duration moderate = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
}
