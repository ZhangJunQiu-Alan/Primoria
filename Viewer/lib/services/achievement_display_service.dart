import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';

/// UI metadata + progress calculation for achievement presentation.
///
/// Keeps display concerns (badge image, target value, progress derivation)
/// centralized so profile and achievement wall stay consistent.
class AchievementDisplayService {
  AchievementDisplayService._();

  static const String _assetRoot = 'assets/achievements';

  static const Map<String, String> _slugAssetMap = {
    'streak_3': '$_assetRoot/streak_3.png',
    'streak_7': '$_assetRoot/streak_7.png',
    'streak_30': '$_assetRoot/streak_30.png',
    'streak_100': '$_assetRoot/streak_100.png',
    'first_lesson': '$_assetRoot/first_lesson.png',
    'first_course': '$_assetRoot/first_course.png',
    'courses_5': '$_assetRoot/courses_5.png',
    'multi_subject': '$_assetRoot/multi_subject.png',
    'lessons_100': '$_assetRoot/lessons_100.png',
    'courses_50': '$_assetRoot/courses_50.png',
    'perfect_lesson': '$_assetRoot/perfect_lesson.png',
    'perfect_5': '$_assetRoot/perfect_5.png',
    'speed_lesson': '$_assetRoot/speed_lesson.png',
    'daily_tasks_30': '$_assetRoot/daily_tasks_30.png',
    'first_follow': '$_assetRoot/first_follow.png',
    'followers_10': '$_assetRoot/followers_10.png',
    // Legacy slugs (early seed data)
    'xp_100': '$_assetRoot/xp_100.png',
    'xp_500': '$_assetRoot/xp_500.png',
    'social_follow': '$_assetRoot/social_follow.png',
  };

  static const Map<String, int> _slugTargetMap = {
    'streak_3': 3,
    'streak_7': 7,
    'streak_30': 30,
    'streak_100': 100,
    'first_lesson': 1,
    'first_course': 1,
    'courses_5': 5,
    'multi_subject': 3,
    'lessons_100': 100,
    'courses_50': 50,
    'perfect_lesson': 1,
    'perfect_5': 5,
    'speed_lesson': 1,
    'daily_tasks_30': 30,
    'first_follow': 1,
    'followers_10': 10,
    'xp_100': 100,
    'xp_500': 500,
    'social_follow': 1,
  };

  static String badgeAssetPath(AchievementModel achievement) {
    final bySlug = _slugAssetMap[achievement.slug];
    if (bySlug != null) return bySlug;
    switch (achievement.category) {
      case 'streak':
        return '$_assetRoot/category_streak.png';
      case 'challenge':
        return '$_assetRoot/category_challenge.png';
      case 'social':
        return '$_assetRoot/category_social.png';
      case 'learning':
        return '$_assetRoot/category_learning.png';
      default:
        return '$_assetRoot/default.png';
    }
  }

  static AchievementProgressView buildProgress({
    required AchievementModel achievement,
    required Map<String, dynamic> userStats,
    required Map<String, dynamic> followCounts,
    required AppLocalizations t,
  }) {
    final slug = achievement.slug;
    final streak = _safeInt(userStats['current_streak']);
    final lessonsCompleted = _safeInt(userStats['lessons_completed']);
    final coursesCompleted = _safeInt(userStats['courses_completed']);
    final totalXp = _safeInt(userStats['total_xp']);
    final following = _safeInt(followCounts['following']);
    final followers = _safeInt(followCounts['followers']);

    var target = _slugTargetMap[slug] ?? 1;
    var current = 0;

    switch (slug) {
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
      case 'streak_100':
        current = streak;
        break;
      case 'first_lesson':
      case 'lessons_100':
        current = lessonsCompleted;
        break;
      case 'first_course':
      case 'courses_5':
      case 'courses_50':
        current = coursesCompleted;
        break;
      case 'multi_subject':
        // TODO: replace with true subject-based completion metric once backend
        // exposes per-subject completion stats.
        current = coursesCompleted;
        break;
      case 'first_follow':
      case 'social_follow':
        current = following;
        break;
      case 'followers_10':
        current = followers;
        break;
      case 'xp_100':
      case 'xp_500':
        current = totalXp;
        break;
      case 'perfect_lesson':
      case 'speed_lesson':
      case 'perfect_5':
      case 'daily_tasks_30':
        // TODO: backend currently does not expose attempt-series counters for
        // these challenge achievements in a single user stats payload.
        current = achievement.isUnlocked ? target : 0;
        break;
      default:
        current = achievement.isUnlocked ? target : 0;
    }

    if (achievement.isUnlocked && current < target) {
      current = target;
    }
    if (target <= 0) target = 1;
    if (current < 0) current = 0;
    if (current > target) current = target;

    final requirement = achievement.description.trim().isNotEmpty
        ? achievement.description.trim()
        : _fallbackRequirement(slug, t);

    return AchievementProgressView(
      current: current,
      target: target,
      requirement: requirement,
    );
  }

  static int _safeInt(dynamic value) => (value as num?)?.toInt() ?? 0;

  static String _fallbackRequirement(String slug, AppLocalizations t) {
    final zh = t.isZh;
    switch (slug) {
      case 'streak_3':
        return zh ? '连续学习 3 天' : 'Reach a 3-day learning streak';
      case 'streak_7':
        return zh ? '连续学习 7 天' : 'Reach a 7-day learning streak';
      case 'streak_30':
        return zh ? '连续学习 30 天' : 'Reach a 30-day learning streak';
      case 'streak_100':
        return zh ? '连续学习 100 天' : 'Reach a 100-day learning streak';
      case 'first_lesson':
        return zh ? '完成 1 节课程' : 'Complete 1 lesson';
      case 'first_course':
        return zh ? '完成 1 门课程' : 'Complete 1 course';
      case 'courses_5':
        return zh ? '完成 5 门课程' : 'Complete 5 courses';
      case 'lessons_100':
        return zh ? '累计完成 100 节课' : 'Complete 100 lessons';
      case 'courses_50':
        return zh ? '完成 50 门课程' : 'Complete 50 courses';
      case 'followers_10':
        return zh ? '获得 10 个粉丝' : 'Get 10 followers';
      case 'first_follow':
      case 'social_follow':
        return zh ? '关注 1 位用户' : 'Follow 1 user';
      case 'xp_100':
        return zh ? '累计获得 100 XP' : 'Earn 100 XP';
      case 'xp_500':
        return zh ? '累计获得 500 XP' : 'Earn 500 XP';
      default:
        return zh ? '完成此成就目标' : 'Complete this achievement objective';
    }
  }
}

class AchievementProgressView {
  final int current;
  final int target;
  final String requirement;

  const AchievementProgressView({
    required this.current,
    required this.target,
    required this.requirement,
  });

  double get ratio {
    if (target <= 0) return 0;
    final value = current / target;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  String get counterLabel => '$current/$target';
}
