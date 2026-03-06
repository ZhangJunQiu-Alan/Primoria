import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/viewer_page_shell.dart';
import '../components/common/viewer_surface_card.dart';
import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/achievement_service.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import '../utils/role_routes.dart';
import 'achievement_wall_screen.dart';
import 'profile_settings_screen.dart';

enum _ProfileMenuAction { parentDashboard, settings, about, help, logout }

/// Profile screen with gamification: pinned achievements, XP, star chain.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<AchievementModel> _pinnedAchievements = [];
  Map<DateTime, int> _xpHistory = {};
  bool _loadingGamification = true;
  final ScrollController _heatmapScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadGamification();
  }

  @override
  void dispose() {
    _heatmapScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadGamification() async {
    final results = await Future.wait([
      SupabaseService.getPinnedAchievementIds(),
      SupabaseService.getDailyXpHistory(),
    ]);
    final pinnedIds = results[0] as List<String>;
    final xpHistory = results[1] as Map<DateTime, int>;

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
      _xpHistory = xpHistory;
      _loadingGamification = false;
    });

    // Scroll heatmap to the right (most recent) after layout.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_heatmapScrollController.hasClients) {
        _heatmapScrollController.jumpTo(
          _heatmapScrollController.position.maxScrollExtent,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    return ViewerPageShell(
      preset: ViewerContentWidthPreset.profile,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildBannerAndAvatar(context, t),
            _buildUserInfo(context, t),
            const SizedBox(height: 16),
            _buildQuickActions(context, t),
            const SizedBox(height: 24),
            _buildStatsCard(context, t),
            const SizedBox(height: 24),
            _buildXpHeatmap(context, t),
            const SizedBox(height: 24),
            _buildPinnedAchievements(context, t),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildBannerAndAvatar(BuildContext context, AppLocalizations t) {
    final topPadding = MediaQuery.of(context).padding.top;
    // Banner height + avatar overlap area below banner.
    const bannerHeight = 160.0;
    const avatarSize = 96.0;
    const avatarOverlap = 36.0; // how much avatar sticks below banner
    final totalHeight = topPadding + bannerHeight + avatarSize - avatarOverlap;

    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        final user = userProvider.user;
        final coverImageUrl = user?.coverImageUrl;
        final hasCover =
            coverImageUrl != null && coverImageUrl.trim().isNotEmpty;
        final isParent = RoleRoutes.isParentRole(user?.role);

        return SizedBox(
          height: totalHeight,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Cover image or gradient banner — extends to absolute top
              SizedBox(
                height: topPadding + bannerHeight,
                width: double.infinity,
                child: hasCover
                    ? Image.network(
                        coverImageUrl,
                        fit: BoxFit.cover,
                        alignment: Alignment.topCenter,
                        errorBuilder: (_, __, ___) => Container(
                          decoration: const BoxDecoration(
                            gradient: AppColors.profileBannerGradient,
                          ),
                        ),
                      )
                    : Container(
                        decoration: const BoxDecoration(
                          gradient: AppColors.profileBannerGradient,
                        ),
                      ),
              ),
              // Menu button — positioned below safe area
              Positioned(
                top: topPadding + 8,
                right: 16,
                child: PopupMenuButton<_ProfileMenuAction>(
                  tooltip: '',
                  onSelected: (action) =>
                      _onProfileMenuSelected(context, action),
                  itemBuilder: (context) => [
                    if (isParent)
                      PopupMenuItem(
                        value: _ProfileMenuAction.parentDashboard,
                        child: Text(t.parentDashboardTitle),
                      ),
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
              // Avatar overlapping banner bottom
              Positioned(
                bottom: 0,
                left: 24,
                child: Transform.rotate(
                  angle: 0.05,
                  child: Container(
                    width: avatarSize,
                    height: avatarSize,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: AppShadows.md,
                    ),
                    child: Builder(
                      builder: (context) {
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
                left: avatarSize + 4,
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
      },
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

  Widget _buildQuickActions(BuildContext context, AppLocalizations t) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: FilledButton.tonalIcon(
              onPressed: () async {
                final updated = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) => const ProfileSettingsScreen(),
                  ),
                );
                if (updated == true && context.mounted) {
                  await context.read<UserProvider>().refreshProfile();
                }
              },
              icon: const Icon(Icons.settings_outlined, size: 18),
              label: Text(t.profileSettings),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF8FAFC),
                foregroundColor: const Color(0xFF334155),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const AchievementWallScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.workspace_premium_outlined, size: 18),
              label: Text(t.profileAchievements),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.indigo600,
                side: const BorderSide(color: Color(0xFFE0E7FF)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCard(BuildContext context, AppLocalizations t) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, _) {
        return ViewerSurfaceCard(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(20),
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

  Widget _buildXpHeatmap(BuildContext context, AppLocalizations t) {
    const cellSize = 10.0;
    const cellGap = 2.0;
    const cellStep = cellSize + cellGap; // 12 px per column
    const cols = 53;
    const dayLabelWidth = 24.0;

    final now = DateTime.now();
    final todayKey = DateTime.utc(now.year, now.month, now.day);
    final firstDay = todayKey.subtract(const Duration(days: 364));
    // Snap to Monday of that week (Dart weekday: 1=Mon … 7=Sun).
    final daysToMon = firstDay.weekday - 1;
    final gridStart = firstDay.subtract(Duration(days: daysToMon));

    // Year-to-date total XP.
    final yearStart = DateTime.utc(now.year, 1, 1);
    int yearTotal = 0;
    for (final entry in _xpHistory.entries) {
      if (!entry.key.isBefore(yearStart)) yearTotal += entry.value;
    }

    Color cellColor(int xp) {
      if (xp <= 0) return const Color(0xFFEEF2FF);
      if (xp <= 30) return const Color(0xFFC7D2FE);
      if (xp <= 80) return const Color(0xFF818CF8);
      if (xp <= 150) return const Color(0xFF4F46E5);
      return const Color(0xFF3730A3);
    }

    final isZh = t.isZh;
    final dayLabels = isZh
        ? ['一', '', '三', '', '五', '', '']
        : ['M', '', 'W', '', 'F', '', ''];

    final monthAbbr = isZh
        ? [
            '1月',
            '2月',
            '3月',
            '4月',
            '5月',
            '6月',
            '7月',
            '8月',
            '9月',
            '10月',
            '11月',
            '12月',
          ]
        : [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];

    // Build a single cell widget for (col, row).
    Widget buildCell(int col, int row) {
      final date = gridStart.add(Duration(days: col * 7 + row));
      final inRange = !date.isBefore(firstDay) && !date.isAfter(todayKey);
      if (!inRange) return SizedBox(width: cellSize, height: cellSize);
      final xp = _xpHistory[date] ?? 0;
      return GestureDetector(
        onTap: () {
          final local = DateTime(date.year, date.month, date.day);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(t.profileXpHeatmapDay(local, xp)),
              duration: const Duration(seconds: 2),
            ),
          );
        },
        child: Container(
          width: cellSize,
          height: cellSize,
          decoration: BoxDecoration(
            color: cellColor(xp),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      );
    }

    // Month label row (53 cells wide).
    int? prevMonth;
    final monthRow = <Widget>[];
    for (int col = 0; col < cols; col++) {
      final date = gridStart.add(Duration(days: col * 7));
      if (date.month != prevMonth) {
        prevMonth = date.month;
        monthRow.add(
          SizedBox(
            width: cellStep,
            child: Text(
              monthAbbr[date.month - 1],
              style: const TextStyle(fontSize: 8, color: Color(0xFF94A3B8)),
              overflow: TextOverflow.visible,
              softWrap: false,
            ),
          ),
        );
      } else {
        monthRow.add(SizedBox(width: cellStep));
      }
    }

    // 7 weekday rows.
    final weekRows = <Widget>[];
    for (int row = 0; row < 7; row++) {
      final cells = <Widget>[];
      for (int col = 0; col < cols; col++) {
        cells.add(buildCell(col, row));
        if (col < cols - 1) cells.add(const SizedBox(width: cellGap));
      }
      weekRows.add(Row(children: cells));
      if (row < 6) weekRows.add(const SizedBox(height: cellGap));
    }

    // Legend row.
    final legendColors = [
      const Color(0xFFEEF2FF),
      const Color(0xFFC7D2FE),
      const Color(0xFF818CF8),
      const Color(0xFF4F46E5),
      const Color(0xFF3730A3),
    ];
    final labelStyle = const TextStyle(fontSize: 10, color: Color(0xFF94A3B8));
    final legend = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(isZh ? '少' : 'Less', style: labelStyle),
        const SizedBox(width: 4),
        ...legendColors.map(
          (c) => Padding(
            padding: const EdgeInsets.only(right: 2),
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: c,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
        Text(isZh ? '多' : 'More', style: labelStyle),
      ],
    );

    return ViewerSurfaceCard(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row
          Row(
            children: [
              Text(
                t.profileXpHeatmapTitle,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              Text(
                t.profileXpHeatmapTotal(yearTotal),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Grid or shimmer
          if (_loadingGamification)
            Container(
              height: 100,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Day-of-week labels (Mon/Wed/Fri)
                Padding(
                  padding: const EdgeInsets.only(top: 14), // skip month row
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: List.generate(7, (row) {
                      return Padding(
                        padding: EdgeInsets.only(bottom: row < 6 ? cellGap : 0),
                        child: SizedBox(
                          width: dayLabelWidth,
                          height: cellSize,
                          child: Text(
                            dayLabels[row],
                            style: const TextStyle(
                              fontSize: 8,
                              color: Color(0xFF94A3B8),
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(width: 4),
                // Scrollable grid (month row + 7 weekday rows)
                Expanded(
                  child: SingleChildScrollView(
                    controller: _heatmapScrollController,
                    scrollDirection: Axis.horizontal,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: monthRow),
                        const SizedBox(height: 2),
                        ...weekRows,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          const SizedBox(height: 10),
          // Legend
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [legend]),
        ],
      ),
    );
  }

  Widget _buildPinnedAchievements(BuildContext context, AppLocalizations t) {
    return ViewerSurfaceCard(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
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
                style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
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
      case _ProfileMenuAction.parentDashboard:
        Navigator.of(context).pushNamed(RoleRoutes.parentDashboard);
        break;
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
