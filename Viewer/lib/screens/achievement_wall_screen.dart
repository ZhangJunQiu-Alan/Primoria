import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
import '../services/achievement_display_service.dart';
import '../services/achievement_service.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';

/// Full achievement wall — filter by category, manage pinned.
class AchievementWallScreen extends StatefulWidget {
  const AchievementWallScreen({super.key});

  @override
  State<AchievementWallScreen> createState() => _AchievementWallScreenState();
}

class _AchievementWallScreenState extends State<AchievementWallScreen> {
  List<AchievementModel> _achievements = [];
  List<String> _pinnedIds = [];
  Map<String, dynamic> _userStats = const {};
  Map<String, dynamic> _followCounts = const {};
  String _selectedCategory = 'all';
  bool _loading = true;
  bool _manageMode = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final results = await Future.wait([
        SupabaseService.getAchievementsWithStatus(),
        SupabaseService.getPinnedAchievementIds(),
        SupabaseService.getUserStats(),
        SupabaseService.getFollowCounts(),
      ]);
      if (!mounted) return;
      setState(() {
        _achievements = AchievementDisplayService.curatedAchievements(
          (results[0] as List<Map<String, dynamic>>)
              .map(AchievementModel.fromMap)
              .toList(),
        );
        _pinnedIds = results[1] as List<String>;
        _userStats = (results[2] as Map<String, dynamic>?) ?? {};
        _followCounts = (results[3] as Map<String, dynamic>?) ?? {};
        _loading = false;
      });
      await _syncDerivedUnlocks();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'load_failed';
      });
    }
  }

  List<AchievementModel> _filtered(AppLocalizations t) {
    final list = _selectedCategory == 'all'
        ? [..._achievements]
        : _achievements
              .where(
                (a) =>
                    AchievementDisplayService.displayCategory(a) ==
                    _selectedCategory,
              )
              .toList();
    list.sort((a, b) {
      final aUnlocked = _isEffectivelyUnlocked(a, t);
      final bUnlocked = _isEffectivelyUnlocked(b, t);
      if (aUnlocked != bUnlocked) {
        return aUnlocked ? -1 : 1;
      }
      return AchievementDisplayService.sortIndex(
        a,
      ).compareTo(AchievementDisplayService.sortIndex(b));
    });
    return list;
  }

  bool _isEffectivelyUnlocked(
    AchievementModel achievement,
    AppLocalizations t,
  ) {
    if (achievement.isUnlocked) return true;
    final progress = AchievementDisplayService.buildProgress(
      achievement: achievement,
      userStats: _userStats,
      followCounts: _followCounts,
      t: t,
    );
    return progress.current >= progress.target;
  }

  Future<void> _syncDerivedUnlocks() async {
    if (!mounted || _achievements.isEmpty) return;
    final t = context.read<LanguageProvider>().t;
    final unlockables = _achievements
        .where((a) => !a.isUnlocked && _isEffectivelyUnlocked(a, t))
        .toList();
    if (unlockables.isEmpty) return;

    await Future.wait(
      unlockables.map((a) => SupabaseService.unlockAchievement(a.id)),
    );
    if (!mounted) return;

    final refreshed = await SupabaseService.getAchievementsWithStatus();
    if (!mounted) return;
    setState(() {
      _achievements = AchievementDisplayService.curatedAchievements(
        refreshed.map(AchievementModel.fromMap).toList(),
      );
    });
  }

  Future<void> _togglePin(AchievementModel achievement) async {
    final t = context.read<LanguageProvider>().t;
    if (!_isEffectivelyUnlocked(achievement, t)) return;
    List<String> updated;
    if (_pinnedIds.contains(achievement.id)) {
      updated = _pinnedIds.where((id) => id != achievement.id).toList();
    } else {
      if (_pinnedIds.length >= 3) {
        updated = [..._pinnedIds.skip(1), achievement.id];
      } else {
        updated = [..._pinnedIds, achievement.id];
      }
    }
    await SupabaseService.savePinnedAchievementIds(updated);
    if (!mounted) return;
    setState(() => _pinnedIds = updated);
  }

  @override
  Widget build(BuildContext context) {
    final AppLocalizations t = context.watch<LanguageProvider>().t;
    final filtered = _filtered(t);
    final unlockedCount = _achievements
        .where((a) => _isEffectivelyUnlocked(a, t))
        .length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          color: const Color(0xFF0F172A),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          t.achievementWallTitle,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
        ),
        actions: [
          if (!_loading)
            TextButton(
              onPressed: () => setState(() => _manageMode = !_manageMode),
              child: Text(
                _manageMode ? t.achievementContinue : t.achievementManage,
                style: TextStyle(
                  color: AppColors.indigo600,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
          ? _buildLoadError(t)
          : LayoutBuilder(
              builder: (context, constraints) {
                final viewportWidth = constraints.maxWidth;
                final isDesktop = viewportWidth >= 1024;
                final contentWidth = isDesktop
                    ? (viewportWidth * 0.6).clamp(0.0, 1320.0)
                    : viewportWidth;
                final gridColumns = isDesktop ? 2 : 1;

                return Center(
                  child: SizedBox(
                    width: contentWidth,
                    child: Column(
                      children: [
                        // Count + manage hint
                        Container(
                          width: double.infinity,
                          color: Colors.white,
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.achievementWallCount(
                                  unlockedCount,
                                  _achievements.length,
                                ),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              if (_manageMode) ...[
                                const SizedBox(height: 4),
                                Text(
                                  t.achievementManageHint,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.indigo500,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        _buildCategoryFilter(t),
                        Expanded(
                          child: filtered.isEmpty
                              ? _buildEmptyState(t)
                              : GridView.builder(
                                  padding: const EdgeInsets.fromLTRB(
                                    16,
                                    16,
                                    16,
                                    24,
                                  ),
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: gridColumns,
                                        crossAxisSpacing: 12,
                                        mainAxisSpacing: 12,
                                        mainAxisExtent: 196,
                                      ),
                                  itemCount: filtered.length,
                                  itemBuilder: (context, i) =>
                                      _achievementCard(filtered[i], t),
                                ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildLoadError(AppLocalizations t) {
    final message = t.isZh ? '成就加载失败，请重试。' : 'Failed to load achievements.';
    final retry = t.isZh ? '重试' : 'Retry';
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFF94A3B8)),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: _loadData, child: Text(retry)),
        ],
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations t) {
    final message = t.isZh
        ? '当前分类暂无成就。'
        : 'No achievements in this category yet.';
    return Center(
      child: Text(
        message,
        style: const TextStyle(
          fontSize: 14,
          color: Color(0xFFCBD5E1),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildCategoryFilter(AppLocalizations t) {
    final categories = [
      ('all', t.achievementCategoryAll),
      ('streak', t.achievementCategoryStreak),
      ('learning', t.achievementCategoryLearning),
      ('challenge', t.achievementCategoryChallenge),
      ('social', t.achievementCategorySocial),
    ];

    return Container(
      color: Colors.white,
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, i) {
          final (slug, label) = categories[i];
          final active = _selectedCategory == slug;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = slug),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? AppColors.indigo500 : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : const Color(0xFF64748B),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _achievementCard(AchievementModel achievement, AppLocalizations t) {
    final isCompact = MediaQuery.sizeOf(context).width < 430;
    final badgeSize = isCompact ? 88.0 : 104.0;
    final badgeRadius = AchievementDisplayService.usesCuratedBadge(achievement)
        ? 24.0
        : 18.0;
    final usesCuratedBadge = AchievementDisplayService.usesCuratedBadge(
      achievement,
    );
    final titleSize = isCompact ? 17.0 : 19.0;
    final style = AchievementService.rarityStyle(achievement.rarity, t.isZh);
    final rarityColor = Color(style.color);
    final isPinned = _pinnedIds.contains(achievement.id);
    final unlocked = _isEffectivelyUnlocked(achievement, t);
    final progress = AchievementDisplayService.buildProgress(
      achievement: achievement,
      userStats: _userStats,
      followCounts: _followCounts,
      t: t,
    );
    final displayName = AchievementDisplayService.displayName(
      achievement,
      t: t,
    );
    final requirement = progress.requirement;

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: _manageMode && unlocked ? () => _togglePin(achievement) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: _manageMode && isPinned
                ? rarityColor
                : const Color(0xFFE2E8F0),
            width: _manageMode && isPinned ? 2 : 1,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x120F172A),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Opacity(
                  opacity: unlocked ? 1 : 0.62,
                  child: Container(
                    width: badgeSize,
                    height: badgeSize,
                    padding: EdgeInsets.all(usesCuratedBadge ? 10 : 0),
                    decoration: BoxDecoration(
                      color: usesCuratedBadge
                          ? Colors.white
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(badgeRadius),
                      border: usesCuratedBadge
                          ? Border.all(color: const Color(0xFFE2E8F0))
                          : null,
                      boxShadow: usesCuratedBadge
                          ? const [
                              BoxShadow(
                                color: Color(0x140F172A),
                                blurRadius: 16,
                                offset: Offset(0, 8),
                              ),
                            ]
                          : null,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Image.asset(
                      AchievementDisplayService.badgeAssetPath(achievement),
                      fit: usesCuratedBadge ? BoxFit.contain : BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: rarityColor.withValues(alpha: 0.16),
                        alignment: Alignment.center,
                        child: Text(
                          AchievementService.categoryIcon(achievement.category),
                          style: const TextStyle(fontSize: 34),
                        ),
                      ),
                    ),
                  ),
                ),
                if (!unlocked)
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x140F172A),
                            blurRadius: 10,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.lock_rounded,
                        color: Color(0xFF64748B),
                        size: 16,
                      ),
                    ),
                  ),
                if (_manageMode && unlocked)
                  Positioned(
                    top: -6,
                    right: -6,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: isPinned ? rarityColor : Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isPinned
                              ? rarityColor
                              : const Color(0xFFCBD5E1),
                        ),
                      ),
                      child: Icon(
                        isPinned
                            ? Icons.check_rounded
                            : Icons.push_pin_outlined,
                        size: 14,
                        color: isPinned
                            ? Colors.white
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: titleSize,
                            fontWeight: FontWeight.w700,
                            color: unlocked
                                ? const Color(0xFF0F172A)
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        progress.counterLabel,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: unlocked
                              ? const Color(0xFF64748B)
                              : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      minHeight: 12,
                      value: progress.ratio,
                      backgroundColor: const Color(0xFFE2E8F0),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        unlocked ? rarityColor : const Color(0xFF818CF8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    requirement,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _chip(
                        _categoryLabel(
                          AchievementDisplayService.displayCategory(
                            achievement,
                          ),
                          t,
                        ),
                      ),
                      _chip(
                        style.label,
                        background: unlocked
                            ? rarityColor.withValues(alpha: 0.12)
                            : const Color(0xFFF1F5F9),
                        textColor: unlocked
                            ? rarityColor
                            : const Color(0xFF94A3B8),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(
    String text, {
    Color background = const Color(0xFFF1F5F9),
    Color textColor = const Color(0xFF64748B),
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: textColor,
        ),
      ),
    );
  }

  String _categoryLabel(String category, AppLocalizations t) {
    switch (category) {
      case 'streak':
        return t.achievementCategoryStreak;
      case 'challenge':
        return t.achievementCategoryChallenge;
      case 'social':
        return t.achievementCategorySocial;
      case 'learning':
        return t.achievementCategoryLearning;
      default:
        return t.achievementCategoryAll;
    }
  }
}
