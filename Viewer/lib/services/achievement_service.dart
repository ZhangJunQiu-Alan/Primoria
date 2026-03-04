import 'package:flutter/foundation.dart';
import '../models/achievement_model.dart';
import 'supabase_service.dart';

/// Checks achievement conditions after lesson completion and returns
/// any newly unlocked achievements.
class AchievementService {
  AchievementService._();

  // ── Condition checkers ───────────────────────────────────────
  // Each checker returns true if the slug should be awarded.

  static bool _check(
    String slug,
    Map<String, dynamic> stats,
    Map<String, dynamic> lessonResult,
  ) {
    final streak = (stats['current_streak'] as num?)?.toInt() ?? 0;
    final lessonsCompleted = (stats['lessons_completed'] as num?)?.toInt() ?? 0;
    final coursesCompleted = (stats['courses_completed'] as num?)?.toInt() ?? 0;
    final accuracyPct = (lessonResult['accuracy_pct'] as num?)?.toInt() ?? 0;
    final timeSpentSeconds =
        (lessonResult['time_spent_seconds'] as num?)?.toInt() ?? 0;

    switch (slug) {
      // Streak
      case 'streak_3':
        return streak >= 3;
      case 'streak_7':
        return streak >= 7;
      case 'streak_30':
        return streak >= 30;
      case 'streak_100':
        return streak >= 100;
      // Learning
      case 'first_lesson':
        return lessonsCompleted >= 1;
      case 'first_course':
        return coursesCompleted >= 1;
      case 'courses_5':
        return coursesCompleted >= 5;
      case 'lessons_100':
        return lessonsCompleted >= 100;
      case 'courses_50':
        return coursesCompleted >= 50;
      // Challenge
      case 'perfect_lesson':
        return accuracyPct == 100;
      case 'speed_lesson':
        return timeSpentSeconds > 0 && timeSpentSeconds <= 900; // 15 min
      // Social — checked separately via follow counts
      default:
        return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────

  /// After a lesson is completed, check all applicable achievements.
  /// Returns a list of newly unlocked [AchievementModel]s.
  static Future<List<AchievementModel>> checkAndUnlock({
    required Map<String, dynamic> rpcResult,
    required int timeSpentSeconds,
  }) async {
    try {
      // Fetch all achievements + earned state
      final all = await SupabaseService.getAchievementsWithStatus();
      final userStats = await SupabaseService.getUserStats() ?? {};
      final lessonResult = {
        ...rpcResult,
        'time_spent_seconds': timeSpentSeconds,
      };

      final newlyUnlocked = <AchievementModel>[];

      for (final row in all) {
        final model = AchievementModel.fromMap(row);
        if (model.isUnlocked) continue; // already earned
        if (_check(model.slug, userStats, lessonResult)) {
          await SupabaseService.unlockAchievement(model.id);
          newlyUnlocked.add(
            AchievementModel(
              id: model.id,
              slug: model.slug,
              name: model.name,
              description: model.description,
              category: model.category,
              rarity: model.rarity,
              earnedAt: DateTime.now(),
            ),
          );
        }
      }

      return newlyUnlocked;
    } catch (e) {
      debugPrint('[AchievementService] checkAndUnlock error: $e');
      return [];
    }
  }

  /// Check social achievements (follow-based). Call after follow action.
  static Future<List<AchievementModel>> checkSocialAchievements({
    required int followingCount,
    required int followersCount,
  }) async {
    try {
      final all = await SupabaseService.getAchievementsWithStatus();
      final newlyUnlocked = <AchievementModel>[];
      for (final row in all) {
        final model = AchievementModel.fromMap(row);
        if (model.isUnlocked) continue;
        bool unlocks = false;
        if (model.slug == 'first_follow' && followingCount >= 1) {
          unlocks = true;
        } else if (model.slug == 'followers_10' && followersCount >= 10) {
          unlocks = true;
        }
        if (unlocks) {
          await SupabaseService.unlockAchievement(model.id);
          newlyUnlocked.add(
            AchievementModel(
              id: model.id,
              slug: model.slug,
              name: model.name,
              description: model.description,
              category: model.category,
              rarity: model.rarity,
              earnedAt: DateTime.now(),
            ),
          );
        }
      }
      return newlyUnlocked;
    } catch (_) {
      return [];
    }
  }

  /// Rarity color for UI.
  static ({int color, int glowColor, String label}) rarityStyle(
    String rarity,
    bool isZh,
  ) {
    switch (rarity) {
      case 'rare':
        return (
          color: 0xFF3B82F6,
          glowColor: 0x403B82F6,
          label: isZh ? '稀有' : 'Rare',
        );
      case 'epic':
        return (
          color: 0xFF8B5CF6,
          glowColor: 0x408B5CF6,
          label: isZh ? '史诗' : 'Epic',
        );
      case 'legendary':
        return (
          color: 0xFFF59E0B,
          glowColor: 0x40F59E0B,
          label: isZh ? '传说' : 'Legendary',
        );
      default: // common
        return (
          color: 0xFF94A3B8,
          glowColor: 0x2094A3B8,
          label: isZh ? '普通' : 'Common',
        );
    }
  }

  /// Icon emoji for a category.
  static String categoryIcon(String category) {
    switch (category) {
      case 'streak':
        return '🔥';
      case 'learning':
        return '📚';
      case 'challenge':
        return '⚡';
      case 'social':
        return '🌟';
      default:
        return '🏆';
    }
  }
}
