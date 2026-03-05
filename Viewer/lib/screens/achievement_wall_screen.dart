import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/achievement_model.dart';
import '../providers/language_provider.dart';
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
  String _selectedCategory = 'all';
  bool _loading = true;
  bool _manageMode = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final results = await Future.wait([
      SupabaseService.getAchievementsWithStatus(),
      SupabaseService.getPinnedAchievementIds(),
    ]);
    if (!mounted) return;
    setState(() {
      _achievements = (results[0] as List<Map<String, dynamic>>)
          .map(AchievementModel.fromMap)
          .toList();
      _pinnedIds = results[1] as List<String>;
      _loading = false;
    });
  }

  List<AchievementModel> get _filtered {
    if (_selectedCategory == 'all') return _achievements;
    return _achievements
        .where((a) => a.category == _selectedCategory)
        .toList();
  }

  Future<void> _togglePin(AchievementModel achievement) async {
    if (!achievement.isUnlocked) return;
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
    final t = context.watch<LanguageProvider>().t;
    final unlockedCount = _achievements.where((a) => a.isUnlocked).length;

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
          : Column(
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
                // Category filter
                _buildCategoryFilter(t),
                // Achievement grid
                Expanded(
                  child: _filtered.isEmpty
                      ? const Center(
                          child: Text(
                            '—',
                            style: TextStyle(color: Color(0xFFCBD5E1)),
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.85,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) =>
                              _achievementCard(_filtered[i], t),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildCategoryFilter(dynamic t) {
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

  Widget _achievementCard(AchievementModel achievement, dynamic t) {
    final style = AchievementService.rarityStyle(achievement.rarity, t.isZh);
    final rarityColor = Color(style.color);
    final isPinned = _pinnedIds.contains(achievement.id);
    final unlocked = achievement.isUnlocked;

    return GestureDetector(
      onTap: _manageMode && unlocked ? () => _togglePin(achievement) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _manageMode && isPinned
                ? rarityColor
                : const Color(0xFFF1F5F9),
            width: _manageMode && isPinned ? 2 : 1,
          ),
          boxShadow: unlocked
              ? [
                  BoxShadow(
                    color: rarityColor.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Pin indicator
            if (_manageMode && unlocked)
              Align(
                alignment: Alignment.topRight,
                child: Icon(
                  isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                  size: 16,
                  color: isPinned ? rarityColor : const Color(0xFFCBD5E1),
                ),
              )
            else
              const SizedBox(height: 16),
            // Icon
            ColorFiltered(
              colorFilter: unlocked
                  ? const ColorFilter.mode(
                      Colors.transparent,
                      BlendMode.saturation,
                    )
                  : const ColorFilter.matrix([
                      0.2126, 0.7152, 0.0722, 0, 0,
                      0.2126, 0.7152, 0.0722, 0, 0,
                      0.2126, 0.7152, 0.0722, 0, 0,
                      0,      0,      0,      1, 0,
                    ]),
              child: Text(
                AchievementService.categoryIcon(achievement.category),
                style: TextStyle(fontSize: unlocked ? 36 : 30),
              ),
            ),
            const SizedBox(height: 8),
            // Rarity pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: unlocked
                    ? rarityColor.withValues(alpha: 0.1)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                style.label,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: unlocked ? rarityColor : const Color(0xFFCBD5E1),
                ),
              ),
            ),
            const SizedBox(height: 6),
            // Name
            Text(
              achievement.name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: unlocked
                    ? const Color(0xFF0F172A)
                    : const Color(0xFFCBD5E1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
