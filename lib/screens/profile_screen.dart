import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/home/streak_widget.dart';
import '../providers/user_provider.dart';
import '../providers/theme_provider.dart';

/// 个人中心页 - Brilliant 风格
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // 顶部栏
              _buildTopBar(context, isDark),

              // 用户信息卡片
              _buildUserCard(context, isDark),

              // 连续学习天数
              Consumer<UserProvider>(
                builder: (context, userProvider, child) {
                  return Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: StreakDisplayLarge(
                      streakCount: userProvider.streak,
                      longestStreak: userProvider.longestStreak,
                    ),
                  );
                },
              ),

              // 学习统计
              _buildStatsSection(context, isDark),

              // 成就徽章
              _buildAchievementsSection(context, isDark),

              // 设置选项
              _buildSettingsSection(context, isDark),

              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Text(
            '个人中心',
            style: AppTypography.headline2.copyWith(
              color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
            ),
          ),
          const Spacer(),
          IconButton(
            onPressed: () => _showSettingsSheet(context),
            icon: const Icon(Icons.settings_outlined),
            color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(BuildContext context, bool isDark) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        final user = userProvider.user;
        final isLoggedIn = userProvider.isLoggedIn;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.cardDark : AppColors.surface,
            borderRadius: AppRadius.borderRadiusLg,
            boxShadow: isDark ? null : AppShadows.sm,
          ),
          child: Row(
            children: [
              // 头像
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    isLoggedIn && user != null
                        ? user.name.isNotEmpty
                            ? user.name[0].toUpperCase()
                            : 'P'
                        : 'P',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // 用户信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isLoggedIn && user != null ? user.name : 'Primoria 学员',
                      style: AppTypography.headline3.copyWith(
                        color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isLoggedIn && user != null
                          ? '加入于 ${user.joinedAt.year} 年 ${user.joinedAt.month} 月'
                          : '游客模式',
                      style: AppTypography.body2.copyWith(
                        color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    if (isLoggedIn && user != null && user.isPro)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.1),
                          borderRadius: AppRadius.borderRadiusFull,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.star,
                              size: 16,
                              color: AppColors.accent,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Text(
                              'Pro 会员',
                              style: AppTypography.label.copyWith(
                                color: AppColors.accent,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      )
                    else if (!isLoggedIn)
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pushNamed('/login');
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                            vertical: AppSpacing.sm,
                          ),
                        ),
                        child: const Text('登录/注册'),
                      ),
                  ],
                ),
              ),

              // 编辑按钮
              if (isLoggedIn)
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.edit_outlined),
                  color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatsSection(BuildContext context, bool isDark) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '学习统计',
                style: AppTypography.headline3.copyWith(
                  color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.school,
                      value: '${userProvider.completedCourses}',
                      label: '完成课程',
                      color: AppColors.courseMath,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.timer,
                      value: userProvider.totalStudyTime,
                      label: '学习时长',
                      color: AppColors.courseScience,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.check_circle,
                      value: '${userProvider.completedQuestions}',
                      label: '完成题目',
                      color: AppColors.courseCS,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.emoji_events,
                      value: '${userProvider.unlockedAchievements.length}',
                      label: '获得徽章',
                      color: AppColors.courseLogic,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.surface,
        borderRadius: AppRadius.borderRadiusLg,
        boxShadow: isDark ? null : AppShadows.sm,
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: AppTypography.headline2.copyWith(
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            label,
            style: AppTypography.label.copyWith(
              color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievementsSection(BuildContext context, bool isDark) {
    final achievements = [
      _AchievementData('初学者', Icons.emoji_events, AppColors.accent, 'first_course'),
      _AchievementData('连续7天', Icons.local_fire_department, AppColors.primary, 'streak_7'),
      _AchievementData('连续30天', Icons.whatshot, AppColors.error, 'streak_30'),
      _AchievementData('课程达人', Icons.school, AppColors.courseMath, 'courses_10'),
      _AchievementData('百题王', Icons.check_circle, AppColors.courseCS, 'questions_100'),
      _AchievementData('逻辑大师', Icons.psychology, AppColors.courseLogic, 'logic_master'),
    ];

    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '成就徽章',
                    style: AppTypography.headline3.copyWith(
                      color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      '查看全部',
                      style: AppTypography.body2.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                height: 100,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: achievements.length,
                  separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final achievement = achievements[index];
                    final isUnlocked = userProvider.unlockedAchievements
                        .contains(achievement.id);
                    return _buildAchievementBadge(achievement, isUnlocked, isDark);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAchievementBadge(
    _AchievementData achievement,
    bool isUnlocked,
    bool isDark,
  ) {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: isUnlocked
                ? achievement.color.withValues(alpha: 0.1)
                : isDark
                    ? AppColors.surfaceDark
                    : AppColors.surfaceVariant,
            shape: BoxShape.circle,
            border: isUnlocked
                ? Border.all(color: achievement.color, width: 2)
                : null,
          ),
          child: Icon(
            achievement.icon,
            color: isUnlocked
                ? achievement.color
                : isDark
                    ? AppColors.textSecondaryOnDark
                    : AppColors.textDisabled,
            size: 32,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          achievement.name,
          style: AppTypography.labelSmall.copyWith(
            color: isUnlocked
                ? isDark
                    ? AppColors.textOnDark
                    : AppColors.textPrimary
                : isDark
                    ? AppColors.textSecondaryOnDark
                    : AppColors.textDisabled,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsSection(BuildContext context, bool isDark) {
    return Consumer2<ThemeProvider, UserProvider>(
      builder: (context, themeProvider, userProvider, child) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '设置',
                style: AppTypography.headline3.copyWith(
                  color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : AppColors.surface,
                  borderRadius: AppRadius.borderRadiusLg,
                  boxShadow: isDark ? null : AppShadows.sm,
                ),
                child: Column(
                  children: [
                    _buildSettingItem(
                      icon: Icons.notifications_outlined,
                      title: '通知设置',
                      onTap: () {},
                      isDark: isDark,
                    ),
                    _buildDivider(isDark),
                    _buildSettingItem(
                      icon: Icons.language,
                      title: '语言',
                      trailing: '简体中文',
                      onTap: () {},
                      isDark: isDark,
                    ),
                    _buildDivider(isDark),
                    _buildSettingItem(
                      icon: Icons.dark_mode_outlined,
                      title: '深色模式',
                      trailing: themeProvider.themeModeLabel,
                      onTap: () => _showThemePicker(context),
                      isDark: isDark,
                    ),
                    _buildDivider(isDark),
                    _buildSettingItem(
                      icon: Icons.help_outline,
                      title: '帮助与反馈',
                      onTap: () {},
                      isDark: isDark,
                    ),
                    _buildDivider(isDark),
                    _buildSettingItem(
                      icon: Icons.info_outline,
                      title: '关于',
                      onTap: () {},
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              // 退出登录
              if (userProvider.isLoggedIn)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      await userProvider.logout();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('已退出登录')),
                        );
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                    ),
                    child: const Text('退出登录'),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _showThemePicker(BuildContext context) {
    final themeProvider = context.read<ThemeProvider>();

    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppSpacing.md),
              Text(
                '选择主题',
                style: AppTypography.headline3,
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: const Icon(Icons.brightness_auto),
                title: const Text('跟随系统'),
                trailing: themeProvider.themeMode == ThemeMode.system
                    ? const Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () {
                  themeProvider.setThemeMode(ThemeMode.system);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.light_mode),
                title: const Text('浅色模式'),
                trailing: themeProvider.themeMode == ThemeMode.light
                    ? const Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () {
                  themeProvider.setThemeMode(ThemeMode.light);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.dark_mode),
                title: const Text('深色模式'),
                trailing: themeProvider.themeMode == ThemeMode.dark
                    ? const Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () {
                  themeProvider.setThemeMode(ThemeMode.dark);
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        );
      },
    );
  }

  void _showSettingsSheet(BuildContext context) {
    _showThemePicker(context);
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    String? trailing,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            Icon(
              icon,
              color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
              size: 24,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                title,
                style: AppTypography.body1.copyWith(
                  color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                ),
              ),
            ),
            if (trailing != null)
              Text(
                trailing,
                style: AppTypography.body2.copyWith(
                  color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
                ),
              ),
            const SizedBox(width: AppSpacing.sm),
            Icon(
              Icons.chevron_right,
              color: isDark ? AppColors.textSecondaryOnDark : AppColors.textDisabled,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Divider(
      height: 1,
      indent: 56,
      color: isDark ? AppColors.borderDark : AppColors.border,
    );
  }
}

class _AchievementData {
  final String name;
  final IconData icon;
  final Color color;
  final String id;

  _AchievementData(this.name, this.icon, this.color, this.id);
}
