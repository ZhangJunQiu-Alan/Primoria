import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/viewer_page_shell.dart';
import '../components/common/viewer_surface_card.dart';
import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/achievement_display_service.dart';
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
  List<AchievementModel> _pendingAchievements = [];
  Map<String, dynamic> _userStats = const {};
  Map<String, dynamic> _followCounts = const {};
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
      SupabaseService.getAchievementsWithStatus(),
      SupabaseService.getUserStats(),
      SupabaseService.getFollowCounts(),
    ]);
    final pinnedIds = results[0] as List<String>;
    final xpHistory = results[1] as Map<DateTime, int>;
    final allModels = (results[2] as List<Map<String, dynamic>>)
        .map(AchievementModel.fromMap)
        .toList();
    final userStats = (results[3] as Map<String, dynamic>?) ?? {};
    final followCounts = (results[4] as Map<String, dynamic>?) ?? {};

    if (!mounted) return;
    final t = context.read<LanguageProvider>().t;

    bool isEffectivelyUnlocked(AchievementModel achievement) {
      if (achievement.isUnlocked) return true;
      final progress = AchievementDisplayService.buildProgress(
        achievement: achievement,
        userStats: userStats,
        followCounts: followCounts,
        t: t,
      );
      return progress.current >= progress.target;
    }

    final pinned = <AchievementModel>[];
    for (final id in pinnedIds) {
      final match = allModels.where((a) => a.id == id);
      if (match.isNotEmpty) pinned.add(match.first);
    }

    final pending = allModels.where((a) => !isEffectivelyUnlocked(a)).toList()
      ..sort((a, b) {
        final pa = AchievementDisplayService.buildProgress(
          achievement: a,
          userStats: userStats,
          followCounts: followCounts,
          t: t,
        );
        final pb = AchievementDisplayService.buildProgress(
          achievement: b,
          userStats: userStats,
          followCounts: followCounts,
          t: t,
        );
        final ratioCmp = pb.ratio.compareTo(pa.ratio);
        if (ratioCmp != 0) return ratioCmp;
        return a.name.compareTo(b.name);
      });

    setState(() {
      _pinnedAchievements = pinned;
      _pendingAchievements = pending;
      _userStats = userStats;
      _followCounts = followCounts;
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
              Positioned(
                left: avatarSize + 28,
                right: 24,
                bottom: 14,
                child: _buildPinnedAchievementStrip(context, t),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPinnedAchievementStrip(
    BuildContext context,
    AppLocalizations t,
  ) {
    final isNarrow = MediaQuery.sizeOf(context).width < 560;
    final slotSize = isNarrow ? 56.0 : 72.0;
    final slots = List<AchievementModel?>.generate(
      3,
      (index) => index < _pinnedAchievements.length
          ? _pinnedAchievements[index]
          : null,
    );
    return GestureDetector(
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const AchievementWallScreen()),
        );
        _loadGamification();
      },
      child: SizedBox(
        height: slotSize,
        child: _loadingGamification
            ? const Align(
                alignment: Alignment.centerLeft,
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : Row(
                children: slots.map((achievement) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: achievement == null
                        ? _buildDashedPinnedPlaceholder(slotSize)
                        : ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: SizedBox(
                              width: slotSize,
                              height: slotSize,
                              child: Image.asset(
                                AchievementDisplayService.badgeAssetPath(
                                  achievement,
                                ),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Text(
                                    _achievementCategoryEmoji(
                                      achievement.category,
                                    ),
                                    style: TextStyle(fontSize: slotSize * 0.33),
                                  ),
                                ),
                              ),
                            ),
                          ),
                  );
                }).toList(),
              ),
      ),
    );
  }

  Widget _buildDashedPinnedPlaceholder(double size) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _DashedRoundedRectPainter(
          color: const Color(0xFF94A3B8),
          radius: 16,
          dashWidth: 6,
          dashGap: 4,
          strokeWidth: 1.5,
        ),
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
    const cellGap = 2.0;
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
            LayoutBuilder(
              builder: (context, constraints) {
                const minCellSize = 6.0;
                final availableContentWidth = constraints.maxWidth;
                final availableGridWidth =
                    (availableContentWidth - dayLabelWidth - 4).clamp(
                      120.0,
                      double.infinity,
                    );
                final stretchCellSize =
                    (availableGridWidth - (cols - 1) * cellGap) / cols;
                final useScroll = stretchCellSize < minCellSize;
                final dynamicCellSize = useScroll
                    ? minCellSize
                    : stretchCellSize;

                Widget buildCell(int col, int row) {
                  final date = gridStart.add(Duration(days: col * 7 + row));
                  final inRange =
                      !date.isBefore(firstDay) && !date.isAfter(todayKey);
                  if (!inRange) {
                    return SizedBox(
                      width: dynamicCellSize,
                      height: dynamicCellSize,
                    );
                  }
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
                      width: dynamicCellSize,
                      height: dynamicCellSize,
                      decoration: BoxDecoration(
                        color: cellColor(xp),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }

                int? prevMonth;
                final monthRow = <Widget>[];
                for (int col = 0; col < cols; col++) {
                  final date = gridStart.add(Duration(days: col * 7));
                  if (date.month != prevMonth) {
                    prevMonth = date.month;
                    monthRow.add(
                      SizedBox(
                        width: dynamicCellSize,
                        child: Text(
                          monthAbbr[date.month - 1],
                          style: const TextStyle(
                            fontSize: 8,
                            color: Color(0xFF94A3B8),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.clip,
                          softWrap: false,
                        ),
                      ),
                    );
                  } else {
                    monthRow.add(SizedBox(width: dynamicCellSize));
                  }
                  if (col < cols - 1) {
                    monthRow.add(const SizedBox(width: cellGap));
                  }
                }

                final weekRows = <Widget>[];
                for (int row = 0; row < 7; row++) {
                  final cells = <Widget>[];
                  for (int col = 0; col < cols; col++) {
                    cells.add(buildCell(col, row));
                    if (col < cols - 1) {
                      cells.add(const SizedBox(width: cellGap));
                    }
                  }
                  weekRows.add(Row(children: cells));
                  if (row < 6) {
                    weekRows.add(const SizedBox(height: cellGap));
                  }
                }

                final fullGridWidth =
                    cols * dynamicCellSize + (cols - 1) * cellGap;
                final gridContent = SizedBox(
                  width: useScroll ? fullGridWidth : availableGridWidth,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: monthRow),
                      const SizedBox(height: 2),
                      ...weekRows,
                    ],
                  ),
                );

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: List.generate(7, (row) {
                          return Padding(
                            padding: EdgeInsets.only(
                              bottom: row < 6 ? cellGap : 0,
                            ),
                            child: SizedBox(
                              width: dayLabelWidth,
                              height: dynamicCellSize,
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
                    Expanded(
                      child: useScroll
                          ? SingleChildScrollView(
                              controller: _heatmapScrollController,
                              scrollDirection: Axis.horizontal,
                              child: gridContent,
                            )
                          : gridContent,
                    ),
                  ],
                );
              },
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
          else if (_pendingAchievements.isEmpty)
            Center(
              child: Text(
                t.isZh ? '你已完成全部成就 🎉' : 'All achievements completed 🎉',
                style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
              ),
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final items = _pendingAchievements.take(4).toList();
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    mainAxisExtent: 124,
                  ),
                  itemBuilder: (context, index) {
                    final achievement = items[index];
                    final progress = AchievementDisplayService.buildProgress(
                      achievement: achievement,
                      userStats: _userStats,
                      followCounts: _followCounts,
                      t: t,
                    );
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: SizedBox(
                              width: 58,
                              height: 58,
                              child: Image.asset(
                                AchievementDisplayService.badgeAssetPath(
                                  achievement,
                                ),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Center(
                                  child: Text(
                                    _achievementCategoryEmoji(
                                      achievement.category,
                                    ),
                                    style: const TextStyle(fontSize: 26),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        achievement.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF334155),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      progress.counterLabel,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF94A3B8),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 7),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: LinearProgressIndicator(
                                    minHeight: 9,
                                    value: progress.ratio,
                                    backgroundColor: const Color(0xFFE5E7EB),
                                    valueColor: const AlwaysStoppedAnimation(
                                      Color(0xFFFACC15),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 7),
                                Text(
                                  progress.requirement,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
        ],
      ),
    );
  }

  String _achievementCategoryEmoji(String category) {
    switch (category) {
      case 'streak':
        return '🔥';
      case 'challenge':
        return '⚡';
      case 'social':
        return '🌟';
      case 'learning':
      default:
        return '📚';
    }
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

class _DashedRoundedRectPainter extends CustomPainter {
  final Color color;
  final double radius;
  final double dashWidth;
  final double dashGap;
  final double strokeWidth;

  const _DashedRoundedRectPainter({
    required this.color,
    required this.radius,
    required this.dashWidth,
    required this.dashGap,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(strokeWidth / 2),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);

    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final next = (distance + dashWidth).clamp(0, metric.length).toDouble();
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance += dashWidth + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRoundedRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.radius != radius ||
        oldDelegate.dashWidth != dashWidth ||
        oldDelegate.dashGap != dashGap ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
