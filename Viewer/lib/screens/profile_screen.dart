import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/achievement_service.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import '../widgets/star_chain_widget.dart';
import 'achievement_wall_screen.dart';
import 'profile_settings_screen.dart';

enum _ProfileMenuAction { settings, about, help, logout }

/// Profile screen with gamification: pinned achievements, XP, star chain.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<AchievementModel> _pinnedAchievements = [];
  Set<String> _activeDates = {};
  bool _loadingGamification = true;

  @override
  void initState() {
    super.initState();
    _loadGamification();
  }

  Future<void> _loadGamification() async {
    final results = await Future.wait([
      SupabaseService.getPinnedAchievementIds(),
      SupabaseService.getActiveDates(),
    ]);
    final pinnedIds = results[0] as List<String>;
    final activeDates = results[1] as Set<String>;

    List<AchievementModel> pinned = [];
    if (pinnedIds.isNotEmpty) {
      final all = await SupabaseService.getAchievementsWithStatus();
      final allModels = all.map(AchievementModel.fromMap).toList();
      // Preserve pinned order
      for (final id in pinnedIds) {
        final match = allModels.where((a) => a.id == id).toList();
        if (match.isNotEmpty) pinned.add(match.first);
      }
    }

    if (!mounted) return;
    setState(() {
      _pinnedAchievements = pinned;
      _activeDates = activeDates;
      _loadingGamification = false;
    });
  }

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
              _buildStarChainCard(context, t),
              const SizedBox(height: 24),
              _buildPinnedAchievements(context, t),
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
              angle: 0.05,
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
              Row(
                children: [
                  Expanded(
                    child: _statItem(
                      icon: Icons.local_fire_department_rounded,
                      iconBg: const Color(0xFFFEF3C7),
                      iconColor: const Color(0xFFF59E0B),
                      value: '${userProvider.streak}',
                      label: t.resultStreakLabel,
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

  Widget _buildStarChainCard(BuildContext context, AppLocalizations t) {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.profileStarThisWeek,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 14),
          StarChainWidget(activeDates: _activeDates),
        ],
      ),
    );
  }

  Widget _buildPinnedAchievements(BuildContext context, AppLocalizations t) {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                t.profileMyAchievements,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const AchievementWallScreen(),
                    ),
                  );
                  // Refresh in case pins changed
                  _loadGamification();
                },
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
          if (_loadingGamification)
            const Center(
              child: SizedBox(
                height: 40,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else if (_pinnedAchievements.isEmpty)
            Center(
              child: Text(
                t.profileNoPinnedAchievements,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFFCBD5E1),
                ),
              ),
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.start,
              children: _pinnedAchievements.map((achievement) {
                final style = AchievementService.rarityStyle(
                  achievement.rarity,
                  t.isZh,
                );
                final color = Color(style.color);
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: color.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            AchievementService.categoryIcon(
                              achievement.category,
                            ),
                            style: const TextStyle(fontSize: 28),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: 64,
                        child: Text(
                          achievement.name,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const AchievementWallScreen(),
                ),
              );
              _loadGamification();
            },
            child: Text(
              t.profileViewAllAchievements,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.indigo500,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

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
                    Text(
                      t.profileLogoutTitle,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 8),
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
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: isLoggingOut
                                ? null
                                : () => Navigator.of(ctx).pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              side: const BorderSide(
                                color: Color(0xFFE2E8F0),
                              ),
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
                        Expanded(
                          child: FilledButton(
                            onPressed: isLoggingOut
                                ? null
                                : () async {
                                    setDialogState(
                                      () => isLoggingOut = true,
                                    );
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
