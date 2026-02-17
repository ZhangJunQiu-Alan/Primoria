import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../providers/user_provider.dart';
import '../providers/theme_provider.dart';

/// Profile screen — ported from Figma ProfileScreen template
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: SingleChildScrollView(
          child: Column(
            children: [
              _buildBannerAndAvatar(context),
              _buildUserInfo(context),
              const SizedBox(height: 24),
              _buildStatsCard(context),
              const SizedBox(height: 24),
              _buildDailyBadge(context),
              const SizedBox(height: 24),
              _buildAchievements(context),
              const SizedBox(height: 24),
              _buildSettingsSection(context),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBannerAndAvatar(BuildContext context) {
    return SizedBox(
      height: 220,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Gradient banner
          Container(
            height: 160,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: AppColors.profileBannerGradient,
            ),
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: GestureDetector(
                  onTap: () => _showSettingsSheet(context),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.settings,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Avatar overlapping banner bottom
          Positioned(
            bottom: 0,
            left: 24,
            child: Transform.rotate(
              angle: 0.05, // ~3 degrees
              child: Container(
                width: 96,
                height: 96,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: AppShadows.md,
                ),
                child: Consumer<UserProvider>(
                  builder: (context, userProvider, _) {
                    final user = userProvider.user;
                    final initial = (user != null && user.name.isNotEmpty)
                        ? user.name[0].toUpperCase()
                        : 'A';
                    return Container(
                      decoration: BoxDecoration(
                        color: AppColors.indigo100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            color: AppColors.indigo,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
          // Online indicator
          Positioned(
            bottom: -2,
            left: 100,
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserInfo(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        final user = userProvider.user;
        final name = (user != null && user.name.isNotEmpty)
            ? user.name
            : 'Alex Johnson';
        final handle = user != null
            ? '@${user.name.toLowerCase().replaceAll(' ', '_')}'
            : '@alex_j';
        final joined = user != null
            ? 'Joined ${user.joinedAt.year}'
            : 'Joined 2023';

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$handle · $joined',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatsCard(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              // Row 1: Courses + Total Stars
              Row(
                children: [
                  Expanded(
                    child: _statItem(
                      icon: Icons.menu_book,
                      iconBg: const Color(0xFFD1FAE5),
                      iconColor: const Color(0xFF10B981),
                      value: '${userProvider.completedCourses}',
                      label: 'COURSES',
                    ),
                  ),
                  Expanded(
                    child: _statItem(
                      icon: Icons.star_rounded,
                      iconBg: AppColors.indigo50,
                      iconColor: AppColors.indigo500,
                      value: '3,450',
                      label: 'TOTAL STARS',
                    ),
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Divider(height: 1, color: Color(0xFFF1F5F9)),
              ),
              // Row 2: Following + Fans
              Row(
                children: [
                  Expanded(
                    child: _statItem(
                      icon: Icons.how_to_reg,
                      iconBg: const Color(0xFFDBEAFE),
                      iconColor: const Color(0xFF3B82F6),
                      value: '145',
                      label: 'FOLLOWING',
                    ),
                  ),
                  Expanded(
                    child: _statItem(
                      icon: Icons.people,
                      iconBg: const Color(0xFFFCE7F3),
                      iconColor: const Color(0xFFEC4899),
                      value: '892',
                      label: 'FANS',
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

  Widget _statItem({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 20, color: iconColor),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: Color(0xFF94A3B8),
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDailyBadge(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFAF5FF), Color(0xFFFDF2F8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF3E8FF)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Daily Exclusive Badge',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                      fontSize: 16,
                    ),
                  ),
                  Icon(
                    Icons.auto_awesome,
                    size: 20,
                    color: const Color(0xFFA855F7),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFA855F7), Color(0xFFEC4899)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFA855F7).withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.emoji_events,
                      size: 32,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${userProvider.streak}-Day Streak',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Keep learning to maintain your badge!',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAchievements(BuildContext context) {
    final badges = [
      _Badge(Icons.bolt, const Color(0xFFEAB308), const Color(0xFFFEF9C3)),
      _Badge(Icons.shield, const Color(0xFF10B981), const Color(0xFFD1FAE5)),
      _Badge(
        Icons.star_rounded,
        const Color(0xFFA855F7),
        const Color(0xFFF3E8FF),
      ),
      _Badge(
        Icons.trending_up,
        const Color(0xFF3B82F6),
        const Color(0xFFDBEAFE),
      ),
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Achievements',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                  fontSize: 16,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.indigo50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'View All',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.indigo600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: badges.map((badge) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: Container(
                      decoration: BoxDecoration(
                        color: badge.bg,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x08000000),
                            blurRadius: 2,
                            offset: Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Icon(badge.icon, size: 32, color: badge.color),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Consumer2<ThemeProvider, UserProvider>(
      builder: (context, themeProvider, userProvider, _) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Settings',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Column(
                  children: [
                    _settingItem(
                      Icons.notifications_outlined,
                      'Notifications',
                      onTap: () {},
                    ),
                    const Divider(
                      height: 1,
                      indent: 56,
                      color: Color(0xFFF1F5F9),
                    ),
                    _settingItem(
                      Icons.language,
                      'Language',
                      trailing: 'English',
                      onTap: () {},
                    ),
                    const Divider(
                      height: 1,
                      indent: 56,
                      color: Color(0xFFF1F5F9),
                    ),
                    _settingItem(
                      Icons.dark_mode_outlined,
                      'Dark Mode',
                      trailing: themeProvider.themeModeLabel,
                      onTap: () => _showThemePicker(context),
                    ),
                    const Divider(
                      height: 1,
                      indent: 56,
                      color: Color(0xFFF1F5F9),
                    ),
                    _settingItem(
                      Icons.help_outline,
                      'Help & Feedback',
                      onTap: () {},
                    ),
                    const Divider(
                      height: 1,
                      indent: 56,
                      color: Color(0xFFF1F5F9),
                    ),
                    _settingItem(Icons.info_outline, 'About', onTap: () {}),
                  ],
                ),
              ),
              if (userProvider.isLoggedIn) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      await userProvider.logout();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Logged out successfully'),
                          ),
                        );
                      }
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Logout'),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _settingItem(
    IconData icon,
    String title, {
    String? trailing,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF94A3B8), size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 15, color: Color(0xFF334155)),
              ),
            ),
            if (trailing != null)
              Text(
                trailing,
                style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
              ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
          ],
        ),
      ),
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
              Text('Select Theme', style: AppTypography.headline3),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: const Icon(Icons.brightness_auto),
                title: const Text('Follow System'),
                trailing: themeProvider.themeMode == ThemeMode.system
                    ? Icon(Icons.check, color: AppColors.indigo)
                    : null,
                onTap: () {
                  themeProvider.setThemeMode(ThemeMode.system);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.light_mode),
                title: const Text('Light Mode'),
                trailing: themeProvider.themeMode == ThemeMode.light
                    ? Icon(Icons.check, color: AppColors.indigo)
                    : null,
                onTap: () {
                  themeProvider.setThemeMode(ThemeMode.light);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.dark_mode),
                title: const Text('Dark Mode'),
                trailing: themeProvider.themeMode == ThemeMode.dark
                    ? Icon(Icons.check, color: AppColors.indigo)
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
}

class _Badge {
  final IconData icon;
  final Color color;
  final Color bg;
  const _Badge(this.icon, this.color, this.bg);
}
