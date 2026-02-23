import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../theme/theme.dart';
import 'profile_settings_screen.dart';

enum _ProfileMenuAction { settings, about, help, logout }

/// Profile screen — ported from Figma ProfileScreen template
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: SingleChildScrollView(
          child: Column(
            children: [
              _buildBannerAndAvatar(context, t),
              _buildUserInfo(context, t),
              const SizedBox(height: 24),
              _buildStatsCard(context, t),
              const SizedBox(height: 24),
              _buildDailyBadge(context, t),
              const SizedBox(height: 24),
              _buildAchievements(context, t),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBannerAndAvatar(BuildContext context, AppLocalizations t) {
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
                child: PopupMenuButton<_ProfileMenuAction>(
                  tooltip: '',
                  onSelected: (action) =>
                      _onProfileMenuSelected(context, action),
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: _ProfileMenuAction.settings,
                      child: Text(t.profileSettings),
                    ),
                    PopupMenuItem(
                      value: _ProfileMenuAction.about,
                      child: Text(t.profileAbout),
                    ),
                    PopupMenuItem(
                      value: _ProfileMenuAction.help,
                      child: Text(t.profileHelp),
                    ),
                    const PopupMenuDivider(),
                    PopupMenuItem(
                      value: _ProfileMenuAction.logout,
                      child: Text(t.profileLogoutTitle),
                    ),
                  ],
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.menu_rounded,
                      color: Colors.white,
                      size: 22,
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
                    final avatarProvider = _avatarImageProvider(
                      user?.avatarUrl,
                    );
                    final initial = (user != null && user.name.isNotEmpty)
                        ? user.name[0].toUpperCase()
                        : 'A';
                    return Container(
                      decoration: BoxDecoration(
                        color: AppColors.indigo100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: avatarProvider != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Image(
                                image: avatarProvider,
                                fit: BoxFit.cover,
                              ),
                            )
                          : Center(
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

  ImageProvider<Object>? _avatarImageProvider(String? avatarUrl) {
    final raw = avatarUrl?.trim() ?? '';
    if (raw.isEmpty) return null;
    if (raw.startsWith('data:image')) {
      final comma = raw.indexOf(',');
      if (comma <= 0 || comma >= raw.length - 1) return null;
      try {
        final bytes = base64Decode(raw.substring(comma + 1));
        return MemoryImage(bytes);
      } catch (_) {
        return null;
      }
    }
    return NetworkImage(raw);
  }

  Widget _buildUserInfo(BuildContext context, AppLocalizations t) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        final user = userProvider.user;
        final name = (user != null && user.name.isNotEmpty)
            ? user.name
            : 'Alex Johnson';
        final handleName = name.toLowerCase().replaceAll(' ', '_');
        final handle = '@$handleName';
        final joined = user != null
            ? t.profileJoinedAtMonthYear(user.joinedAt)
            : t.profileJoinedAtMonthYear(DateTime(2023, 1, 1));

        final bio = user?.bio;

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
              if (bio != null && bio.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  bio,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatsCard(BuildContext context, AppLocalizations t) {
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
              // Row 1: Courses + Total XP
              Row(
                children: [
                  Expanded(
                    child: _statItem(
                      icon: Icons.menu_book,
                      iconBg: const Color(0xFFD1FAE5),
                      iconColor: const Color(0xFF10B981),
                      value: '${userProvider.completedCourses}',
                      label: t.profileCourses,
                    ),
                  ),
                  Expanded(
                    child: _statItem(
                      icon: Icons.star_rounded,
                      iconBg: AppColors.indigo50,
                      iconColor: AppColors.indigo500,
                      value: _formatStat(userProvider.totalXp),
                      label: t.profileTotalXp,
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
                      value: _formatStat(userProvider.followingCount),
                      label: t.profileFollowing,
                    ),
                  ),
                  Expanded(
                    child: _statItem(
                      icon: Icons.people,
                      iconBg: const Color(0xFFFCE7F3),
                      iconColor: const Color(0xFFEC4899),
                      value: _formatStat(userProvider.followersCount),
                      label: t.profileFans,
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

  Widget _buildDailyBadge(BuildContext context, AppLocalizations t) {
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
                  Text(
                    t.profileDailyBadge,
                    style: const TextStyle(
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
                        t.profileStreakDays(userProvider.streak),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        t.profileBadgeSubtitle,
                        style: const TextStyle(
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

  Widget _buildAchievements(BuildContext context, AppLocalizations t) {
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
              Text(
                t.profileAchievements,
                style: const TextStyle(
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
                  t.profileViewAll,
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

  /// Format a stat number: 1200 → "1.2K", 1000000 → "1M", etc.
  static String _formatStat(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 10000) return '${(n / 1000).round()}K';
    if (n >= 1000) {
      final s = n.toString();
      return '${s.substring(0, s.length - 3)},${s.substring(s.length - 3)}';
    }
    return '$n';
  }

  Future<void> _onProfileMenuSelected(
    BuildContext context,
    _ProfileMenuAction action,
  ) async {
    final t = context.read<LanguageProvider>().t;
    switch (action) {
      case _ProfileMenuAction.settings:
        final updated = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => const ProfileSettingsScreen()),
        );
        if (updated == true && context.mounted) {
          await context.read<UserProvider>().refreshProfile();
        }
        break;
      case _ProfileMenuAction.about:
        _showInfoDialog(
          context,
          title: t.profileAbout,
          body: t.profileAboutBody,
        );
        break;
      case _ProfileMenuAction.help:
        _showInfoDialog(context, title: t.profileHelp, body: t.profileHelpBody);
        break;
      case _ProfileMenuAction.logout:
        _showLogoutDialog(context, context.read<UserProvider>(), t);
        break;
    }
  }

  void _showInfoDialog(
    BuildContext context, {
    required String title,
    required String body,
  }) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(context.read<LanguageProvider>().t.cancel),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(
    BuildContext context,
    UserProvider userProvider,
    AppLocalizations t,
  ) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        bool isLoggingOut = false;

        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return Dialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              backgroundColor: Colors.white,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 32, 28, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Warning icon
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.logout_rounded,
                        size: 32,
                        color: AppColors.error,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Title
                    Text(
                      t.profileLogoutTitle,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Body
                    Text(
                      t.profileLogoutBody,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Buttons
                    Row(
                      children: [
                        // Cancel
                        Expanded(
                          child: OutlinedButton(
                            onPressed: isLoggingOut
                                ? null
                                : () => Navigator.of(ctx).pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              foregroundColor: const Color(0xFF64748B),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              t.cancel,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Confirm logout
                        Expanded(
                          child: FilledButton(
                            onPressed: isLoggingOut
                                ? null
                                : () async {
                                    setDialogState(() => isLoggingOut = true);
                                    await userProvider.logout();
                                    if (context.mounted) {
                                      Navigator.of(
                                        context,
                                      ).pushReplacementNamed('/login');
                                    }
                                  },
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.error,
                              disabledBackgroundColor: AppColors.error
                                  .withValues(alpha: 0.5),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: isLoggingOut
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(
                                    t.profileLogoutConfirm,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _Badge {
  final IconData icon;
  final Color color;
  final Color bg;
  const _Badge(this.icon, this.color, this.bg);
}
